"""
Script para generar datos falsos realistas para entrenamiento y desarrollo
Arquitectura "Silent Logger & Simulator"

Uso:
    python scripts/generate_fake_data.py

Requisitos:
    pip install supabase pandas numpy faker
"""

import os
import random
from datetime import datetime, timedelta
from typing import List, Dict
import pandas as pd
import numpy as np
from faker import Faker
from supabase import create_client, Client

# Configuración
SUPABASE_URL = os.getenv('SUPABASE_URL', 'YOUR_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'YOUR_SUPABASE_ANON_KEY')

fake = Faker('es_CL')  # Español de Chile

def get_supabase_client() -> Client:
    """Crea cliente de Supabase"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_historial_operaciones(
    client: Client,
    num_registros: int = 500,
    fecha_inicio: datetime = None,
    fecha_fin: datetime = None
) -> List[Dict]:
    """
    Genera registros de HISTORIAL_OPERACIONES realistas
    
    Parámetros:
    - num_registros: Cantidad de registros a generar
    - fecha_inicio: Fecha inicial (default: 6 meses atrás)
    - fecha_fin: Fecha final (default: hoy)
    """
    if fecha_inicio is None:
        fecha_inicio = datetime.now() - timedelta(days=180)
    if fecha_fin is None:
        fecha_fin = datetime.now()
    
    # Obtener camiones, conductores y viajes existentes
    camiones = client.table('CAMIONES').select('id_camion').execute().data
    conductores = client.table('CONDUCTORES').select('id_conductor').execute().data
    viajes = client.table('VIAJES').select('id_viaje, fecha, id_ruta').execute().data
    
    if not camiones:
        print("⚠️  No hay camiones en la BD. Generando IDs ficticios...")
        camiones = [{'id_camion': i} for i in range(1, 6)]
    
    if not conductores:
        print("⚠️  No hay conductores en la BD. Generando IDs ficticios...")
        conductores = [{'id_conductor': i} for i in range(1, 4)]
    
    registros = []
    odometros_base = {c['id_camion']: random.randint(50000, 200000) for c in camiones}
    
    # Parámetros realistas
    rendimientos_km_l = np.random.normal(3.5, 0.5, num_registros)  # 3.0 - 4.0 km/L típico
    precios_litro = np.random.normal(1200, 100, num_registros)  # $1100 - $1300 CLP/L
    
    for i in range(num_registros):
        camion = random.choice(camiones)
        conductor = random.choice(conductores) if conductores else None
        
        # Fecha aleatoria en el rango
        fecha = fecha_inicio + timedelta(
            seconds=random.randint(0, int((fecha_fin - fecha_inicio).total_seconds()))
        )
        
        # Odómetro: incremento realista (50-500 km por carga)
        odometro_anterior = odometros_base[camion['id_camion']]
        distancia = random.randint(50, 500)
        odometro_actual = odometro_anterior + distancia
        
        # Litros cargados basado en rendimiento
        rendimiento = max(2.5, min(5.0, rendimientos_km_l[i]))
        litros_cargados = round(distancia / rendimiento, 2)
        
        # Precio y costo
        precio_litro = max(1000, min(1500, precios_litro[i]))
        costo_combustible = int(litros_cargados * precio_litro)
        
        # Calcular métricas
        rendimiento_calculado = round(distancia / litros_cargados, 2) if litros_cargados > 0 else None
        costo_por_km = round(costo_combustible / distancia, 2) if distancia > 0 else None
        
        # Horas estimadas (basado en distancia, velocidad promedio 60 km/h)
        horas_viaje = round(distancia / 60, 2)
        
        # Asociar con viaje si existe uno cercano en fecha
        viaje_id = None
        if viajes:
            viajes_cercanos = [
                v for v in viajes 
                if abs((datetime.fromisoformat(v['fecha'].replace('Z', '+00:00')) - fecha).days) <= 1
            ]
            if viajes_cercanos:
                viaje_id = random.choice(viajes_cercanos)['id_viaje']
        
        registro = {
            'fecha': fecha.isoformat(),
            'id_camion': camion['id_camion'],
            'id_conductor': conductor['id_conductor'] if conductor else None,
            'id_viaje': viaje_id,
            'odometro_anterior': odometro_anterior,
            'odometro_actual': odometro_actual,
            'litros_cargados': litros_cargados,
            'costo_combustible': costo_combustible,
            'precio_litro': round(precio_litro, 2),
            'rendimiento_km_l': rendimiento_calculado,
            'costo_por_km': costo_por_km,
            'horas_viaje': horas_viaje,
            'tipo_operacion': 'CARGA_COMBUSTIBLE',
            'ubicacion_carga': random.choice([
                'Santiago', 'Valparaíso', 'Concepción', 'Temuco', 
                'Puerto Montt', 'Iquique', 'Antofagasta'
            ]),
            'observaciones': random.choice([
                None,
                'Carga completa',
                'Carga parcial',
                'Revisión técnica realizada',
                None,
                None  # Más probabilidad de None
            ])
        }
        
        registros.append(registro)
        odometros_base[camion['id_camion']] = odometro_actual
    
    return registros

def insert_batch(client: Client, table: str, data: List[Dict], batch_size: int = 100):
    """Inserta datos en lotes para mejor rendimiento"""
    total = len(data)
    inserted = 0
    
    for i in range(0, total, batch_size):
        batch = data[i:i + batch_size]
        try:
            result = client.table(table).insert(batch).execute()
            inserted += len(batch)
            print(f"✅ Insertados {inserted}/{total} registros en {table}")
        except Exception as e:
            print(f"❌ Error insertando lote {i//batch_size + 1}: {e}")
            # Intentar insertar uno por uno para identificar el problema
            for item in batch:
                try:
                    client.table(table).insert(item).execute()
                    inserted += 1
                except Exception as item_error:
                    print(f"   Error con registro: {item_error}")

def main():
    """Función principal"""
    print("🚀 Generando datos falsos realistas para LogisticsHub")
    print("=" * 60)
    
    # Verificar variables de entorno
    if SUPABASE_URL == 'YOUR_SUPABASE_URL' or SUPABASE_KEY == 'YOUR_SUPABASE_ANON_KEY':
        print("❌ Error: Configura SUPABASE_URL y SUPABASE_KEY como variables de entorno")
        print("   export SUPABASE_URL='tu_url'")
        print("   export SUPABASE_KEY='tu_key'")
        return
    
    client = get_supabase_client()
    
    # 1. Generar HISTORIAL_OPERACIONES
    print("\n📊 Generando HISTORIAL_OPERACIONES...")
    historial = generate_historial_operaciones(client, num_registros=500)
    
    print(f"   Generados {len(historial)} registros")
    print("   Insertando en base de datos...")
    
    # Limpiar datos existentes (opcional, comentar si quieres conservar)
    # print("   ⚠️  Limpiando datos existentes...")
    # client.table('HISTORIAL_OPERACIONES').delete().neq('id_operacion', 0).execute()
    
    insert_batch(client, 'HISTORIAL_OPERACIONES', historial)
    
    # 2. Generar PREDICCIONES_CACHE (opcional, con valores deterministas)
    print("\n🔮 Generando PREDICCIONES_CACHE (deterministas)...")
    
    # Obtener rutas y camiones
    rutas = client.table('RUTAS').select('id_ruta').execute().data
    camiones = client.table('CAMIONES').select('id_camion').execute().data
    
    if rutas and camiones:
        predicciones = []
        fecha_base = datetime.now()
        
        for i in range(30):  # 30 días de predicciones
            fecha = fecha_base + timedelta(days=i)
            ruta = random.choice(rutas)
            camion = random.choice(camiones)
            
            # Predicción determinista simple
            consumo_predicho = random.uniform(2.8, 4.2)  # km/L
            costo_predicho = random.randint(50000, 200000)  # Costo de viaje
            
            predicciones.append({
                'fecha_prediccion': datetime.now().isoformat(),
                'fecha_aplicable': fecha.date().isoformat(),
                'tipo_prediccion': 'CONSUMO_COMBUSTIBLE',
                'id_camion': camion['id_camion'],
                'id_ruta': ruta['id_ruta'],
                'valor_predicho': round(consumo_predicho, 2),
                'confianza': round(random.uniform(75, 95), 2),
                'modelo_version': 'v1.0.0',
                'modelo_tipo': 'Deterministic',
                'features_usadas': {
                    'ruta_km': random.randint(100, 500),
                    'camion_antiguedad': random.randint(1, 10)
                }
            })
        
        insert_batch(client, 'PREDICCIONES_CACHE', predicciones)
    
    print("\n✅ Generación de datos completada!")
    print("\n📝 Próximos pasos:")
    print("   1. Revisa el 'Centro de Datos' en el dashboard")
    print("   2. Prueba el 'Simulador de Rentabilidad'")
    print("   3. Cuando tengas datos reales, borra estos datos falsos")

if __name__ == '__main__':
    main()

