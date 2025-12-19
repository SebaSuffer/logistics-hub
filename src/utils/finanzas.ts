import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { Viaje, Gasto } from '../types/database.types';

export interface FinancialConfig {
  pagoChoferPorVuelta: number;
  costoPrevired: number;
  ivaPetroleo: number; // 0-1 (e.g., 0.19 for 19%)
}

export interface FinancialData {
  totalIngresos: number;
  totalViajes: number;
  costoChofer: number;
  gastoPetroleo: number;
  petroleoReal: number;
  ivaRecuperado: number;
  otros: number;
  egresosTotales: number;
  utilidad: number;
  margen: number;
  rendimientoKmL?: number; // Rendimiento promedio km/L
  costoPorKm?: number; // Costo promedio por kilómetro
  totalKm?: number; // Total de kilómetros recorridos
}

export async function getFinancialData(
  year: number | null,
  month: number | null,
  config: FinancialConfig
): Promise<FinancialData> {
  // Get ingresos (viajes)
  let ingresosQuery = supabase
    .from('VIAJES')
    .select('fecha, monto_neto, id_ruta');
  
  if (year) {
    if (month) {
      const startDate = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      ingresosQuery = ingresosQuery
        .gte('fecha', startDate)
        .lte('fecha', endDate);
    } else {
      ingresosQuery = ingresosQuery
        .gte('fecha', `${year}-01-01`)
        .lte('fecha', `${year}-12-31`);
    }
  }

  const { data: viajes } = await ingresosQuery;
  const totalIngresos = viajes?.reduce((sum, v) => sum + (v.monto_neto || 0), 0) || 0;
  const totalViajes = viajes?.length || 0;

  // Get egresos (gastos)
  let gastosQuery = supabase
    .from('GASTOS')
    .select('fecha, monto, tipo_gasto, descripcion');
  
  if (year) {
    if (month) {
      const startDate = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      gastosQuery = gastosQuery
        .gte('fecha', startDate)
        .lte('fecha', endDate);
    } else {
      gastosQuery = gastosQuery
        .gte('fecha', `${year}-01-01`)
        .lte('fecha', `${year}-12-31`);
    }
  }

  const { data: gastos } = await gastosQuery;

  // Calculate months for fixed cost
  let mesesCalc = 1;
  if (!year || !month) {
    const uniqueMonths = new Set(
      [...(viajes || []), ...(gastos || [])]
        .map(item => {
          const date = parseISO(item.fecha);
          return `${date.getFullYear()}-${date.getMonth() + 1}`;
        })
    );
    mesesCalc = uniqueMonths.size || 1;
  }

  // Calculate costs
  const costoVar = totalViajes * config.pagoChoferPorVuelta;
  const costoFijo = config.costoPrevired * mesesCalc;
  const totalChofer = costoVar + costoFijo;

  // Filter gastos
  const gastoPetroleo = (gastos || [])
    .filter(g => g.tipo_gasto === 'VARIABLE' && g.descripcion?.toUpperCase().includes('PETRÓLEO'))
    .reduce((sum, g) => sum + (g.monto || 0), 0);

  const otros = (gastos || [])
    .filter(g => !(g.tipo_gasto === 'VARIABLE' && g.descripcion?.toUpperCase().includes('PETRÓLEO')))
    .reduce((sum, g) => sum + (g.monto || 0), 0);

  const ivaRecuperado = gastoPetroleo * config.ivaPetroleo;
  const petroleoReal = gastoPetroleo - ivaRecuperado;

  const egresosTotales = totalChofer + petroleoReal + otros;
  const utilidad = totalIngresos - egresosTotales;
  const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

  // Calculate performance metrics
  // Get routes with their km and performance data
  const { data: rutas } = await supabase
    .from('RUTAS')
    .select('id_ruta, km_estimados, rendimiento_km_l, costo_por_km');

  // Use the same viajes data we already fetched
  const rutasUsadas = new Set((viajes || []).map((v: any) => v.id_ruta).filter(Boolean));
  
  let totalKm = 0;
  let rendimientoPromedio = 0;
  let costoPorKmPromedio = 0;
  let rutasConRendimiento = 0;
  let rutasConCosto = 0;

  if (rutas) {
    rutas.forEach(ruta => {
      if (rutasUsadas.has(ruta.id_ruta)) {
        // Count km for each trip using this route
        const viajesRuta = (viajes || []).filter((v: any) => v.id_ruta === ruta.id_ruta).length;
        totalKm += (ruta.km_estimados || 0) * viajesRuta;

        if (ruta.rendimiento_km_l && ruta.rendimiento_km_l > 0) {
          rendimientoPromedio += ruta.rendimiento_km_l;
          rutasConRendimiento++;
        }

        if (ruta.costo_por_km && ruta.costo_por_km > 0) {
          costoPorKmPromedio += ruta.costo_por_km;
          rutasConCosto++;
        }
      }
    });

    if (rutasConRendimiento > 0) {
      rendimientoPromedio = rendimientoPromedio / rutasConRendimiento;
    }

    if (rutasConCosto > 0) {
      costoPorKmPromedio = costoPorKmPromedio / rutasConCosto;
    }
  }

  return {
    totalIngresos,
    totalViajes,
    costoChofer: totalChofer,
    gastoPetroleo,
    petroleoReal,
    ivaRecuperado,
    otros,
    egresosTotales,
    utilidad,
    margen,
    rendimientoKmL: rendimientoPromedio > 0 ? rendimientoPromedio : undefined,
    costoPorKm: costoPorKmPromedio > 0 ? costoPorKmPromedio : undefined,
    totalKm: totalKm > 0 ? totalKm : undefined,
  };
}

export async function getMonthlyFlow(year: number | null, month: number | null) {
  // Get all data for the period
  let viajesQuery = supabase.from('VIAJES').select('fecha, monto_neto');
  let gastosQuery = supabase.from('GASTOS').select('fecha, monto');

  if (year) {
    if (month) {
      const startDate = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      viajesQuery = viajesQuery.gte('fecha', startDate).lte('fecha', endDate);
      gastosQuery = gastosQuery.gte('fecha', startDate).lte('fecha', endDate);
    } else {
      viajesQuery = viajesQuery.gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`);
      gastosQuery = gastosQuery.gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`);
    }
  }

  const { data: viajes } = await viajesQuery;
  const { data: gastos } = await gastosQuery;

  // Group by month
  const monthlyData: Record<string, { ingresos: number; egresos: number }> = {};

  viajes?.forEach(v => {
    const date = parseISO(v.fecha);
    const key = format(date, 'yyyy-MM');
    if (!monthlyData[key]) monthlyData[key] = { ingresos: 0, egresos: 0 };
    monthlyData[key].ingresos += v.monto_neto || 0;
  });

  gastos?.forEach(g => {
    const date = parseISO(g.fecha);
    const key = format(date, 'yyyy-MM');
    if (!monthlyData[key]) monthlyData[key] = { ingresos: 0, egresos: 0 };
    monthlyData[key].egresos += g.monto || 0;
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      fecha: month,
      ingresos: data.ingresos,
      egresos: data.egresos,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

