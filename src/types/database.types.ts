export interface Usuario {
  id_usuario?: number;
  username: string;
  password: string;
}

export interface Cliente {
  id_cliente: number;
  nombre: string;
  alias?: string;
  rut_empresa?: string;
  contacto?: string;
}

export interface Ruta {
  id_ruta: number;
  origen: string;
  destino: string;
  km_estimados: number;
  tarifa_sugerida: number;
  rendimiento_km_l?: number; // Rendimiento en km/L
  costo_por_km?: number; // Costo por kilómetro en pesos
}

export interface Viaje {
  id_viaje?: number;
  fecha: string;
  id_cliente: number;
  id_ruta: number | null;
  estado: string;
  monto_neto: number;
  observaciones?: string;
}

export interface Gasto {
  id_gasto?: number;
  fecha: string;
  tipo_gasto: string;
  descripcion: string;
  monto: number;
  proveedor?: string;
}

export interface Camion {
  id_camion?: number;
  patente: string;
  marca: string;
  modelo?: string;
  año?: number;
  rendimiento_esperado?: number;
}

export interface Conductor {
  id_conductor?: number;
  nombre: string;
  rut?: string;
  licencia?: string;
  activo?: boolean;
}

export interface Tarifa {
  id_cliente: number;
  id_ruta: number;
  monto_pactado: number;
}

// ============================================
// Data Science Tables
// ============================================

export interface HistorialOperacion {
  id_operacion?: number;
  fecha: string;
  id_camion?: number | null;
  id_conductor?: number | null;
  id_viaje?: number | null;
  odometro_actual: number;
  odometro_anterior?: number | null;
  litros_cargados?: number | null;
  costo_combustible?: number | null;
  precio_litro?: number | null;
  distancia_recorrida?: number; // Calculado
  rendimiento_km_l?: number | null; // Calculado
  costo_por_km?: number | null; // Calculado
  horas_viaje?: number | null;
  tiempo_real?: number | null;
  observaciones?: string | null;
  ubicacion_carga?: string | null;
  tipo_operacion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PrediccionCache {
  id_prediccion?: number;
  fecha_prediccion?: string;
  fecha_aplicable: string;
  tipo_prediccion: string; // CONSUMO_COMBUSTIBLE, COSTO_VIAJE, RENTABILIDAD, etc.
  id_camion?: number | null;
  id_ruta?: number | null;
  id_cliente?: number | null;
  valor_predicho: number;
  valor_real?: number | null;
  confianza?: number | null;
  modelo_version?: string | null;
  modelo_tipo?: string | null; // "Deterministic", "XGBoost", etc.
  features_usadas?: any; // JSONB
  created_at?: string;
  updated_at?: string;
}

export interface ConfiguracionModelo {
  id_config?: number;
  nombre_config: string;
  costo_operativo_km: number;
  margen_minimo_aceptable: number;
  peso_margen?: number;
  peso_tiempo?: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Data Quality Types
// ============================================

export interface DataQualityMetric {
  nombre: string;
  porcentaje: number;
  estado: 'excelente' | 'bueno' | 'regular' | 'malo';
  descripcion: string;
  detalles?: string[];
}

export interface SimulacionRentabilidad {
  ingresoBruto: number;
  distanciaKm: number;
  costoOperativoKm: number;
  costoEstimado: number;
  margenNeto: number;
  horasEstimadas: number;
  scoreRentabilidad: number;
  margenPorcentaje: number;
}

