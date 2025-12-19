import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Cliente, Ruta, Tarifa } from '../types/database.types';

export default function TarifariosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id_cliente: 0,
    id_ruta: 0,
    precio: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cliRes, rutRes, tarRes] = await Promise.all([
        supabase.from('CLIENTE').select('*'),
        supabase.from('RUTAS').select('*'),
        supabase.from('TARIFAS').select('*'),
      ]);

      if (cliRes.data) setClientes(cliRes.data);
      if (rutRes.data) setRutas(rutRes.data);
      
      // Enrich tarifas with related data
      if (tarRes.data) {
        const clientesMap = new Map(clientes.map(c => [c.id_cliente, c]));
        const rutasMap = new Map(rutas.map(r => [r.id_ruta, r]));
        const enrichedTarifas = tarRes.data.map((t: any) => ({
          ...t,
          CLIENTE: clientesMap.get(t.id_cliente) || null,
          RUTAS: rutasMap.get(t.id_ruta) || null,
        }));
        setTarifas(enrichedTarifas);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_cliente || !formData.id_ruta) {
      alert('Selecciona cliente y ruta');
      return;
    }

    try {
      const { error } = await supabase
        .from('TARIFAS')
        .upsert({
          id_cliente: formData.id_cliente,
          id_ruta: formData.id_ruta,
          monto_pactado: formData.precio,
        }, {
          onConflict: 'id_cliente,id_ruta',
        });

      if (error) throw error;
      alert('Tarifa guardada');
      setFormData({ id_cliente: 0, id_ruta: 0, precio: 0 });
      loadData();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleLimpiarTarifas = async () => {
    const cantidad = tarifas.length;
    if (cantidad === 0) {
      alert('No hay tarifas para eliminar');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar TODAS las tarifas (${cantidad} registros)? Esta acción no se puede deshacer.`)) {
      return;
    }

    if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Esto borrará todas las tarifas. ¿Continuar?')) {
      return;
    }

    setLoading(true);
    try {
      // Delete all tarifas - using a condition that's always true
      const { error } = await supabase
        .from('TARIFAS')
        .delete()
        .gte('id_cliente', 0); // This condition is always true, so it deletes all

      if (error) throw error;
      alert(`✅ Se eliminaron todas las tarifas (${cantidad} registros)`);
      setTarifas([]);
      loadData();
    } catch (error: any) {
      console.error('Error eliminando tarifas:', error);
      alert(`Error eliminando tarifas: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-50">💰 Tarifas por Cliente</h1>
        {tarifas.length > 0 && (
          <button
            onClick={handleLimpiarTarifas}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar todas las tarifas"
          >
            🗑️ Limpiar Todas las Tarifas
          </button>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Cliente</label>
              <select
                value={formData.id_cliente}
                onChange={(e) => setFormData({ ...formData, id_cliente: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              >
                <option value="0">Selecciona un cliente</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.alias || c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ruta</label>
              <select
                value={formData.id_ruta}
                onChange={(e) => setFormData({ ...formData, id_ruta: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              >
                <option value="0">Selecciona una ruta</option>
                {rutas.map(r => (
                  <option key={r.id_ruta} value={r.id_ruta}>
                    {`${r.origen} -> ${r.destino}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Precio Pactado ($)</label>
            <input
              type="number"
              value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              min="0"
              step="1000"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Guardar Tarifa
          </button>
        </form>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left p-4 text-slate-300">Cliente</th>
                <th className="text-left p-4 text-slate-300">Ruta</th>
                <th className="text-left p-4 text-slate-300">Monto Pactado</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                  <td className="p-4 text-slate-300">{t.CLIENTE?.alias || t.CLIENTE?.nombre || '-'}</td>
                  <td className="p-4 text-slate-300">
                    {t.RUTAS ? `${t.RUTAS.origen} -> ${t.RUTAS.destino}` : '-'}
                  </td>
                  <td className="p-4 text-slate-300">${(t.monto_pactado || 0).toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

