import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Ruta } from '../types/database.types';

export default function RutasPage() {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'edit'>('new');
  const [formData, setFormData] = useState({
    origen: 'STI',
    destino: '',
    km: 0,
    tarifa: 0,
    rendimiento: 0,
    costoKm: 0,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Ruta | null>(null);

  useEffect(() => {
    loadRutas();
  }, []);

  // Debug: Log when rutas state changes
  useEffect(() => {
    console.log('📋 Estado de rutas actualizado:', rutas.length, 'rutas');
    if (rutas.length > 0) {
      console.log('📋 Primera ruta:', rutas[0]);
    }
  }, [rutas]);

  useEffect(() => {
    if (selectedId) {
      const ruta = rutas.find(r => r.id_ruta === selectedId);
      setEditData(ruta || null);
    }
  }, [selectedId, rutas]);

  const loadRutas = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cargando rutas...');
      
      // Use the EXACT same pattern as viajes.tsx which works
      const { data, error } = await supabase
        .from('RUTAS')
        .select('*')
        .order('origen');

      console.log('📊 Resultado consulta RUTAS:', { 
        dataLength: data?.length || 0, 
        hasError: !!error, 
        errorMessage: error?.message,
        firstItem: data?.[0]
      });

      if (error) {
        console.error('❌ Error cargando rutas:', error);
        // Try lowercase as fallback
        const { data: altData, error: altError } = await supabase
          .from('rutas')
          .select('*')
          .order('origen');
        
        console.log('📊 Resultado consulta rutas (minúsculas):', { 
          dataLength: altData?.length || 0, 
          hasError: !!altError 
        });
        
        if (altError) {
          console.error('❌ Error también con minúsculas:', altError);
          setRutas([]);
          return;
        }
        
        console.log('✅ Usando datos de tabla en minúsculas, cantidad:', altData?.length || 0);
        setRutas(altData || []);
        return;
      }

      console.log('✅ Rutas cargadas exitosamente, cantidad:', data?.length || 0);
      setRutas(data || []);
    } catch (error: any) {
      console.error('❌ Error inesperado cargando rutas:', error);
      setRutas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const insertData: any = {
        origen: formData.origen.trim().toUpperCase(),
        destino: formData.destino.trim().toUpperCase(),
        km_estimados: formData.km,
        tarifa_sugerida: formData.tarifa,
      };
      
      // Solo agregar métricas si tienen valores
      if (formData.rendimiento > 0) {
        insertData.rendimiento_km_l = formData.rendimiento;
      }
      if (formData.costoKm > 0) {
        insertData.costo_por_km = formData.costoKm;
      }

      const { data, error } = await supabase
        .from('RUTAS')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error creando ruta:', error);
        alert(`Error creando ruta: ${error.message || JSON.stringify(error)}`);
        return;
      }

      alert('Ruta creada exitosamente');
      setFormData({ origen: 'STI', destino: '', km: 0, tarifa: 0, rendimiento: 0, costoKm: 0 });
      loadRutas();
    } catch (error: any) {
      console.error('Error inesperado:', error);
      alert(`Error: ${error?.message || error || 'Error desconocido'}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !editData) return;

    try {
      const updateData: any = {
        origen: editData.origen,
        destino: editData.destino,
        km_estimados: editData.km_estimados,
        tarifa_sugerida: editData.tarifa_sugerida,
      };
      
      // Incluir métricas si existen
      if (editData.rendimiento_km_l !== undefined) {
        updateData.rendimiento_km_l = editData.rendimiento_km_l || null;
      }
      if (editData.costo_por_km !== undefined) {
        updateData.costo_por_km = editData.costo_por_km || null;
      }

      const { error } = await supabase
        .from('RUTAS')
        .update(updateData)
        .eq('id_ruta', selectedId);

      if (error) throw error;
      alert('Actualizado');
      loadRutas();
    } catch (error: any) {
      alert(`Error: ${error?.message || error}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('¿Estás seguro de eliminar esta ruta?')) return;

    try {
      const { error } = await supabase
        .from('RUTAS')
        .delete()
        .eq('id_ruta', selectedId);

      if (error) throw error;
      alert('Ruta eliminada');
      setSelectedId(null);
      setEditData(null);
      loadRutas();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-50">🛣️ Rutas Físicas</h1>
        <button
          onClick={loadRutas}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium"
          title="Recargar rutas"
        >
          🔄 Recargar
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('new'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'new'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ➕ Crear
        </button>
        <button
          onClick={() => { setActiveTab('edit'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'edit'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ✏️ Editar
        </button>
      </div>

      {activeTab === 'new' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Origen</label>
                <input
                  type="text"
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Destino</label>
                <input
                  type="text"
                  value={formData.destino}
                  onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Kms</label>
                <input
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  min="0"
                  max="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Tarifa Base ($)</label>
                <input
                  type="number"
                  value={formData.tarifa}
                  onChange={(e) => setFormData({ ...formData, tarifa: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Rendimiento (km/L)
                  <span className="text-xs text-slate-500 ml-2">Opcional</span>
                </label>
                <input
                  type="number"
                  value={formData.rendimiento}
                  onChange={(e) => setFormData({ ...formData, rendimiento: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  min="0"
                  step="0.1"
                  placeholder="Ej: 3.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Costo por Km ($)
                  <span className="text-xs text-slate-500 ml-2">Opcional</span>
                </label>
                <input
                  type="number"
                  value={formData.costoKm}
                  onChange={(e) => setFormData({ ...formData, costoKm: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  min="0"
                  step="100"
                  placeholder="Ej: 500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Crear Ruta
            </button>
          </form>
        </div>
      )}

      {activeTab === 'edit' && editData && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Editar Ruta</label>
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
            >
              <option value="">Selecciona una ruta</option>
              {rutas.map(r => (
                <option key={r.id_ruta} value={r.id_ruta}>
                  {`${r.origen} -> ${r.destino}`}
                </option>
              ))}
            </select>
          </div>

          {editData && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Origen</label>
                  <input
                    type="text"
                    value={editData.origen}
                    onChange={(e) => setEditData({ ...editData, origen: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Destino</label>
                  <input
                    type="text"
                    value={editData.destino}
                    onChange={(e) => setEditData({ ...editData, destino: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Kms</label>
                  <input
                    type="number"
                    value={editData.km_estimados}
                    onChange={(e) => setEditData({ ...editData, km_estimados: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Tarifa Base</label>
                  <input
                    type="number"
                    value={editData.tarifa_sugerida}
                    onChange={(e) => setEditData({ ...editData, tarifa_sugerida: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Rendimiento (km/L)
                    <span className="text-xs text-slate-500 ml-2">Opcional</span>
                  </label>
                  <input
                    type="number"
                    value={editData.rendimiento_km_l || ''}
                    onChange={(e) => setEditData({ ...editData, rendimiento_km_l: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    min="0"
                    step="0.1"
                    placeholder="Ej: 3.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Costo por Km ($)
                    <span className="text-xs text-slate-500 ml-2">Opcional</span>
                  </label>
                  <input
                    type="number"
                    value={editData.costo_por_km || ''}
                    onChange={(e) => setEditData({ ...editData, costo_por_km: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    min="0"
                    step="100"
                    placeholder="Ej: 500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Actualizar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Eliminar Ruta
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando rutas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4 text-slate-300">ID</th>
                  <th className="text-left p-4 text-slate-300">Origen</th>
                  <th className="text-left p-4 text-slate-300">Destino</th>
                  <th className="text-left p-4 text-slate-300">Kms</th>
                  <th className="text-left p-4 text-slate-300">Tarifa Sugerida</th>
                  <th className="text-left p-4 text-slate-300">Rend. (km/L)</th>
                  <th className="text-left p-4 text-slate-300">Costo/km ($)</th>
                </tr>
              </thead>
              <tbody>
                {rutas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No hay rutas registradas. Agrega una usando el formulario de arriba.
                    </td>
                  </tr>
                ) : (
                  rutas.map((r) => (
                    <tr key={r.id_ruta} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-300">{r.id_ruta}</td>
                      <td className="p-4 text-slate-300">{r.origen}</td>
                      <td className="p-4 text-slate-300">{r.destino}</td>
                      <td className="p-4 text-slate-300">{r.km_estimados}</td>
                      <td className="p-4 text-slate-300">${r.tarifa_sugerida.toLocaleString('es-CL')}</td>
                      <td className="p-4 text-slate-300">{r.rendimiento_km_l ? r.rendimiento_km_l.toFixed(1) : '-'}</td>
                      <td className="p-4 text-slate-300">{r.costo_por_km ? `$${r.costo_por_km.toLocaleString('es-CL')}` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

