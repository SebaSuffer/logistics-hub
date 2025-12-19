import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyFlowData {
  fecha: string;
  ingresos: number;
  egresos: number;
}

interface CostStructureData {
  name: string;
  value: number;
}

interface GraficoFinanzasProps {
  monthlyData: MonthlyFlowData[];
  costData: CostStructureData[];
  showBar?: boolean;
  showDoughnut?: boolean;
}

export const GraficoFinanzas: React.FC<GraficoFinanzasProps> = ({ 
  monthlyData, 
  costData,
  showBar = true,
  showDoughnut = true,
}) => {
  // Transform data for bar chart
  const barData = {
    labels: monthlyData.map(item => {
      const date = new Date(item.fecha + '-01');
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Ingresos',
        data: monthlyData.map(item => item.ingresos),
        backgroundColor: '#2dd4bf', // Teal
        borderRadius: 2,
      },
      {
        label: 'Egresos',
        data: monthlyData.map(item => item.egresos),
        backgroundColor: '#fb7185', // Rose
        borderRadius: 2,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value / 1000 + 'k';
          },
          font: {
            size: 10,
          },
          color: '#94A3B8',
        },
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#94A3B8',
        },
      },
    },
    plugins: {
      legend: {
        position: 'right' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'rect' as const,
          color: '#94A3B8',
        },
      },
    },
  };

  // Calculate percentages for doughnut chart
  const totalCost = costData.reduce((sum, item) => sum + item.value, 0);
  const doughnutData = {
    labels: costData.map(item => item.name),
    datasets: [
      {
        data: costData.map(item => item.value),
        backgroundColor: ['#7dd3fc', '#fcd34d', '#fca5a5'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '40%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : 0;
            return `${label}: $${value.toLocaleString('es-CL')} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (showBar && !showDoughnut) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-6 text-slate-200">Comparativa Ingresos vs Egresos (Mensual)</h3>
        <div className="relative h-64 w-full">
          {monthlyData.length > 0 ? (
            <Bar data={barData} options={barOptions} />
          ) : (
            <p className="text-slate-400 text-center py-8">Sin datos para graficar.</p>
          )}
        </div>
      </div>
    );
  }

  if (showDoughnut && !showBar) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm flex flex-col">
        <h3 className="text-sm font-semibold mb-6 text-slate-200">Desglose de Gastos Operativos</h3>
        <div className="relative h-64 w-full flex justify-center items-center flex-1">
          {costData.length > 0 ? (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          ) : (
            <p className="text-slate-400 text-center py-8">Sin costos registrados.</p>
          )}
        </div>
        {costData.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
            {costData.map((item, idx) => {
              const colors = ['#7dd3fc', '#fcd34d', '#fca5a5'];
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx] }}></span>
                  {item.name}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {showBar && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-6 text-slate-200">Comparativa Ingresos vs Egresos (Mensual)</h3>
          <div className="relative h-64 w-full">
            {monthlyData.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <p className="text-slate-400 text-center py-8">Sin datos para graficar.</p>
            )}
          </div>
        </div>
      )}

      {showDoughnut && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-6 text-slate-200">Desglose de Gastos Operativos</h3>
          <div className="relative h-64 w-full flex justify-center items-center flex-1">
            {costData.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <p className="text-slate-400 text-center py-8">Sin costos registrados.</p>
            )}
          </div>
          {costData.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
              {costData.map((item, idx) => {
                const colors = ['#7dd3fc', '#fcd34d', '#fca5a5'];
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx] }}></span>
                    {item.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
