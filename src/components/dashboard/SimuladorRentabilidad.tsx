import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { SimulacionRentabilidad, ConfiguracionModelo, Ruta, Cliente } from '../../types/database.types';

export function SimuladorRentabilidad() {
  const [config, setConfig] = useState<ConfiguracionModelo>({
    nombre_config: 'Default',
    costo_operativo_km: 1200,
    margen_minimo_aceptable: 15.0,
  });

  const [simulacion, setSimulacion] = useState<SimulacionRentabilidad>({
    ingresoBruto: 0,
    distanciaKm: 0,
    costoOperativoKm: 1200,
    costoEstimado: 0,
    margenNeto: 0,
    horasEstimadas: 0,
    scoreRentabilidad: 0,
    margenPorcentaje: 0,
  });

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null);
  const [escenarios, setEscenarios] = useState<Array<{
    nombre: string;
    variacion: number;
    nuevoScore: number;
    nuevoMargen: number;
  }>>([]);

  useEffect(() => {
    loadConfig();
    loadRutas();
    loadClientes();
  }, []);

  useEffect(() => {
    calcularSimulacion();
  }, [simulacion.ingresoBruto, simulacion.distanciaKm, simulacion.horasEstimadas, config]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('CONFIGURACION_MODELOS')
        .select('*')
        .eq('activo', true)
        .limit(1)
        .single();

      if (data && !error) {
        setConfig({
          nombre_config: data.nombre_config,
          costo_operativo_km: data.costo_operativo_km,
          margen_minimo_aceptable: data.margen_minimo_aceptable,
          peso_margen: data.peso_margen,
          peso_tiempo: data.peso_tiempo,
        });
        setSimulacion(prev => ({
          ...prev,
          costoOperativoKm: data.costo_operativo_km,
        }));
      }
    } catch (error) {
      console.warn('Tabla CONFIGURACION_MODELOS no disponible, usando valores por defecto:', error);
      // Usar valores por defecto que ya están en el estado inicial
    }
  };

  const loadRutas = async () => {
    try {
      const { data, error } = await supabase
        .from('RUTAS')
        .select('*')
        .order('origen');
      if (!error && data) {
        setRutas(data);
      }
    } catch (error) {
      console.warn('Error cargando rutas:', error);
      setRutas([]);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('CLIENTE')
        .select('*')
        .order('nombre');
      if (!error && data) {
        setClientes(data);
      }
    } catch (error) {
      console.warn('Error cargando clientes:', error);
      setClientes([]);
    }
  };

  const calcularSimulacion = () => {
    const costoEstimado = simulacion.distanciaKm * simulacion.costoOperativoKm;
    const margenNeto = simulacion.ingresoBruto - costoEstimado;
    const margenPorcentaje = simulacion.ingresoBruto > 0 
      ? (margenNeto / simulacion.ingresoBruto) * 100 
      : 0;
    
    // Score de Rentabilidad: S = Margen Neto / Horas Estimadas
    // Si no hay horas, usar una estimación basada en distancia (ej: 60 km/h promedio)
    const horas = simulacion.horasEstimadas > 0 
      ? simulacion.horasEstimadas 
      : simulacion.distanciaKm / 60;
    
    const scoreRentabilidad = horas > 0 ? margenNeto / horas : 0;

    setSimulacion(prev => ({
      ...prev,
      costoEstimado,
      margenNeto,
      margenPorcentaje,
      scoreRentabilidad,
    }));

    // Calcular escenarios "¿Qué pasa si...?"
    calcularEscenarios(margenNeto, horas, margenPorcentaje);
  };

  const calcularEscenarios = (margenBase: number, horas: number, margenBasePct: number) => {
    const escenariosCalculados = [
      {
        nombre: 'Combustible sube $50/L',
        variacion: -simulacion.distanciaKm * 50, // Aproximación: cada km usa ~1L
        nuevoScore: horas > 0 ? (margenBase - simulacion.distanciaKm * 50) / horas : 0,
        nuevoMargen: simulacion.ingresoBruto > 0 
          ? ((margenBase - simulacion.distanciaKm * 50) / simulacion.ingresoBruto) * 100 
          : 0,
      },
      {
        nombre: 'Combustible baja $30/L',
        variacion: simulacion.distanciaKm * 30,
        nuevoScore: horas > 0 ? (margenBase + simulacion.distanciaKm * 30) / horas : 0,
        nuevoMargen: simulacion.ingresoBruto > 0 
          ? ((margenBase + simulacion.distanciaKm * 30) / simulacion.ingresoBruto) * 100 
          : 0,
      },
      {
        nombre: 'Viaje toma 2h más',
        variacion: 0,
        nuevoScore: (horas + 2) > 0 ? margenBase / (horas + 2) : 0,
        nuevoMargen: margenBasePct,
      },
      {
        nombre: 'Cliente paga 10% menos',
        variacion: -simulacion.ingresoBruto * 0.1,
        nuevoScore: horas > 0 ? (margenBase - simulacion.ingresoBruto * 0.1) / horas : 0,
        nuevoMargen: simulacion.ingresoBruto > 0 
          ? ((margenBase - simulacion.ingresoBruto * 0.1) / (simulacion.ingresoBruto * 0.9)) * 100 
          : 0,
      },
    ];

    setEscenarios(escenariosCalculados);
  };

  const handleRutaChange = (rutaId: number) => {
    setRutaSeleccionada(rutaId);
    const ruta = rutas.find(r => r.id_ruta === rutaId);
    if (ruta) {
      setSimulacion(prev => ({
        ...prev,
        distanciaKm: ruta.km_estimados,
        ingresoBruto: ruta.tarifa_sugerida,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔮</span>
          <div>
            <h3 className="text-xl font-semibold text-slate-50">Simulador de Rentabilidad</h3>
            <p className="text-sm text-slate-400">Calcula el Score de Rentabilidad y simula escenarios</p>
          </div>
        </div>

        {/* Configuración */}
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Configuración Base</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Costo Operativo por Km</label>
              <input
                type="number"
                value={config.costo_operativo_km}
                onChange={(e) => {
                  const nuevoCosto = Number(e.target.value);
                  setConfig(prev => ({ ...prev, costo_operativo_km: nuevoCosto }));
                  setSimulacion(prev => ({ ...prev, costoOperativoKm: nuevoCosto }));
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm"
                min="0"
                step="100"
              />
              <p className="text-xs text-slate-500 mt-1">Incluye: bencina + chofer + desgaste</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Margen Mínimo Aceptable (%)</label>
              <input
                type="number"
                value={config.margen_minimo_aceptable}
                onChange={(e) => setConfig(prev => ({ ...prev, margen_minimo_aceptable: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Inputs de simulación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Seleccionar Ruta (opcional)
            </label>
            <select
              value={rutaSeleccionada || ''}
              onChange={(e) => handleRutaChange(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm"
            >
              <option value="">Selecciona una ruta...</option>
              {rutas.map(r => (
                <option key={r.id_ruta} value={r.id_ruta}>
                  {r.origen} → {r.destino} ({r.km_estimados} km)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ingreso Bruto ($)</label>
            <input
              type="number"
              value={simulacion.ingresoBruto || ''}
              onChange={(e) => setSimulacion(prev => ({ ...prev, ingresoBruto: Number(e.target.value) }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Distancia (km)</label>
            <input
              type="number"
              value={simulacion.distanciaKm || ''}
              onChange={(e) => setSimulacion(prev => ({ ...prev, distanciaKm: Number(e.target.value) }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
              min="0"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Horas Estimadas</label>
            <input
              type="number"
              value={simulacion.horasEstimadas || ''}
              onChange={(e) => setSimulacion(prev => ({ ...prev, horasEstimadas: Number(e.target.value) }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
              min="0"
              step="0.5"
              placeholder="Auto si vacío"
            />
          </div>
        </div>

        {/* Resultados principales */}
        {simulacion.ingresoBruto > 0 && simulacion.distanciaKm > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Costo Estimado</div>
                <div className="text-xl font-bold text-slate-200">
                  ${simulacion.costoEstimado.toLocaleString('es-CL')}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Margen Neto</div>
                <div className={`text-xl font-bold ${simulacion.margenNeto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${simulacion.margenNeto.toLocaleString('es-CL')}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Margen (%)</div>
                <div className={`text-xl font-bold ${
                  simulacion.margenPorcentaje >= config.margen_minimo_aceptable ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {simulacion.margenPorcentaje.toFixed(1)}%
                </div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/50">
                <div className="text-xs text-blue-300 mb-1">Score Rentabilidad</div>
                <div className="text-xl font-bold text-blue-400">
                  ${Math.round(simulacion.scoreRentabilidad).toLocaleString('es-CL')}/h
                </div>
                <div className="text-xs text-blue-300 mt-1">
                  {simulacion.horasEstimadas > 0 ? `${simulacion.horasEstimadas.toFixed(1)}h` : 'Auto'}
                </div>
              </div>
            </div>

            {/* Escenarios "¿Qué pasa si...?" */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Escenarios: ¿Qué pasa si...?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {escenarios.map((escenario, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-medium text-slate-300">{escenario.nombre}</div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        escenario.nuevoScore > simulacion.scoreRentabilidad
                          ? 'bg-green-500/20 text-green-400'
                          : escenario.nuevoScore < simulacion.scoreRentabilidad
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {escenario.nuevoScore > simulacion.scoreRentabilidad ? '↑' : 
                         escenario.nuevoScore < simulacion.scoreRentabilidad ? '↓' : '='}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Nuevo Score: <span className="text-slate-200 font-medium">
                        ${Math.round(escenario.nuevoScore).toLocaleString('es-CL')}/h
                      </span></div>
                      <div>Nuevo Margen: <span className="text-slate-200 font-medium">
                        {escenario.nuevoMargen.toFixed(1)}%
                      </span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fórmula explicada */}
            <div className="mt-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">📐 Fórmula del Score de Rentabilidad:</div>
              <div className="text-sm text-slate-300 font-mono mb-2">
                S = Margen Neto / Horas Estimadas
              </div>
              <div className="text-xs text-slate-500">
                Por qué funciona: Normaliza la ganancia por tiempo. Ganar $100.000 en 2 horas (S = 50k/h) 
                es mejor que ganar $200.000 en 10 horas (S = 20k/h).
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

