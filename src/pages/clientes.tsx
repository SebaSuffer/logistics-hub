import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Cliente } from '../types/database.types';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'edit'>('new');
  const [formData, setFormData] = useState({
    nombre: '',
    alias: '',
    rut_empresa: '',
    contacto: '',
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    alias: '',
    rut_empresa: '',
    contacto: '',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const cliente = clientes.find(c => c.id_cliente === selectedId);
      if (cliente) {
        setEditFormData({
          nombre: cliente.nombre || '',
          alias: cliente.alias || '',
          rut_empresa: cliente.rut_empresa || '',
          contacto: cliente.contacto || '',
        });
      }
    } else {
      setEditFormData({
        nombre: '',
        alias: '',
        rut_empresa: '',
        contacto: '',
      });
    }
  }, [selectedId, clientes]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      // Try to load with alias first, fallback to without alias if column doesn't exist
      let { data, error } = await supabase
        .from('CLIENTE')
        .select('id_cliente, nombre, rut_empresa, contacto, alias')
        .order('id_cliente', { ascending: false });

      // If alias column doesn't exist, try without it
      if (error && error.message?.includes('alias')) {
        const { data: dataWithoutAlias, error: errorWithoutAlias } = await supabase
          .from('CLIENTE')
          .select('id_cliente, nombre, rut_empresa, contacto')
          .order('id_cliente', { ascending: false });
        
        if (errorWithoutAlias) throw errorWithoutAlias;
        // Add empty alias to each record
        data = (dataWithoutAlias || []).map((c: any) => ({ ...c, alias: null }));
        error = null;
      }

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error loading clientes:', error);
      alert(`Error cargando clientes: ${error?.message || 'Error desconocido'}. Por favor, ejecuta el script SQL para agregar la columna 'alias'.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build insert object, only include alias if it's provided
      const insertData: any = {
        nombre: formData.nombre,
        rut_empresa: formData.rut_empresa || null,
        contacto: formData.contacto || null,
      };

      // Only add alias if it's provided (and column exists)
      if (formData.alias) {
        insertData.alias = formData.alias;
      }

      const { error } = await supabase
        .from('CLIENTE')
        .insert(insertData);

      if (error) {
        // If error is about alias column, provide helpful message
        if (error.message?.includes('alias')) {
          throw new Error('La columna "alias" no existe en la base de datos. Por favor, ejecuta el script SQL de migración primero.');
        }
        throw error;
      }
      alert('Guardado');
      setFormData({ nombre: '', alias: '', rut_empresa: '', contacto: '' });
      loadClientes();
    } catch (error: any) {
      alert(`Error: ${error?.message || error || 'Error desconocido'}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    try {
      // Build update object
      const updateData: any = {
        nombre: editFormData.nombre,
        rut_empresa: editFormData.rut_empresa || null,
        contacto: editFormData.contacto || null,
      };

      // Only add alias if it's provided (and column exists)
      if (editFormData.alias) {
        updateData.alias = editFormData.alias;
      }

      const { error } = await supabase
        .from('CLIENTE')
        .update(updateData)
        .eq('id_cliente', selectedId);

      if (error) {
        // Provide helpful error messages
        if (error.message?.includes('alias')) {
          throw new Error('La columna "alias" no existe en la base de datos. Por favor, ejecuta el script SQL de migración primero.');
        }
        if (error.message?.includes('foreign key constraint')) {
          throw new Error('No se puede modificar este cliente porque tiene viajes asociados. Primero elimina o modifica los viajes relacionados.');
        }
        throw error;
      }
      alert('Cliente actualizado');
      loadClientes();
    } catch (error: any) {
      const errorMessage = error?.message || error || 'Error desconocido';
      alert(`Error: ${errorMessage}`);
      console.error('Error updating cliente:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      // First check if client has associated trips
      const { data: viajes, error: checkError } = await supabase
        .from('VIAJES')
        .select('id_viaje')
        .eq('id_cliente', selectedId)
        .limit(1);

      if (checkError) {
        console.error('Error checking viajes:', checkError);
      }

      if (viajes && viajes.length > 0) {
        alert('No se puede eliminar este cliente porque tiene viajes asociados. Primero elimina o modifica los viajes relacionados.');
        return;
      }

      const { error } = await supabase
        .from('CLIENTE')
        .delete()
        .eq('id_cliente', selectedId);

      if (error) {
        if (error.message?.includes('foreign key constraint')) {
          throw new Error('No se puede eliminar este cliente porque tiene viajes asociados. Primero elimina o modifica los viajes relacionados.');
        }
        throw error;
      }
      alert('Cliente eliminado');
      setSelectedId(null);
      loadClientes();
    } catch (error: any) {
      const errorMessage = error?.message || 'No se puede eliminar (tiene datos asociados).';
      alert(`Error: ${errorMessage}`);
      console.error('Error deleting cliente:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">🏢 Clientes</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('new'); setSelectedId(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'new'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ➕ Registrar
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
                <label className="block text-sm font-medium text-slate-400 mb-2">Nombre Empresa</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Alias</label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  placeholder="Ej: TOBAR, COSIO"
                />
                <p className="text-xs text-slate-500 mt-1">Nombre corto para identificar al cliente en tablas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">RUT Empresa</label>
                <input
                  type="text"
                  value={formData.rut_empresa}
                  onChange={(e) => setFormData({ ...formData, rut_empresa: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Contacto</label>
                <input
                  type="text"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Guardar Cliente
            </button>
          </form>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Seleccionar Cliente</label>
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.alias || c.nombre}
                </option>
              ))}
            </select>
          </div>

          {selectedId && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nombre Empresa</label>
                  <input
                    type="text"
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Alias</label>
                  <input
                    type="text"
                    value={editFormData.alias}
                    onChange={(e) => setEditFormData({ ...editFormData, alias: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    placeholder="Ej: TOBAR, COSIO"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">RUT Empresa</label>
                  <input
                    type="text"
                    value={editFormData.rut_empresa}
                    onChange={(e) => setEditFormData({ ...editFormData, rut_empresa: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Contacto</label>
                  <input
                    type="text"
                    value={editFormData.contacto}
                    onChange={(e) => setEditFormData({ ...editFormData, contacto: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    placeholder="Email, teléfono, etc."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  💾 Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  🗑️ Eliminar Cliente
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left p-4 text-slate-300">ID</th>
                <th className="text-left p-4 text-slate-300">Alias</th>
                <th className="text-left p-4 text-slate-300">Nombre Completo</th>
                <th className="text-left p-4 text-slate-300">RUT Empresa</th>
                <th className="text-left p-4 text-slate-300">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id_cliente} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                  <td className="p-4 text-slate-300">{c.id_cliente}</td>
                  <td className="p-4 text-slate-300 font-medium">{c.alias || '-'}</td>
                  <td className="p-4 text-slate-300">{c.nombre}</td>
                  <td className="p-4 text-slate-300">{c.rut_empresa || '-'}</td>
                  <td className="p-4 text-slate-300">{c.contacto || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

