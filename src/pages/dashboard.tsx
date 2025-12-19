import React, { useState, useEffect } from 'react';
import { KpiCard } from '../components/dashboard/KpiCard';
import { GraficoFinanzas } from '../components/dashboard/GraficoFinanzas';
import { ConfigPanel } from '../components/layout/ConfigPanel';
import { CentroDatos } from '../components/dashboard/CentroDatos';
import { SimuladorRentabilidad } from '../components/dashboard/SimuladorRentabilidad';
import { getFinancialData, getMonthlyFlow, type FinancialConfig } from '../utils/finanzas';

export default function Dashboard() {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [config, setConfig] = useState<FinancialConfig>({
    pagoChoferPorVuelta: 10000,
    costoPrevired: 106012,
    ivaPetroleo: 0.19,
  });
  const [financialData, setFinancialData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'flow' | 'costs' | 'table'>('costs');
  const [activeSection, setActiveSection] = useState<'finanzas' | 'inteligencia'>('finanzas');
  const [inteligenciaTab, setInteligenciaTab] = useState<'centro-datos' | 'simulador'>('centro-datos');

  useEffect(() => {
    loadData();
  }, [year, month, config]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [financial, monthly] = await Promise.all([
        getFinancialData(year, month, config),
        getMonthlyFlow(year, month),
      ]);
      setFinancialData(financial);
      setMonthlyData(monthly);
      
      // Extract available years from monthly data
      const years = [...new Set(monthly.map(m => parseInt(m.fecha.split('-')[0])))].sort((a, b) => b - a);
      setAvailableYears(years);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const costData = financialData ? [
    { name: 'Chofer (Sueldo+Bonos)', value: financialData.costoChofer },
    { name: 'Combustible (Neto)', value: financialData.petroleoReal },
    { name: 'Otros', value: financialData.otros },
  ].filter(item => item.value > 0) : [];

  const filterText = year 
    ? month 
      ? `Año ${year}, ${meses[month - 1]}`
      : `Año ${year}`
    : 'Todos los datos';

  return (
    <main className="flex-1 overflow-y-auto h-full p-6 lg:p-8 bg-slate-900">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6 text-slate-50">
          <span className="text-3xl">📊</span>
          Tablero de Control Logístico
          <span className="material-icons-outlined text-lg text-slate-400 cursor-pointer">link</span>
        </h1>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="material-icons-outlined text-blue-400">calendar_month</span>
          <h2 className="text-xl font-semibold text-slate-50">Filtros de Tiempo</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="year">Año</label>
            <div className="relative">
              <select
                id="year"
                value={year || ''}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none w-full bg-slate-800 border border-slate-700 text-slate-200 rounded py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                </svg>
              </div>
            </div>
          </div>
          
          {year && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="month">Mes</label>
              <div className="relative">
                <select
                  id="month"
                  value={month || ''}
                  onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
                  className="appearance-none w-full bg-slate-800 border border-slate-700 text-slate-200 rounded py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {meses.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <p className="mt-2 text-xs text-slate-400">Mostrando datos de: {filterText}</p>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando datos...</div>
      ) : (
        <>
          {financialData && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                <KpiCard
                  title="Utilidad Neta"
                  icon="paid"
                  value={Math.round(financialData.utilidad)}
                  subtext={`Margen ${financialData.margen.toFixed(1)}%`}
                  colorIcon="#F59E0B"
                  trendPositive={financialData.utilidad > 0}
                />
                <KpiCard
                  title="Viajes Realizados"
                  icon="local_shipping"
                  value={financialData.totalViajes}
                  subtext=""
                  colorIcon="#10B981"
                />
                <KpiCard
                  title="Egresos Totales"
                  icon="payments"
                  value={Math.round(financialData.egresosTotales)}
                  subtext=""
                  colorIcon="#10B981"
                />
                <KpiCard
                  title="IVA Recuperado"
                  icon="receipt_long"
                  value={Math.round(financialData.ivaRecuperado)}
                  subtext=""
                  colorIcon="#EF4444"
                />
              </section>

              {financialData.rendimientoKmL && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <KpiCard
                    title="Rendimiento Promedio"
                    icon="speed"
                    value={financialData.rendimientoKmL.toFixed(1)}
                    subtext="km/L"
                    colorIcon="#3B82F6"
                  />
                  {financialData.costoPorKm && (
                    <KpiCard
                      title="Costo por Kilómetro"
                      icon="attach_money"
                      value={Math.round(financialData.costoPorKm)}
                      subtext="pesos/km"
                      colorIcon="#8B5CF6"
                    />
                  )}
                  {financialData.totalKm && (
                    <KpiCard
                      title="Kilómetros Totales"
                      icon="straighten"
                      value={financialData.totalKm.toLocaleString('es-CL')}
                      subtext="km recorridos"
                      colorIcon="#EC4899"
                    />
                  )}
                </section>
              )}
            </>
          )}

          {/* Sección principal: Finanzas o Inteligencia */}
          <section className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-blue-400">trending_up</span>
                <h2 className="text-xl font-semibold text-slate-50">Análisis</h2>
              </div>
              
              {/* Tabs de sección principal */}
              <div className="flex gap-2 border-b border-slate-700">
                <button
                  onClick={() => setActiveSection('finanzas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeSection === 'finanzas'
                      ? 'text-blue-400 border-blue-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  📊 Finanzas
                </button>
                <button
                  onClick={() => setActiveSection('inteligencia')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeSection === 'inteligencia'
                      ? 'text-blue-400 border-blue-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  🧠 Inteligencia de Negocio
                </button>
              </div>
            </div>

            {activeSection === 'finanzas' && (
              <>
                <div className="flex space-x-1 border-b border-slate-700 mb-6">
              <button
                onClick={() => setActiveTab('flow')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'flow'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Flujo de Caja
                </div>
              </button>
              <button
                onClick={() => setActiveTab('costs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'costs'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Estructura de Costos
                </div>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'table'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-icons-outlined text-sm">description</span>
                  Detalle (Tabla)
                </div>
              </button>
            </div>

            {activeTab === 'flow' && (
              <GraficoFinanzas monthlyData={monthlyData} costData={[]} showBar={true} showDoughnut={false} />
            )}

            {activeTab === 'costs' && (
              <GraficoFinanzas monthlyData={[]} costData={costData} showBar={false} showDoughnut={true} />
            )}

            {activeTab === 'table' && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
                <p className="text-slate-400 text-sm">Vista de tabla detallada (por implementar)</p>
              </div>
            )}
              </>
            )}

            {activeSection === 'inteligencia' && (
              <>
                {/* Tabs de Inteligencia de Negocio */}
                <div className="flex space-x-1 border-b border-slate-700 mb-6">
                  <button
                    onClick={() => setInteligenciaTab('centro-datos')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      inteligenciaTab === 'centro-datos'
                        ? 'text-blue-400 border-blue-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      Centro de Datos
                    </div>
                  </button>
                  <button
                    onClick={() => setInteligenciaTab('simulador')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      inteligenciaTab === 'simulador'
                        ? 'text-blue-400 border-blue-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔮</span>
                      Simulador de Rentabilidad
                    </div>
                  </button>
                </div>

                {inteligenciaTab === 'centro-datos' && <CentroDatos />}
                {inteligenciaTab === 'simulador' && <SimuladorRentabilidad />}
              </>
            )}
          </section>

          {financialData && (
            <footer className="mt-8 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                • Nota: El costo 'Chofer' incluye Previred y bonos por vuelta. El combustible descuenta el IVA.
              </p>
            </footer>
          )}
        </>
      )}
    </main>
  );
}

