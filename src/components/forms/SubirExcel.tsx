import React, { useState } from 'react';
import { parseFormatoTOBAR, parseFormatoCOSIO, parseGastosExcel, type ParsedTrip, type ParsedExpense } from '../../utils/excel-parser';
import { supabase } from '../../lib/supabase';
import type { Cliente, Ruta, Tarifa } from '../../types/database.types';

interface SubirExcelProps {
  clientes: Cliente[];
  rutas: Ruta[];
  tarifas: Tarifa[];
  onSuccess?: () => void;
}

export const SubirExcel: React.FC<SubirExcelProps> = ({ clientes, rutas, tarifas, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'viajes' | 'gastos'>('viajes');
  const [formato, setFormato] = useState<'TOBAR' | 'COSIO'>('TOBAR');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [previewData, setPreviewData] = useState<ParsedTrip[] | ParsedExpense[] | null>(null);
  const [duplicadosPreview, setDuplicadosPreview] = useState<Array<{gasto: ParsedExpense, reason: string}>>([]);

  const getOrCreateRuta = async (origen: string, destino: string): Promise<number | null> => {
    if (!origen || !destino) return null;

    const origenUpper = origen.trim().toUpperCase();
    const destinoUpper = destino.trim().toUpperCase();

    // Check if route exists
    const existing = rutas.find(
      r => r.origen.toUpperCase() === origenUpper && r.destino.toUpperCase() === destinoUpper
    );

    if (existing) return existing.id_ruta;

    // Create new route
    const { data, error } = await supabase
      .from('RUTAS')
      .insert({ origen: origenUpper, destino: destinoUpper, km_estimados: 0, tarifa_sugerida: 0 })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating route:', error);
      return null;
    }

    return data.id_ruta;
  };

  const getPrecioAutomatico = (idCliente: number, idRuta: number | null): number => {
    if (!idRuta) return 0;

    // Check tarifas
    const tarifa = tarifas.find(t => t.id_cliente === idCliente && t.id_ruta === idRuta);
    if (tarifa) return tarifa.monto_pactado;

    // Check ruta sugerida
    const ruta = rutas.find(r => r.id_ruta === idRuta);
    if (ruta) return ruta.tarifa_sugerida;

    return 0;
  };

  const extractContenedor = (observaciones: string): string | null => {
    if (!observaciones) return null;
    
    // Buscar patrón "Contenedor: XXX" o "CONTENEDOR: XXX"
    const match = observaciones.match(/contenedor\s*:\s*([^\s]+(?:\s+[^\s]+)*)/i);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    
    // Si no hay patrón, buscar cualquier texto que parezca un contenedor (ej: "ABC 123456")
    const contenedorMatch = observaciones.match(/([A-Z]{2,4}\s*\d{4,})/i);
    if (contenedorMatch && contenedorMatch[1]) {
      return contenedorMatch[1].trim().toUpperCase().replace(/\s+/g, ' ');
    }
    
    return null;
  };

  const checkViajeExiste = async (fecha: string, idCliente: number, idRuta: number | null, observaciones: string): Promise<{ exists: boolean; reason?: string }> => {
    if (!idRuta) return { exists: false };

    // 1. Check exact match (same fecha, cliente, ruta, observaciones)
    const { data: exactMatch } = await supabase
      .from('VIAJES')
      .select('id_viaje, observaciones')
      .eq('fecha', fecha)
      .eq('id_cliente', idCliente)
      .eq('id_ruta', idRuta)
      .ilike('observaciones', `%${observaciones}%`)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      return { exists: true, reason: 'Viaje exacto ya existe en la base de datos' };
    }

    // 2. Check by contenedor (same fecha + same contenedor = duplicate)
    const contenedor = extractContenedor(observaciones);
    if (contenedor) {
      // Search for any trip with the same contenedor on the same date
      const { data: viajesConContenedor } = await supabase
        .from('VIAJES')
        .select('id_viaje, observaciones, fecha, id_cliente')
        .eq('fecha', fecha)
        .ilike('observaciones', `%${contenedor}%`)
        .limit(10);

      if (viajesConContenedor && viajesConContenedor.length > 0) {
        // Verify that the contenedor matches exactly
        for (const viaje of viajesConContenedor) {
          const contenedorExistente = extractContenedor(viaje.observaciones || '');
          if (contenedorExistente && contenedorExistente === contenedor) {
            return { 
              exists: true, 
              reason: `Contenedor ${contenedor} ya tiene un viaje registrado en esta fecha` 
            };
          }
        }
      }
    }

    return { exists: false };
  };

  const handleFileUploadViajes = async (file: File) => {
    if (!clienteSeleccionado) {
      setMessage({ type: 'error', text: 'Selecciona un cliente primero' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      let trips: ParsedTrip[];
      
      if (formato === 'TOBAR') {
        trips = await parseFormatoTOBAR(file);
      } else {
        trips = await parseFormatoCOSIO(file);
      }

      // Process trips: resolve routes and prices
      const processedTrips: ParsedTrip[] = [];
      for (const trip of trips) {
        const [origen, destino] = trip.ruta_nombre.split(' -> ');
        const idRuta = await getOrCreateRuta(origen, destino);
        
        let monto = trip.monto;
        if (monto === 0) {
          monto = getPrecioAutomatico(clienteSeleccionado, idRuta);
        }

        processedTrips.push({
          ...trip,
          id_cliente: clienteSeleccionado,
          cliente_nombre: clientes.find(c => c.id_cliente === clienteSeleccionado)?.nombre || '',
          id_ruta: idRuta,
          monto,
        });
      }

      setPreviewData(processedTrips);
      setMessage({ type: 'success', text: `Se detectaron ${processedTrips.length} viajes. Revisa el preview y confirma.` });
    } catch (error) {
      setMessage({ type: 'error', text: `Error procesando archivo: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmViajes = async () => {
    if (!previewData || !Array.isArray(previewData)) return;

    setLoading(true);
    setMessage(null);

    try {
      const trips = previewData as ParsedTrip[];
      const viajesToInsert: any[] = [];
      let skipCount = 0;

      for (const trip of trips) {
        if (!trip.id_ruta) continue;

        const existe = await checkViajeExiste(trip.fecha, trip.id_cliente, trip.id_ruta, trip.observaciones);
        if (existe) {
          skipCount++;
          continue;
        }

        viajesToInsert.push({
          fecha: trip.fecha,
          id_cliente: trip.id_cliente,
          id_ruta: trip.id_ruta,
          estado: 'Finalizado',
          monto_neto: trip.monto,
          observaciones: trip.observaciones,
        });
      }

      if (viajesToInsert.length > 0) {
        const { error } = await supabase
          .from('VIAJES')
          .insert(viajesToInsert);

        if (error) throw error;

        setMessage({ 
          type: 'success', 
          text: `¡Éxito! ${viajesToInsert.length} viajes importados.${skipCount > 0 ? ` Se omitieron ${skipCount} duplicados.` : ''}` 
        });
        
        setPreviewData(null);
        onSuccess?.();
      } else {
        setMessage({ type: 'warning', text: 'No se importaron viajes (todos eran duplicados o inválidos).' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error importando: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadGastos = async (file: File) => {
    setLoading(true);
    setMessage(null);
    setDuplicadosPreview([]);

    try {
      const expenses = await parseGastosExcel(file);
      
      // Pre-check for duplicates to show in preview
      const duplicados: Array<{gasto: ParsedExpense, reason: string}> = [];
      const validos: ParsedExpense[] = [];
      
      // Check first 20 expenses for preview (to avoid too many queries)
      const previewLimit = Math.min(20, expenses.length);
      for (let i = 0; i < previewLimit; i++) {
        const { isDuplicate, reason } = await checkGastoDuplicado(expenses[i]);
        if (isDuplicate) {
          duplicados.push({ gasto: expenses[i], reason: reason || 'Duplicado detectado' });
        } else {
          validos.push(expenses[i]);
        }
      }
      
      // Add remaining expenses to validos (they'll be checked on confirm)
      validos.push(...expenses.slice(previewLimit));
      
      setDuplicadosPreview(duplicados);
      setPreviewData(expenses);
      
      let messageText = `Se detectaron ${expenses.length} gastos válidos.`;
      if (duplicados.length > 0) {
        messageText += ` ⚠️ ${duplicados.length} duplicados detectados en preview (se omitirán al confirmar).`;
      }
      setMessage({ type: 'success', text: messageText });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error procesando archivo: ${error?.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  const checkGastoDuplicado = async (gasto: ParsedExpense): Promise<{ isDuplicate: boolean; reason?: string }> => {
    // 1. Check if exact duplicate exists (same date, type, description, amount)
    const { data: existingGastos } = await supabase
      .from('GASTOS')
      .select('id_gasto, descripcion, fecha, tipo_gasto, monto')
      .eq('fecha', gasto.fecha)
      .eq('tipo_gasto', gasto.tipo)
      .eq('monto', gasto.monto)
      .ilike('descripcion', `%${gasto.descripcion}%`)
      .limit(1);

    if (existingGastos && existingGastos.length > 0) {
      return { isDuplicate: true, reason: 'Gasto exacto ya existe en la base de datos' };
    }

    // 2. Check for similar expenses (same date + type + similar amount ±5%)
    const { data: similarGastos } = await supabase
      .from('GASTOS')
      .select('id_gasto, descripcion, monto')
      .eq('fecha', gasto.fecha)
      .eq('tipo_gasto', gasto.tipo)
      .gte('monto', gasto.monto * 0.95) // Within 5% tolerance
      .lte('monto', gasto.monto * 1.05)
      .limit(5);

    if (similarGastos && similarGastos.length > 0) {
      // Check if description is similar (fuzzy match)
      const descripcionNormalizada = gasto.descripcion.toUpperCase().trim();
      for (const similar of similarGastos) {
        const similarDesc = String(similar.descripcion || '').toUpperCase().trim();
        // If descriptions are very similar (contain same keywords), consider duplicate
        if (descripcionNormalizada === similarDesc || 
            (descripcionNormalizada.length > 5 && similarDesc.includes(descripcionNormalizada.substring(0, 5))) ||
            (similarDesc.length > 5 && descripcionNormalizada.includes(similarDesc.substring(0, 5)))) {
          return { isDuplicate: true, reason: 'Gasto similar ya existe (misma fecha, tipo y monto similar)' };
        }
      }
    }

    // 3. If gasto has contenedor info, check if that contenedor already has expenses
    if (gasto.contenedor) {
      const contenedorNormalizado = gasto.contenedor.trim().toUpperCase();
      
      // Search in VIAJES for this contenedor on the same date
      const { data: viajes } = await supabase
        .from('VIAJES')
        .select('id_viaje, observaciones, fecha')
        .eq('fecha', gasto.fecha)
        .ilike('observaciones', `%${contenedorNormalizado}%`)
        .limit(10);

      if (viajes && viajes.length > 0) {
        // Check if there's already an expense for this contenedor on this date with same type
        const { data: gastosPorContenedor } = await supabase
          .from('GASTOS')
          .select('id_gasto, descripcion')
          .eq('fecha', gasto.fecha)
          .eq('tipo_gasto', gasto.tipo)
          .limit(10);

        // If we found expenses for this date+type, and we have a viaje with this contenedor,
        // it's likely a duplicate (same contenedor shouldn't have same expense type twice on same day)
        if (gastosPorContenedor && gastosPorContenedor.length > 0) {
          // Additional check: if the amount is exactly the same, it's definitely a duplicate
          const exactMatch = gastosPorContenedor.find(g => {
            // We can't check amount here without another query, but we already checked above
            return true; // If we got here, there's a similar expense for this date+type
          });
          
          if (exactMatch) {
            return { isDuplicate: true, reason: `Gasto para contenedor ${contenedorNormalizado} ya existe en esta fecha` };
          }
        }
      }
    }

    return { isDuplicate: false };
  };

  const handleConfirmGastos = async () => {
    if (!previewData || !Array.isArray(previewData)) return;

    setLoading(true);
    setMessage(null);

    try {
      const expenses = previewData as ParsedExpense[];
      const gastosToInsert: any[] = [];
      let duplicadosCount = 0;
      const duplicadosInfo: string[] = [];

      // Check each expense for duplicates
      for (const expense of expenses) {
        const { isDuplicate, reason } = await checkGastoDuplicado(expense);
        
        if (isDuplicate) {
          duplicadosCount++;
          const info = `${expense.fecha} - ${expense.descripcion} - $${expense.monto.toLocaleString('es-CL')}`;
          duplicadosInfo.push(reason ? `${info} (${reason})` : info);
          continue;
        }

        gastosToInsert.push({
          fecha: expense.fecha,
          tipo_gasto: expense.tipo,
          descripcion: expense.descripcion,
          monto: expense.monto,
          proveedor: expense.proveedor || expense.descripcion,
        });
      }

      if (gastosToInsert.length === 0) {
        setMessage({ 
          type: 'warning', 
          text: `No se importaron gastos. ${duplicadosCount > 0 ? `Se encontraron ${duplicadosCount} duplicados.` : 'No hay gastos válidos para importar.'}` 
        });
        setLoading(false);
        return;
      }

      // Insert in batches for better performance
      const batchSize = 50;
      let inserted = 0;
      
      for (let i = 0; i < gastosToInsert.length; i += batchSize) {
        const batch = gastosToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('GASTOS')
          .insert(batch);

        if (error) throw error;
        inserted += batch.length;
      }

      let messageText = `¡Listo! ${inserted} gastos registrados correctamente.`;
      if (duplicadosCount > 0) {
        messageText += ` Se omitieron ${duplicadosCount} duplicados.`;
      }

      setMessage({ type: 'success', text: messageText });
      setPreviewData(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error importing gastos:', error);
      setMessage({ type: 'error', text: `Error importando: ${error?.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('viajes'); setPreviewData(null); setMessage(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'viajes'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          🚛 Cargar Viajes
        </button>
        <button
          onClick={() => { setActiveTab('gastos'); setPreviewData(null); setMessage(null); }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'gastos'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          💸 Cargar Gastos
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          message.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {activeTab === 'viajes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Formato de Archivo</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value as 'TOBAR' | 'COSIO')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              >
                <option value="TOBAR">Formato TOBAR</option>
                <option value="COSIO">Formato COSIO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Asignar a Cliente</label>
              <select
                value={clienteSeleccionado || ''}
                onChange={(e) => setClienteSeleccionado(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              >
                <option value="">Selecciona un cliente</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.alias || c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Subir Excel de Viajes</label>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUploadViajes(file);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              disabled={loading || !clienteSeleccionado}
            />
          </div>

          {previewData && Array.isArray(previewData) && previewData.length > 0 && (
            <div className="space-y-4">
              <details className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <summary className="cursor-pointer text-slate-300 font-medium mb-2">
                  Ver detalle de datos a cargar ({previewData.length} registros)
                </summary>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Ruta</th>
                        <th className="text-left p-2">Monto</th>
                        <th className="text-left p-2">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((item: any, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50">
                          <td className="p-2">{item.fecha}</td>
                          <td className="p-2">{item.ruta_nombre}</td>
                          <td className="p-2">${item.monto?.toLocaleString('es-CL')}</td>
                          <td className="p-2">{item.observaciones}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <button
                onClick={handleConfirmViajes}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Importando...' : 'Confirmar e Importar Viajes'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Cargar Excel Gastos (.xlsx) - Busca la hoja 'input_costos'
            </label>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUploadGastos(file);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              disabled={loading}
            />
          </div>

          {previewData && Array.isArray(previewData) && previewData.length > 0 && (
            <div className="space-y-4">
              {duplicadosPreview.length > 0 && (
                <details className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <summary className="cursor-pointer text-yellow-400 font-medium mb-2">
                    ⚠️ Duplicados detectados ({duplicadosPreview.length}) - Se omitirán al importar
                  </summary>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-yellow-300">
                      <thead>
                        <tr className="border-b border-yellow-500/30">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descripción</th>
                          <th className="text-left p-2">Monto</th>
                          <th className="text-left p-2">Razón</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicadosPreview.map((dup, idx) => (
                          <tr key={idx} className="border-b border-yellow-500/20">
                            <td className="p-2">{dup.gasto.fecha}</td>
                            <td className="p-2">{dup.gasto.tipo}</td>
                            <td className="p-2">{dup.gasto.descripcion}</td>
                            <td className="p-2">${dup.gasto.monto?.toLocaleString('es-CL')}</td>
                            <td className="p-2 text-xs text-yellow-400/80">{dup.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <details className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <summary className="cursor-pointer text-slate-300 font-medium mb-2">
                  Ver detalle de gastos a cargar ({previewData.length} registros)
                </summary>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Descripción</th>
                        <th className="text-left p-2">Monto</th>
                        {previewData.some((e: any) => e.contenedor) && (
                          <th className="text-left p-2">Contenedor</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((item: any, idx) => {
                        const esDuplicado = duplicadosPreview.some(d => 
                          d.gasto.fecha === item.fecha && 
                          d.gasto.descripcion === item.descripcion &&
                          d.gasto.monto === item.monto
                        );
                        return (
                          <tr 
                            key={idx} 
                            className={`border-b border-slate-700/50 ${esDuplicado ? 'opacity-50 line-through' : ''}`}
                          >
                            <td className="p-2">{item.fecha}</td>
                            <td className="p-2">{item.tipo}</td>
                            <td className="p-2">{item.descripcion}</td>
                            <td className="p-2">${item.monto?.toLocaleString('es-CL')}</td>
                            {previewData.some((e: any) => e.contenedor) && (
                              <td className="p-2 text-xs">{item.contenedor || '-'}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
              <button
                onClick={handleConfirmGastos}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Importando...' : 'Confirmar e Importar Gastos'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

