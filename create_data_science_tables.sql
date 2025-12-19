-- ============================================
-- Arquitectura "Silent Logger & Simulator"
-- Tablas para Data Science en LogisticsHub
-- ============================================

-- ============================================
-- TABLA 1: HISTORIAL_OPERACIONES
-- ============================================
-- Almacena datos crudos de operaciones diarias
-- (odometros, cargas de combustible, tiempos, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS "HISTORIAL_OPERACIONES" (
  id_operacion SERIAL PRIMARY KEY,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Relaciones
  id_camion INTEGER REFERENCES "CAMIONES"(id_camion) ON DELETE SET NULL,
  id_conductor INTEGER REFERENCES "CONDUCTORES"(id_conductor) ON DELETE SET NULL,
  id_viaje INTEGER REFERENCES "VIAJES"(id_viaje) ON DELETE SET NULL,
  
  -- Datos de Odómetro
  odometro_actual INTEGER NOT NULL,
  odometro_anterior INTEGER, -- Para calcular distancia recorrida
  
  -- Datos de Combustible
  litros_cargados NUMERIC(8,2), -- Litros de combustible cargados
  costo_combustible INTEGER, -- Costo total de la carga en CLP
  precio_litro NUMERIC(6,2), -- Precio por litro
  
  -- Métricas Calculadas (se calculan automáticamente)
  distancia_recorrida INTEGER GENERATED ALWAYS AS (odometro_actual - COALESCE(odometro_anterior, odometro_actual)) STORED,
  rendimiento_km_l NUMERIC(6,2), -- Calculado: distancia / litros_cargados
  costo_por_km NUMERIC(8,2), -- Calculado: costo_combustible / distancia
  
  -- Tiempos (para Score de Rentabilidad)
  horas_viaje NUMERIC(4,2), -- Horas estimadas del viaje
  tiempo_real NUMERIC(4,2), -- Tiempo real si está disponible
  
  -- Metadatos
  observaciones TEXT,
  ubicacion_carga TEXT, -- Dónde se cargó el combustible
  tipo_operacion VARCHAR(50) DEFAULT 'CARGA_COMBUSTIBLE', -- CARGA_COMBUSTIBLE, INICIO_VIAJE, FIN_VIAJE, etc.
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON "HISTORIAL_OPERACIONES"(fecha);
CREATE INDEX IF NOT EXISTS idx_historial_camion ON "HISTORIAL_OPERACIONES"(id_camion);
CREATE INDEX IF NOT EXISTS idx_historial_viaje ON "HISTORIAL_OPERACIONES"(id_viaje);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON "HISTORIAL_OPERACIONES"(tipo_operacion);

-- Comentarios
COMMENT ON TABLE "HISTORIAL_OPERACIONES" IS 'Registro histórico de operaciones diarias para análisis de rendimiento y entrenamiento de modelos';
COMMENT ON COLUMN "HISTORIAL_OPERACIONES"."rendimiento_km_l" IS 'Rendimiento físico: (Odómetro Actual - Odómetro Anterior) / Litros Cargados';
COMMENT ON COLUMN "HISTORIAL_OPERACIONES"."costo_por_km" IS 'Rendimiento económico: Costo Total / Distancia Recorrida';
COMMENT ON COLUMN "HISTORIAL_OPERACIONES"."horas_viaje" IS 'Horas estimadas del viaje para cálculo de Score de Rentabilidad';

-- ============================================
-- TABLA 2: PREDICCIONES_CACHE
-- ============================================
-- Almacena resultados de modelos de IA
-- (predicciones de consumo, costos, rentabilidad)
-- ============================================

CREATE TABLE IF NOT EXISTS "PREDICCIONES_CACHE" (
  id_prediccion SERIAL PRIMARY KEY,
  fecha_prediccion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_aplicable DATE NOT NULL, -- Para qué fecha es la predicción
  
  -- Tipo de predicción
  tipo_prediccion VARCHAR(50) NOT NULL, -- CONSUMO_COMBUSTIBLE, COSTO_VIAJE, RENTABILIDAD, etc.
  
  -- Contexto de la predicción
  id_camion INTEGER REFERENCES "CAMIONES"(id_camion) ON DELETE SET NULL,
  id_ruta INTEGER REFERENCES "RUTAS"(id_ruta) ON DELETE SET NULL,
  id_cliente INTEGER REFERENCES "CLIENTE"(id_cliente) ON DELETE SET NULL,
  
  -- Valores predichos
  valor_predicho NUMERIC(12,2) NOT NULL,
  valor_real NUMERIC(12,2), -- Se llena cuando se conoce el valor real
  confianza NUMERIC(4,2), -- 0-100, nivel de confianza del modelo
  
  -- Metadatos del modelo
  modelo_version VARCHAR(50), -- Versión del modelo usado (ej: "v1.2.3")
  modelo_tipo VARCHAR(50), -- "XGBoost", "Linear Regression", "Deterministic", etc.
  features_usadas JSONB, -- Qué variables usó el modelo
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_predicciones_fecha ON "PREDICCIONES_CACHE"(fecha_aplicable);
CREATE INDEX IF NOT EXISTS idx_predicciones_tipo ON "PREDICCIONES_CACHE"(tipo_prediccion);
CREATE INDEX IF NOT EXISTS idx_predicciones_camion ON "PREDICCIONES_CACHE"(id_camion);

COMMENT ON TABLE "PREDICCIONES_CACHE" IS 'Cache de predicciones de modelos de IA para evitar recalcular en cada request';
COMMENT ON COLUMN "PREDICCIONES_CACHE"."tipo_prediccion" IS 'Tipos: CONSUMO_COMBUSTIBLE, COSTO_VIAJE, RENTABILIDAD, TIEMPO_VIAJE';
COMMENT ON COLUMN "PREDICCIONES_CACHE"."modelo_tipo" IS 'Tipo de modelo: Deterministic (fórmulas), XGBoost, Linear Regression, etc.';

-- ============================================
-- TABLA 3: CONFIGURACION_MODELOS
-- ============================================
-- Configuración de modelos y parámetros
-- ============================================

CREATE TABLE IF NOT EXISTS "CONFIGURACION_MODELOS" (
  id_config SERIAL PRIMARY KEY,
  nombre_config VARCHAR(100) NOT NULL UNIQUE,
  
  -- Parámetros del modelo
  costo_operativo_km INTEGER NOT NULL DEFAULT 1200, -- Costo operativo por km (bencina + chofer + desgaste)
  margen_minimo_aceptable NUMERIC(4,2) DEFAULT 15.0, -- Margen mínimo aceptable en %
  
  -- Parámetros de Score de Rentabilidad
  peso_margen NUMERIC(3,2) DEFAULT 0.7, -- Peso del margen en el score
  peso_tiempo NUMERIC(3,2) DEFAULT 0.3, -- Peso del tiempo en el score
  
  -- Estado
  activo BOOLEAN DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO "CONFIGURACION_MODELOS" (nombre_config, costo_operativo_km, margen_minimo_aceptable)
VALUES ('Configuración Default', 1200, 15.0)
ON CONFLICT (nombre_config) DO NOTHING;

COMMENT ON TABLE "CONFIGURACION_MODELOS" IS 'Configuración de parámetros para modelos y cálculos de rentabilidad';

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_historial_updated_at
  BEFORE UPDATE ON "HISTORIAL_OPERACIONES"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predicciones_updated_at
  BEFORE UPDATE ON "PREDICCIONES_CACHE"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Resumen de rendimiento por camión
CREATE OR REPLACE VIEW "v_rendimiento_camiones" AS
SELECT 
  c.id_camion,
  c.patente,
  COUNT(DISTINCT h.id_operacion) as total_cargas,
  AVG(h.rendimiento_km_l) as rendimiento_promedio_km_l,
  AVG(h.costo_por_km) as costo_promedio_km,
  SUM(h.distancia_recorrida) as total_km,
  SUM(h.litros_cargados) as total_litros,
  SUM(h.costo_combustible) as total_costo_combustible
FROM "CAMIONES" c
LEFT JOIN "HISTORIAL_OPERACIONES" h ON c.id_camion = h.id_camion
WHERE h.tipo_operacion = 'CARGA_COMBUSTIBLE'
GROUP BY c.id_camion, c.patente;

COMMENT ON VIEW "v_rendimiento_camiones" IS 'Vista resumen de rendimiento físico y económico por camión';

