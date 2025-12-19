import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { DataQualityMetric } from '../../types/database.types';

export function CentroDatos() {
  const [metrics, setMetrics] = useState<DataQualityMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('CentroDatos: Cargando datos de calidad...');
    loadDataQuality();
  }, []);

  const loadDataQuality = async () => {
    setLoading(true);
    try {
      const qualityMetrics: DataQualityMetric[] = [];

      // 1. Verificar completitud de datos de rutas
      let rutas: any[] = [];
      let totalRutas = 0;
      try {
        const result = await supabase
          .from('RUTAS')
          .select('*', { count: 'exact' });
        if (result.error) {
          console.warn('Error consultando RUTAS:', result.error);
          // Intentar con minúsculas como fallback
          const altResult = await supabase
            .from('rutas')
            .select('*', { count: 'exact' });
          if (!altResult.error) {
            rutas = altResult.data || [];
            totalRutas = altResult.count || 0;
          }
        } else {
          rutas = result.data || [];
          totalRutas = result.count || 0;
        }
      } catch (error) {
        console.warn('Error inesperado consultando RUTAS:', error);
      }

      const rutasConMetricas = rutas?.filter(r => 
        r.rendimiento_km_l && r.rendimiento_km_l > 0 && 
        r.costo_por_km && r.costo_por_km > 0
      ).length || 0;

      const porcentajeRutas = totalRutas ? (rutasConMetricas / totalRutas) * 100 : 0;
      
      qualityMetrics.push({
        nombre: 'Datos de Rutas Completos',
        porcentaje: Math.round(porcentajeRutas),
        estado: porcentajeRutas >= 80 ? 'excelente' : porcentajeRutas >= 50 ? 'bueno' : porcentajeRutas >= 20 ? 'regular' : 'malo',
        descripcion: `${rutasConMetricas} de ${totalRutas} rutas tienen métricas de rendimiento`,
        detalles: porcentajeRutas < 100 ? [
          'Agrega rendimiento (km/L) y costo por km en las rutas para mejorar las métricas'
        ] : undefined
      });

      // 2. Verificar historial de operaciones
      let totalOperaciones = 0;
      let operacionesValidas = 0;
      try {
        const { count: total, error: errorTotal } = await supabase
          .from('HISTORIAL_OPERACIONES')
          .select('*', { count: 'exact', head: true });
        
        if (errorTotal) {
          console.warn('Tabla HISTORIAL_OPERACIONES no disponible:', errorTotal);
        } else {
          totalOperaciones = total || 0;

          if (totalOperaciones > 0) {
            const { count: validas, error: errorValidas } = await supabase
              .from('HISTORIAL_OPERACIONES')
              .select('*', { count: 'exact', head: true })
              .not('litros_cargados', 'is', null)
              .gt('litros_cargados', 0)
              .not('odometro_actual', 'is', null);
            
            if (!errorValidas) {
              operacionesValidas = validas || 0;
            }
          }
        }
      } catch (error) {
        console.warn('Error inesperado consultando HISTORIAL_OPERACIONES:', error);
      }

      const porcentajeOperaciones = totalOperaciones ? (operacionesValidas / totalOperaciones) * 100 : 0;
      
      qualityMetrics.push({
        nombre: 'Registros de Operaciones Válidos',
        porcentaje: totalOperaciones ? Math.round(porcentajeOperaciones) : 0,
        estado: totalOperaciones === 0 ? 'malo' : porcentajeOperaciones >= 90 ? 'excelente' : porcentajeOperaciones >= 70 ? 'bueno' : porcentajeOperaciones >= 50 ? 'regular' : 'malo',
        descripcion: totalOperaciones === 0 
          ? 'No hay registros de operaciones. Comienza a registrar cargas de combustible.'
          : `${operacionesValidas} de ${totalOperaciones} operaciones tienen datos completos`,
        detalles: totalOperaciones === 0 ? [
          'Registra odómetros y cargas de combustible para habilitar análisis de rendimiento'
        ] : porcentajeOperaciones < 90 ? [
          'Algunos registros tienen litros en 0 o odómetros faltantes'
        ] : undefined
      });

      // 3. Verificar datos de viajes con rutas asignadas
      let totalViajes = 0;
      let viajesConRuta = 0;
      try {
        const { count: total, error: errorTotal } = await supabase
          .from('VIAJES')
          .select('*', { count: 'exact', head: true });
        
        if (errorTotal) {
          console.warn('Error verificando viajes:', errorTotal);
        } else {
          totalViajes = total || 0;

          if (totalViajes > 0) {
            const { count: conRuta, error: errorConRuta } = await supabase
              .from('VIAJES')
              .select('*', { count: 'exact', head: true })
              .not('id_ruta', 'is', null);
            
            if (!errorConRuta) {
              viajesConRuta = conRuta || 0;
            }
          }
        }
      } catch (error) {
        console.warn('Error inesperado verificando viajes:', error);
      }

      const porcentajeViajes = totalViajes ? (viajesConRuta / totalViajes) * 100 : 0;

      qualityMetrics.push({
        nombre: 'Viajes con Ruta Asignada',
        porcentaje: totalViajes ? Math.round(porcentajeViajes) : 0,
        estado: totalViajes === 0 ? 'malo' : porcentajeViajes >= 95 ? 'excelente' : porcentajeViajes >= 80 ? 'bueno' : porcentajeViajes >= 60 ? 'regular' : 'malo',
        descripcion: totalViajes === 0
          ? 'No hay viajes registrados'
          : `${viajesConRuta} de ${totalViajes} viajes tienen ruta asignada`,
        detalles: porcentajeViajes < 100 && totalViajes > 0 ? [
          'Usa "Auto-asignar Rutas" en Historial de Viajes para asignar rutas automáticamente'
        ] : undefined
      });

      // 4. Verificar precios históricos de insumos
      let gastos: any[] = [];
      try {
        const { data, error: errorGastos } = await supabase
          .from('GASTOS')
          .select('fecha, tipo_gasto, descripcion, monto')
          .order('fecha', { ascending: false })
          .limit(100);
        
        if (errorGastos) {
          console.warn('Error verificando gastos:', errorGastos);
        } else {
          gastos = data || [];
        }
      } catch (error) {
        console.warn('Error inesperado verificando gastos:', error);
      }

      const gastosPetroleo = gastos?.filter(g => 
        g.tipo_gasto === 'VARIABLE' && 
        g.descripcion?.toUpperCase().includes('PETRÓLEO')
      ) || [];

      const ultimos3Meses = new Date();
      ultimos3Meses.setMonth(ultimos3Meses.getMonth() - 3);
      const gastosRecientes = gastosPetroleo.filter(g => new Date(g.fecha) >= ultimos3Meses);

      const porcentajePrecios = gastosPetroleo.length > 0 
        ? (gastosRecientes.length / Math.min(gastosPetroleo.length, 10)) * 100 
        : 0;

      qualityMetrics.push({
        nombre: 'Precios de Insumos Históricos',
        porcentaje: Math.min(100, Math.round(porcentajePrecios * 10)),
        estado: gastosPetroleo.length === 0 ? 'malo' : porcentajePrecios >= 70 ? 'excelente' : porcentajePrecios >= 50 ? 'bueno' : porcentajePrecios >= 30 ? 'regular' : 'malo',
        descripcion: gastosPetroleo.length === 0
          ? 'No hay registros de gastos de combustible'
          : `${gastosRecientes.length} registros de combustible en los últimos 3 meses`,
        detalles: gastosPetroleo.length === 0 ? [
          'Sube archivos Excel de gastos para tener historial de precios de combustible'
        ] : porcentajePrecios < 50 ? [
          'Necesitas más registros recientes de gastos de combustible para análisis preciso'
        ] : undefined
      });

      setMetrics(qualityMetrics);
    } catch (error) {
      console.error('Error cargando calidad de datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'text-green-400';
      case 'bueno': return 'text-green-300';
      case 'regular': return 'text-yellow-400';
      case 'malo': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'excelente': return '🟢';
      case 'bueno': return '🟡';
      case 'regular': return '🟠';
      case 'malo': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusBg = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'bg-green-500/20 border-green-500/50';
      case 'bueno': return 'bg-green-500/10 border-green-500/30';
      case 'regular': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'malo': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-slate-800 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="text-center py-8 text-slate-400">Analizando calidad de datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-xl font-semibold text-slate-50">Centro de Datos</h3>
            <p className="text-sm text-slate-400">Validación de calidad y salud de los datos</p>
          </div>
        </div>

        <div className="space-y-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-4 ${getStatusBg(metric.estado)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getStatusIcon(metric.estado)}</span>
                  <div>
                    <h4 className="font-medium text-slate-200">{metric.nombre}</h4>
                    <p className="text-sm text-slate-400">{metric.descripcion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(metric.estado)}`}>
                    {metric.porcentaje}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase">{metric.estado}</div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3 bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    metric.estado === 'excelente' ? 'bg-green-500' :
                    metric.estado === 'bueno' ? 'bg-green-400' :
                    metric.estado === 'regular' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${metric.porcentaje}%` }}
                />
              </div>

              {/* Detalles adicionales */}
              {metric.detalles && metric.detalles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <ul className="space-y-1">
                    {metric.detalles.map((detalle, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span>•</span>
                        <span>{detalle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            💡 <strong>Tip:</strong> Estos indicadores te ayudan a identificar qué datos necesitas 
            para habilitar análisis avanzados y predicciones precisas.
          </p>
        </div>
      </div>
    </div>
  );
}

