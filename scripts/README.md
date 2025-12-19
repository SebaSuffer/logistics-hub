# Scripts de Data Science para LogisticsHub

## Generación de Datos Falsos

### Requisitos

```bash
pip install -r requirements.txt
```

### Configuración

Configura las variables de entorno:

```bash
export SUPABASE_URL='tu_url_de_supabase'
export SUPABASE_KEY='tu_anon_key_de_supabase'
```

O crea un archivo `.env`:

```env
SUPABASE_URL=tu_url
SUPABASE_KEY=tu_key
```

### Uso

```bash
python scripts/generate_fake_data.py
```

Este script generará:
- **500 registros** de `HISTORIAL_OPERACIONES` con datos realistas
- **30 predicciones** de ejemplo en `PREDICCIONES_CACHE`

### Características

- **Datos realistas**: Rendimientos, precios y distancias basados en distribuciones normales
- **Relaciones consistentes**: Asocia registros con camiones, conductores y viajes existentes
- **Métricas calculadas**: Genera automáticamente `rendimiento_km_l` y `costo_por_km`
- **Inserción en lotes**: Optimizado para insertar grandes volúmenes de datos

### Notas

- Los datos se generan para los últimos 6 meses por defecto
- Los odómetros se incrementan de forma realista por camión
- Los precios de combustible varían entre $1,000 y $1,500 CLP/L
- Los rendimientos oscilan entre 2.5 y 5.0 km/L

