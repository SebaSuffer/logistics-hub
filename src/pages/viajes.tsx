import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Viaje, Cliente, Ruta } from '../types/database.types';

export default function ViajesPage() {
  const [viajes, setViajes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteIds, setDeleteIds] = useState('');
  const [selectedViajes, setSelectedViajes] = useState<Set<number>>(new Set());
  const [editingViaje, setEditingViaje] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    fecha: '',
    id_cliente: 0,
    id_ruta: 0,
    monto_neto: 0,
  });

  useEffect(() => {
    loadViajes();
    loadMaestros();
  }, []);

  const loadMaestros = async () => {
    try {
      const [cliRes, rutRes] = await Promise.all([
        supabase.from('CLIENTE').select('*').order('nombre'),
        supabase.from('RUTAS').select('*').order('origen'),
      ]);

      if (cliRes.data) setClientes(cliRes.data);
      if (rutRes.data) setRutas(rutRes.data);
    } catch (error) {
      console.error('Error loading maestros:', error);
    }
  };

  const loadViajes = async () => {
    setLoading(true);
    try {
      const { data: viajesData, error: viajesError } = await supabase
        .from('VIAJES')
        .select('*')
        .order('id_viaje', { ascending: false });

      if (viajesError) throw viajesError;

      // Fetch related data
      const clientesIds = [...new Set((viajesData || []).map(v => v.id_cliente).filter(Boolean))];
      const rutasIds = [...new Set((viajesData || []).map(v => v.id_ruta).filter(Boolean))];

      const [clientesRes, rutasRes] = await Promise.all([
        clientesIds.length > 0 ? supabase.from('CLIENTE').select('id_cliente, nombre, alias').in('id_cliente', clientesIds) : { data: [] },
        rutasIds.length > 0 ? supabase.from('RUTAS').select('id_ruta, origen, destino').in('id_ruta', rutasIds) : { data: [] },
      ]);

      const clientesMap = new Map((clientesRes.data || []).map((c: any) => [c.id_cliente, c]));
      const rutasMap = new Map((rutasRes.data || []).map((r: any) => [r.id_ruta, r]));

      const viajesWithRelations = (viajesData || []).map((v: any) => ({
        ...v,
        CLIENTE: clientesMap.get(v.id_cliente) || null,
        RUTAS: rutasMap.get(v.id_ruta) || null,
      }));

      setViajes(viajesWithRelations);
    } catch (error) {
      console.error('Error loading viajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseIdsToDelete = (text: string): number[] => {
    const ids = new Set<number>();
    if (!text) return [];
    
    const partes = text.split(',');
    for (const parte of partes) {
      const trimmed = parte.trim();
      if (trimmed.includes('-')) {
        try {
          const [inicio, fin] = trimmed.split('-').map(Number);
          for (let i = inicio; i <= fin; i++) {
            ids.add(i);
          }
        } catch {}
      } else if (/^\d+$/.test(trimmed)) {
        ids.add(Number(trimmed));
      }
    }
    return Array.from(ids).sort((a, b) => a - b);
  };

  const handleDelete = async (ids: number[]) => {
    if (ids.length === 0) {
      alert('Selecciona al menos un viaje para eliminar.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar ${ids.length} viaje(s)?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('VIAJES')
        .delete()
        .in('id_viaje', ids);

      if (error) throw error;
      alert(`✅ ${ids.length} viaje(s) eliminado(s).`);
      setDeleteIds('');
      setSelectedViajes(new Set());
      loadViajes();
    } catch (error: any) {
      alert(`Error al eliminar: ${error?.message || error}`);
    }
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedViajes);
    handleDelete(ids);
  };

  const handleDeleteSingle = (id: number) => {
    handleDelete([id]);
  };

  const toggleSelectViaje = (id: number) => {
    const newSelected = new Set(selectedViajes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedViajes(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedViajes.size === viajes.length) {
      setSelectedViajes(new Set());
    } else {
      setSelectedViajes(new Set(viajes.map(v => v.id_viaje)));
    }
  };

  const handleEditClick = (viaje: any) => {
    setEditingViaje(viaje);
    setEditFormData({
      fecha: viaje.fecha || '',
      id_cliente: viaje.id_cliente || 0,
      id_ruta: viaje.id_ruta || 0,
      monto_neto: viaje.monto_neto || 0,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingViaje) return;

    try {
      const updateData: any = {
        fecha: editFormData.fecha,
        id_cliente: editFormData.id_cliente,
        monto_neto: editFormData.monto_neto,
      };

      // Only update ruta if a valid route is selected
      if (editFormData.id_ruta > 0) {
        updateData.id_ruta = editFormData.id_ruta;
      } else {
        updateData.id_ruta = null;
      }

      const { error } = await supabase
        .from('VIAJES')
        .update(updateData)
        .eq('id_viaje', editingViaje.id_viaje);

      if (error) throw error;
      alert('Viaje actualizado correctamente');
      setEditingViaje(null);
      loadViajes();
    } catch (error: any) {
      alert(`Error al actualizar: ${error?.message || error}`);
    }
  };

  const handleCloseEdit = () => {
    setEditingViaje(null);
    setEditFormData({
      fecha: '',
      id_cliente: 0,
      id_ruta: 0,
      monto_neto: 0,
    });
  };

  const autoAssignRutas = async () => {
    if (!confirm('¿Deseas actualizar automáticamente las rutas de los viajes que no tienen ruta asignada? Esto buscará rutas en la base de datos y las asignará cuando sea posible.')) {
      return;
    }

    setLoading(true);
    try {
      // Get all trips without routes
      const { data: viajesSinRuta, error: fetchError } = await supabase
        .from('VIAJES')
        .select('id_viaje, observaciones, id_cliente, monto_neto')
        .is('id_ruta', null);

      if (fetchError) throw fetchError;

      if (!viajesSinRuta || viajesSinRuta.length === 0) {
        alert('No hay viajes sin ruta asignada.');
        setLoading(false);
        return;
      }

      // Get all routes
      const { data: todasRutas, error: rutasError } = await supabase
        .from('RUTAS')
        .select('*');

      if (rutasError) throw rutasError;

      if (!todasRutas || todasRutas.length === 0) {
        alert('No hay rutas definidas en la base de datos. Por favor, crea rutas primero.');
        setLoading(false);
        return;
      }

      // Get all trips with their current data to try to match
      const { data: todosViajes, error: todosError } = await supabase
        .from('VIAJES')
        .select('id_viaje, id_cliente, monto_neto, observaciones')
        .is('id_ruta', null);

      if (todosError) throw todosError;

      // Get tarifas to help with matching
      const { data: tarifas, error: tarifasError } = await supabase
        .from('TARIFAS')
        .select('*');

      if (tarifasError) console.warn('Error loading tarifas:', tarifasError);

      let updated = 0;
      let notFound = 0;
      const updates: Array<{ id: number; id_ruta: number; monto?: number }> = [];

      // Try to match routes based on price and client
      // This is a heuristic approach - match routes by price similarity
      for (const viaje of todosViajes || []) {
        // Try to find route by matching price with tarifa_sugerida or tarifa pactada
        let matchedRuta = null;
        const viajeMonto = viaje.monto_neto || 0;

        // First, try to match by tarifa pactada for this client (most accurate)
        if (tarifas && viajeMonto > 0) {
          // Try exact match first
          let tarifaMatch = tarifas.find(
            t => t.id_cliente === viaje.id_cliente && 
            t.monto_pactado === viajeMonto
          );
          
          // If no exact match, try within 500 tolerance (smaller tolerance for tarifas pactadas)
          if (!tarifaMatch) {
            tarifaMatch = tarifas.find(
              t => t.id_cliente === viaje.id_cliente && 
              Math.abs(t.monto_pactado - viajeMonto) < 500
            );
          }
          
          if (tarifaMatch) {
            matchedRuta = todasRutas.find(r => r.id_ruta === tarifaMatch.id_ruta);
          }
        }

        // If no match by tarifa pactada, try by tarifa_sugerida (exact match first)
        if (!matchedRuta && viajeMonto > 0) {
          // First try exact match
          const exactMatches = todasRutas.filter(
            r => r.tarifa_sugerida === viajeMonto
          );
          
          if (exactMatches.length === 1) {
            // Only one exact match - use it
            matchedRuta = exactMatches[0];
          } else if (exactMatches.length > 1) {
            // Multiple exact matches - try to use client's tarifas to disambiguate
            if (tarifas) {
              const clientTarifas = tarifas.filter(t => t.id_cliente === viaje.id_cliente);
              const matchingTarifa = clientTarifas.find(t => 
                exactMatches.some(r => r.id_ruta === t.id_ruta)
              );
              if (matchingTarifa) {
                matchedRuta = exactMatches.find(r => r.id_ruta === matchingTarifa.id_ruta);
              } else {
                // Can't disambiguate - skip this one
                notFound++;
                continue;
              }
            } else {
              // Can't disambiguate - skip this one
              notFound++;
              continue;
            }
          } else {
            // No exact match, try within 1000 tolerance
            const toleranceMatches = todasRutas.filter(
              r => Math.abs(r.tarifa_sugerida - viajeMonto) < 1000 && r.tarifa_sugerida > 0
            );
            
            if (toleranceMatches.length === 1) {
              matchedRuta = toleranceMatches[0];
            } else if (toleranceMatches.length > 1) {
              // Multiple matches within tolerance - try to use client's tarifas
              if (tarifas) {
                const clientTarifas = tarifas.filter(t => t.id_cliente === viaje.id_cliente);
                const matchingTarifa = clientTarifas.find(t => 
                  toleranceMatches.some(r => r.id_ruta === t.id_ruta)
                );
                if (matchingTarifa) {
                  matchedRuta = toleranceMatches.find(r => r.id_ruta === matchingTarifa.id_ruta);
                } else {
                  // Can't disambiguate - skip
                  notFound++;
                  continue;
                }
              } else {
                // Can't disambiguate - skip
                notFound++;
                continue;
              }
            }
          }
        }

        if (matchedRuta) {
          updates.push({
            id: viaje.id_viaje,
            id_ruta: matchedRuta.id_ruta,
          });
          updated++;
        } else {
          notFound++;
        }
      }

      // Execute updates in batch (grouped by route for efficiency)
      if (updates.length > 0) {
        const updatesByRoute = new Map<number, number[]>();
        updates.forEach(update => {
          if (!updatesByRoute.has(update.id_ruta)) {
            updatesByRoute.set(update.id_ruta, []);
          }
          updatesByRoute.get(update.id_ruta)!.push(update.id);
        });

        // Execute batch updates
        for (const [idRuta, ids] of updatesByRoute.entries()) {
          const { error: updateError } = await supabase
            .from('VIAJES')
            .update({ id_ruta: idRuta })
            .in('id_viaje', ids);

          if (updateError) {
            console.error(`Error updating viajes for route ${idRuta}:`, updateError);
            updated -= ids.length;
            notFound += ids.length;
          }
        }
      }

      const message = `Actualización completada:\n✅ ${updated} viaje(s) actualizado(s)${notFound > 0 ? `\n⚠️ ${notFound} viaje(s) no pudieron ser asignados automáticamente (pueden tener precios únicos o necesitar asignación manual)` : ''}`;
      alert(message);
      
      setLoading(false);
      loadViajes();
    } catch (error: any) {
      alert(`Error: ${error?.message || error}`);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">🗂️ Administrador de Viajes (Ingresos)</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={autoAssignRutas}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
              disabled={loading}
            >
              🔄 Actualizar Rutas Automáticamente
            </button>
            {selectedViajes.size > 0 && (
              <span className="text-slate-300">
                {selectedViajes.size} viaje(s) seleccionado(s)
              </span>
            )}
          </div>
          {selectedViajes.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              🗑️ Eliminar Seleccionados
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4 text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedViajes.size === viajes.length && viajes.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500"
                    />
                  </th>
                  <th className="text-left p-4 text-slate-300">ID</th>
                  <th className="text-left p-4 text-slate-300">Fecha</th>
                  <th className="text-left p-4 text-slate-300">Cliente</th>
                  <th className="text-left p-4 text-slate-300">Ruta</th>
                  <th className="text-left p-4 text-slate-300">Tarifa</th>
                  <th className="text-left p-4 text-slate-300">Observaciones</th>
                  <th className="text-left p-4 text-slate-300">Estado</th>
                  <th className="text-left p-4 text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id_viaje} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedViajes.has(v.id_viaje)}
                        onChange={() => toggleSelectViaje(v.id_viaje)}
                        className="w-4 h-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500"
                      />
                    </td>
                    <td className="p-4 text-slate-300">{v.id_viaje}</td>
                    <td className="p-4 text-slate-300">{v.fecha}</td>
                    <td className="p-4 text-slate-300">{v.CLIENTE?.alias || v.CLIENTE?.nombre || '-'}</td>
                    <td className="p-4 text-slate-300">
                      {v.RUTAS ? `${v.RUTAS.origen} -> ${v.RUTAS.destino}` : '-'}
                    </td>
                    <td className="p-4 text-slate-300">${(v.monto_neto || 0).toLocaleString('es-CL')}</td>
                    <td className="p-4 text-slate-300">{v.observaciones || '-'}</td>
                    <td className="p-4 text-slate-300">{v.estado || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(v)}
                          className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(v.id_viaje)}
                          className="text-red-400 hover:text-red-300 font-medium text-sm"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editingViaje && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-50">Editar Viaje #{editingViaje.id_viaje}</h2>
              <button
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-slate-200"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Fecha *</label>
                  <input
                    type="date"
                    value={editFormData.fecha}
                    onChange={(e) => setEditFormData({ ...editFormData, fecha: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Cliente *</label>
                  <select
                    value={editFormData.id_cliente}
                    onChange={(e) => setEditFormData({ ...editFormData, id_cliente: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    required
                  >
                    <option value="0">Selecciona un cliente</option>
                    {clientes.map(c => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.alias || c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Ruta</label>
                  <select
                    value={editFormData.id_ruta}
                    onChange={(e) => setEditFormData({ ...editFormData, id_ruta: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                  >
                    <option value="0">Sin ruta</option>
                    {rutas.map(r => (
                      <option key={r.id_ruta} value={r.id_ruta}>
                        {`${r.origen} -> ${r.destino}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Precio/Tarifa ($) *</label>
                  <input
                    type="number"
                    value={editFormData.monto_neto}
                    onChange={(e) => setEditFormData({ ...editFormData, monto_neto: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
                    min="0"
                    step="1000"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  💾 Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

