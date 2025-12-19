# Arquitectura "Silent Logger & Simulator"

## 📋 Resumen

Esta arquitectura separa la **recolección de datos** (App) del **entrenamiento de modelos** (Backend), permitiendo que el sistema funcione desde el día 1 con fórmulas deterministas, y evolucione a modelos de IA cuando haya suficientes datos.

## 🏗️ Estructura

### 1. Frontend (Astro/React)

#### Dashboard - Pestaña "Inteligencia de Negocio"

**A. Centro de Datos** (`src/components/dashboard/CentroDatos.tsx`)
- **Objetivo**: Validación de calidad de datos
- **UI**: Semáforos (🟢🟡🟠🔴) que muestran el estado de los datos
- **Métricas**:
  - Completitud de datos de rutas (rendimiento, costo/km)
  - Validación de registros de operaciones
  - Viajes con rutas asignadas
  - Historial de precios de insumos

**B. Simulador de Rentabilidad** (`src/components/dashboard/SimuladorRentabilidad.tsx`)
- **Objetivo**: Toma de decisiones con "¿Qué pasa si...?"
- **Funcionalidad**:
  - Calcula Score de Rentabilidad: `S = Margen Neto / Horas Estimadas`
  - Simula escenarios (combustible sube/baja, tiempos, precios)
  - Usa fórmulas deterministas (fácil de reemplazar por IA después)

### 2. Base de Datos (Supabase)

#### Tablas Principales

**HISTORIAL_OPERACIONES**
- Registra odómetros, cargas de combustible, tiempos
- Calcula automáticamente: `rendimiento_km_l` y `costo_por_km`
- Campos clave:
  - `odometro_actual`, `odometro_anterior` → calcula distancia
  - `litros_cargados`, `costo_combustible` → calcula rendimiento
  - `horas_viaje` → para Score de Rentabilidad

**PREDICCIONES_CACHE**
- Almacena resultados de modelos de IA
- Permite cambiar de fórmulas deterministas a predicciones sin cambiar el frontend
- Campos clave:
  - `tipo_prediccion`: CONSUMO_COMBUSTIBLE, COSTO_VIAJE, RENTABILIDAD
  - `modelo_tipo`: "Deterministic" (ahora) → "XGBoost" (después)
  - `valor_predicho`, `valor_real` (para validar modelos)

**CONFIGURACION_MODELOS**
- Parámetros globales:
  - `costo_operativo_km`: Costo base por kilómetro
  - `margen_minimo_aceptable`: Margen mínimo en %
  - `peso_margen`, `peso_tiempo`: Para Score de Rentabilidad

### 3. Backend (Python Scripts)

**scripts/generate_fake_data.py**
- Genera 500 registros realistas de `HISTORIAL_OPERACIONES`
- Usa distribuciones normales para rendimientos y precios
- Mantiene consistencia (odómetros incrementales, relaciones con camiones/viajes)

## 🔄 Flujo de Trabajo

### Fase 1: Ahora (Sin Datos Reales)

1. **Ejecutar SQL**: `create_data_science_tables.sql` en Supabase
2. **Generar datos falsos**: `python scripts/generate_fake_data.py`
3. **Usar el sistema**: 
   - Ver "Centro de Datos" para validar calidad
   - Usar "Simulador" con fórmulas deterministas

### Fase 2: Recolección Silenciosa (6 meses)

- El sistema **registra automáticamente** cada vez que:
  - Se carga combustible (formulario futuro)
  - Se completa un viaje
  - Se registran gastos
- Los datos se acumulan en `HISTORIAL_OPERACIONES`
- El "Centro de Datos" muestra progreso de calidad

### Fase 3: Entrenamiento (Cuando tengas datos)

1. **Script Python** (local o GitHub Actions):
   ```python
   # Conecta a Supabase
   # Descarga HISTORIAL_OPERACIONES
   # Entrena modelo (XGBoost, etc.)
   # Sube predicciones a PREDICCIONES_CACHE
   ```

2. **Frontend no cambia**: Sigue leyendo de `PREDICCIONES_CACHE`, pero ahora con valores de IA

## 📐 Fórmulas Implementadas

### Rendimiento Físico (km/L)
```
Rendimiento = (Odómetro Actual - Odómetro Anterior) / Litros Cargados
```

### Rendimiento Económico (km/$)
```
Rendimiento = (Odómetro Actual - Odómetro Anterior) / Costo Total de la Carga
```

### Score de Rentabilidad
```
S = Margen Neto / Horas Estimadas

Donde:
- Margen Neto = Ingreso Bruto - Costo Estimado
- Costo Estimado = Distancia × Costo Operativo por Km
```

## 🎯 Ventajas de esta Arquitectura

1. **No hay "Cold Start Problem"**: El sistema funciona desde el día 1
2. **Separación de responsabilidades**: Frontend no se vuelve pesado con código de ML
3. **Evolución gradual**: Fórmulas → Modelos sin cambiar UI
4. **Validación continua**: "Centro de Datos" muestra qué falta
5. **Escalable**: Python scripts pueden correr en servidores dedicados

## 📝 Próximos Pasos

1. ✅ Ejecutar `create_data_science_tables.sql` en Supabase
2. ✅ Ejecutar `python scripts/generate_fake_data.py` para datos de prueba
3. ⏳ Crear formulario para registrar cargas de combustible (futuro)
4. ⏳ Implementar script de entrenamiento de modelos (cuando haya datos reales)
5. ⏳ Configurar GitHub Actions para entrenamiento automático (opcional)

## 🔧 Mantenimiento

### Limpiar Datos Falsos

Cuando tengas datos reales, ejecuta en Supabase:

```sql
DELETE FROM "HISTORIAL_OPERACIONES" 
WHERE created_at < '2024-01-01';  -- Ajusta la fecha
```

### Actualizar Configuración

```sql
UPDATE "CONFIGURACION_MODELOS" 
SET costo_operativo_km = 1300,  -- Nuevo costo
    margen_minimo_aceptable = 18.0
WHERE activo = true;
```

