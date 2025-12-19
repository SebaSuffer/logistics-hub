import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Conductor } from '../types/database.types';

export default function ConductoresPage() {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'edit'>('new');
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    licencia: 'A5',
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Conductor | null>(null);

  const licencias = ['A5', 'A4', 'A2', 'B'];

  useEffect(() => {
    loadConductores();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const conductor = conductores.find(c => c.id_conductor === selectedId);
      setEditData(conductor || null);
    }
  }, [selectedId, conductores]);

  const loadConductores = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando carga de conductores...');
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Sesión actual:', session ? 'Autenticado' : 'No autenticado', session?.user?.email);
      
      // Try CONDUCTORES first (uppercase)
      let { data, error } = await supabase
        .from('CONDUCTORES')
        .select('*')
        .order('id_conductor', { ascending: false });

      console.log('📊 Consulta CONDUCTORES (mayúsculas):', { data, error, count: data?.length || 0 });
      
      // If empty but no error, try a count query to see if RLS is blocking
      if (!error && (!data || data.length === 0)) {
        console.log('⚠️ Array vacío sin error. Verificando si hay datos con COUNT...');
        const { count, error: countError } = await supabase
          .from('CONDUCTORES')
          .select('*', { count: 'exact', head: true });
        console.log('📊 COUNT query:', { count, error: countError });
      }

      // If error or empty, try lowercase
      if (error || !data || data.length === 0) {
        console.log('⚠️ Intentando con minúsculas...');
        const { data: altData, error: altError } = await supabase
          .from('conductores')
          .select('*')
          .order('id_conductor', { ascending: false });
        
        console.log('📊 Consulta conductores (minúsculas):', { data: altData, error: altError, count: altData?.length || 0 });
        
        if (!altError && altData && altData.length > 0) {
          console.log('✅ Usando datos de tabla en minúsculas');
          setConductores(altData);
          setLoading(false);
          return;
        }
        
        if (error) {
          console.error('❌ Error cargando conductores:', error);
          alert(`Error cargando conductores: ${error.message}`);
        }
      }
      
      console.log('✅ Conductores cargados (final):', data);
      console.log('📈 Cantidad total:', data?.length || 0);
      setConductores(data || []);
    } catch (error: any) {
      console.error('❌ Error en loadConductores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('CONDUCTORES')
        .insert({
          nombre: formData.nombre,
          rut: formData.rut || null,
          licencia: formData.licencia || null,
          activo: true,
        });

      if (error) throw error;
      alert('Guardado');
      setFormData({ nombre: '', rut: '', licencia: 'A5' });
      loadConductores();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !editData) return;

    try {
      const { error } = await supabase
        .from('CONDUCTORES')
        .update({
          nombre: editData.nombre,
          activo: editData.activo,
        })
        .eq('id_conductor', selectedId);

      if (error) throw error;
      alert('Actualizado');
      loadConductores();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('¿Estás seguro de eliminar este conductor?')) return;

    try {
      const { error } = await supabase
        .from('CONDUCTORES')
        .delete()
        .eq('id_conductor', selectedId);

      if (error) throw error;
      alert('Eliminado');
      setSelectedId(null);
      setEditData(null);
      loadConductores();
    } catch (error) {
      alert('No se puede eliminar.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">👨‍✈️ Base de Conductores</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('new'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'new'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ➕ Nuevo
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
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">RUT</label>
              <input
                type="text"
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Licencia</label>
              <select
                value={formData.licencia}
                onChange={(e) => setFormData({ ...formData, licencia: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              >
                {licencias.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Guardar
            </button>
          </form>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Editar Conductor</label>
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
            >
              <option value="">Selecciona un conductor</option>
              {conductores.map(c => (
                <option key={c.id_conductor} value={c.id_conductor}>
                  {c.nombre} ({c.rut || 'Sin RUT'})
                </option>
              ))}
            </select>
          </div>

          {editData && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={editData.nombre || ''}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editData.activo ?? true}
                  onChange={(e) => setEditData({ ...editData, activo: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-slate-300">Activo</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  💾 Guardar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando conductores...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4 text-slate-300">ID</th>
                  <th className="text-left p-4 text-slate-300">Nombre</th>
                  <th className="text-left p-4 text-slate-300">RUT</th>
                  <th className="text-left p-4 text-slate-300">Licencia</th>
                  <th className="text-left p-4 text-slate-300">Activo</th>
                </tr>
              </thead>
              <tbody>
                {conductores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No hay conductores registrados. Agrega uno usando el formulario de arriba.
                    </td>
                  </tr>
                ) : (
                  conductores.map((c) => (
                    <tr key={c.id_conductor} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                      <td className="p-4 text-slate-300">{c.id_conductor}</td>
                      <td className="p-4 text-slate-300">{c.nombre}</td>
                      <td className="p-4 text-slate-300">{c.rut || '-'}</td>
                      <td className="p-4 text-slate-300">{c.licencia || '-'}</td>
                      <td className="p-4 text-slate-300">{c.activo ? '✓' : '✗'}</td>
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

