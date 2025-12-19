import React, { useState, useEffect } from 'react';
import { SubirExcel } from '../components/forms/SubirExcel';
import { supabase } from '../lib/supabase';
import type { Cliente, Ruta, Tarifa } from '../types/database.types';

export default function SubirArchivosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaestros();
  }, []);

  const loadMaestros = async () => {
    try {
      const [cliRes, rutRes, tarRes] = await Promise.all([
        supabase.from('CLIENTE').select('*'),
        supabase.from('RUTAS').select('*'),
        supabase.from('TARIFAS').select('*'),
      ]);

      if (cliRes.data) setClientes(cliRes.data);
      if (rutRes.data) setRutas(rutRes.data);
      if (tarRes.data) setTarifas(tarRes.data);
    } catch (error) {
      console.error('Error loading maestros:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">📂 Centro de Carga de Archivos</h1>
      <p className="text-slate-400">Selecciona el tipo de información que deseas subir al sistema.</p>
      
      {clientes.length === 0 ? (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg p-4">
          No hay clientes registrados en la BD. Por favor, crea al menos un cliente primero.
        </div>
      ) : (
        <SubirExcel
          clientes={clientes}
          rutas={rutas}
          tarifas={tarifas}
          onSuccess={loadMaestros}
        />
      )}
    </div>
  );
}



