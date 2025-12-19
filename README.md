# LogisticsHub - Sistema ERP Logístico

Sistema ERP completo para gestión logística y transporte, migrado desde Streamlit (Python) a Astro + React + TypeScript.

## 🚀 Características

- **Dashboard Financiero**: Visualización de KPIs, flujo de caja y estructura de costos
- **Gestión de Viajes**: Historial completo con edición y eliminación masiva
- **Gestión de Flota**: Control de camiones y conductores
- **Gestión de Clientes**: Base de datos de clientes con alias y contacto
- **Gestión de Rutas**: Rutas físicas con métricas de rendimiento (km/L, costo/km)
- **Subida de Archivos Excel**: Importación automática de viajes y gastos (Formatos TOBAR y COSIO)
- **Inteligencia de Negocio**:
  - **Centro de Datos**: Validación de calidad de datos con semáforos
  - **Simulador de Rentabilidad**: Cálculo de Score de Rentabilidad y escenarios "¿Qué pasa si...?"
- **Autenticación**: Integración con Supabase Auth

## 🛠️ Stack Tecnológico

- **Framework**: Astro v5
- **UI**: React + TypeScript
- **Estilos**: TailwindCSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Gráficos**: Chart.js (react-chartjs-2)
- **Excel**: SheetJS (xlsx)
- **Fechas**: date-fns

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🔧 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/logistics-hub.git
cd logistics-hub
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
Crea un archivo `.env` en la raíz del proyecto:
```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

4. Configura la base de datos:
Ejecuta el script SQL `create_data_science_tables.sql` en el SQL Editor de Supabase para crear las tablas necesarias.

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:4321`

## 📊 Estructura del Proyecto

```
/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes React
│   │   ├── auth/       # Autenticación
│   │   ├── dashboard/  # Componentes del dashboard
│   │   ├── forms/      # Formularios
│   │   └── layout/     # Layout y navegación
│   ├── lib/            # Librerías (Supabase client)
│   ├── pages/          # Páginas de Astro/React
│   ├── styles/         # Estilos globales
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilidades (finanzas, Excel parser)
├── scripts/            # Scripts Python para Data Science
└── create_data_science_tables.sql  # Setup de BD
```

## 🗄️ Base de Datos

El sistema utiliza las siguientes tablas principales en Supabase:

- `CLIENTE`: Clientes con alias y contacto
- `CAMIONES`: Flota de vehículos
- `CONDUCTORES`: Conductores
- `RUTAS`: Rutas físicas con métricas de rendimiento
- `VIAJES`: Historial de viajes
- `GASTOS`: Gastos operativos
- `TARIFAS`: Tarifas por cliente
- `HISTORIAL_OPERACIONES`: Registro de operaciones para Data Science
- `PREDICCIONES_CACHE`: Cache de predicciones de modelos
- `CONFIGURACION_MODELOS`: Configuración de parámetros

## 🚀 Despliegue en Vercel

1. Conecta tu repositorio de GitHub a Vercel
2. Configura las variables de entorno en Vercel:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Vercel detectará automáticamente Astro y desplegará el proyecto

## 📝 Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run preview`: Preview del build local
- `npm run astro ...`: Comandos CLI de Astro

## 🧠 Arquitectura Data Science

El sistema está preparado para Data Science con la arquitectura "Silent Logger & Simulator":

- **Fase 1 (Actual)**: Fórmulas deterministas para métricas de rentabilidad
- **Fase 2 (Futuro)**: Recolección silenciosa de datos operativos
- **Fase 3 (Futuro)**: Entrenamiento de modelos ML (XGBoost, etc.)

Ver `ARQUITECTURA_DATA_SCIENCE.md` para más detalles.

## 📄 Licencia

Este proyecto es privado.

## 👤 Autor

Desarrollado para gestión logística y transporte.
