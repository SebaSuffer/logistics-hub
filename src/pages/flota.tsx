import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Camion } from '../types/database.types';

export default function FlotaPage() {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'edit'>('new');
  const [formData, setFormData] = useState({
    patente: '',
    marca: 'Scania',
    modelo: '',
    año: 2024,
    rendimiento: 2.5,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const marcas = ['Scania', 'Volvo', 'Mercedes-Benz', 'Freightliner', 'International', 'Volkswagen', 'JAC', 'Otro'];

  useEffect(() => {
    loadCamiones();
  }, []);

  const loadCamiones = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando carga de camiones...');
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Sesión actual:', session ? 'Autenticado' : 'No autenticado', session?.user?.email);
      
      // Try CAMIONES first (uppercase)
      let { data, error } = await supabase
        .from('CAMIONES')
        .select('*')
        .order('id_camion', { ascending: false });

      console.log('📊 Consulta CAMIONES (mayúsculas):', { data, error, count: data?.length || 0 });
      
      // If empty but no error, try a count query to see if RLS is blocking
      if (!error && (!data || data.length === 0)) {
        console.log('⚠️ Array vacío sin error. Verificando si hay datos con COUNT...');
        const { count, error: countError } = await supabase
          .from('CAMIONES')
          .select('*', { count: 'exact', head: true });
        console.log('📊 COUNT query:', { count, error: countError });
      }

      // If error or empty, try lowercase
      if (error || !data || data.length === 0) {
        console.log('⚠️ Intentando con minúsculas...');
        const { data: altData, error: altError } = await supabase
          .from('camiones')
          .select('*')
          .order('id_camion', { ascending: false });
        
        console.log('📊 Consulta camiones (minúsculas):', { data: altData, error: altError, count: altData?.length || 0 });
        
        if (!altError && altData && altData.length > 0) {
          console.log('✅ Usando datos de tabla en minúsculas');
          setCamiones(altData);
          setLoading(false);
          return;
        }
        
        if (error) {
          console.error('❌ Error cargando camiones:', error);
          alert(`Error cargando camiones: ${error.message}`);
        }
      }
      
      console.log('✅ Camiones cargados (final):', data);
      console.log('📈 Cantidad total:', data?.length || 0);
      setCamiones(data || []);
    } catch (error: any) {
      console.error('❌ Error en loadCamiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patente) {
      alert('La patente es requerida');
      return;
    }

    try {
      const { error } = await supabase
        .from('CAMIONES')
        .insert({
          patente: formData.patente,
          marca: formData.marca,
          modelo: formData.modelo || null,
          año: formData.año || null,
          rendimiento_esperado: formData.rendimiento || null,
        });

      if (error) throw error;
      alert('Guardado');
      setFormData({ patente: '', marca: 'Scania', modelo: '', año: 2024, rendimiento: 2.5 });
      loadCamiones();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este vehículo?')) return;

    try {
      const { error } = await supabase
        .from('CAMIONES')
        .delete()
        .eq('id_camion', id);

      if (error) throw error;
      alert('Eliminado');
      loadCamiones();
    } catch (error) {
      alert('No se puede eliminar (tiene viajes asociados).');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">🚚 Inventario de Flota</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('new'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'new'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ➕ Nuevo Vehículo
        </button>
        <button
          onClick={() => { setActiveTab('edit'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'edit'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ✏️ Modificar / Eliminar
        </button>
      </div>

      {activeTab === 'new' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Patente *</label>
                <input
                  type="text"
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Marca</label>
                <select
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                >
                  {marcas.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Modelo</label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Año</label>
                <input
                  type="number"
                  value={formData.año}
                  onChange={(e) => setFormData({ ...formData, año: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  min="1990"
                  max="2030"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Rendimiento (Km/L)</label>
              <input
                type="number"
                value={formData.rendimiento}
                onChange={(e) => setFormData({ ...formData, rendimiento: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                min="1"
                max="8"
                step="0.1"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Guardar Vehículo
            </button>
          </form>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Seleccionar Vehículo</label>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 mb-4"
          >
            <option value="">Selecciona un vehículo</option>
            {camiones.map(c => (
              <option key={c.id_camion} value={c.id_camion}>
                {c.patente} - {c.marca}
              </option>
            ))}
          </select>

          {selectedId && (
            <button
              onClick={() => handleDelete(selectedId)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Eliminar Vehículo
            </button>
          )}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando camiones...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4 text-slate-300">ID</th>
                  <th className="text-left p-4 text-slate-300">Patente</th>
                  <th className="text-left p-4 text-slate-300">Marca</th>
                  <th className="text-left p-4 text-slate-300">Modelo</th>
                  <th className="text-left p-4 text-slate-300">Año</th>
                  <th className="text-left p-4 text-slate-300">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {camiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hay camiones registrados. Agrega uno usando el formulario de arriba.
                    </td>
                  </tr>
                ) : (
                  camiones.map((c) => (
                    <tr key={c.id_camion} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-300">{c.id_camion}</td>
                      <td className="p-4 text-slate-300">{c.patente}</td>
                      <td className="p-4 text-slate-300">{c.marca}</td>
                      <td className="p-4 text-slate-300">{c.modelo || '-'}</td>
                      <td className="p-4 text-slate-300">{c.año || '-'}</td>
                      <td className="p-4 text-slate-300">{c.rendimiento_esperado || '-'}</td>
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

