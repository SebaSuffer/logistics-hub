import React, { useState } from 'react';
import type { FinancialConfig } from '../../utils/finanzas';

interface ConfigPanelProps {
  config: FinancialConfig;
  onConfigChange: (config: FinancialConfig) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onConfigChange(localConfig);
    setExpanded(false);
  };

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center mb-2 px-2 text-slate-200 font-semibold">
        <span className="material-icons-outlined text-sm mr-2">settings</span>
        Configuración
      </div>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2 mt-2 text-sm font-medium rounded-md border border-slate-700 text-slate-400 hover:bg-slate-700 cursor-pointer"
      >
        <div className="flex items-center">
          <span className="material-icons-outlined text-sm mr-2 text-yellow-500">paid</span>
          Costos & Variables
        </div>
        <span className="material-icons-outlined text-xs">{expanded ? 'expand_less' : 'chevron_right'}</span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Pago Chofer por Vuelta ($)
            </label>
            <input
              type="number"
              value={localConfig.pagoChoferPorVuelta}
              onChange={(e) => setLocalConfig({ ...localConfig, pagoChoferPorVuelta: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Costo Previred Mensual ($)
            </label>
            <input
              type="number"
              value={localConfig.costoPrevired}
              onChange={(e) => setLocalConfig({ ...localConfig, costoPrevired: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              step="1000"
            />
            <p className="text-xs text-slate-500 mt-1">Gasto fijo mensual por tener al chofer contratado.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              % Recuperación IVA Petróleo
            </label>
            <input
              type="number"
              value={localConfig.ivaPetroleo * 100}
              onChange={(e) => setLocalConfig({ ...localConfig, ivaPetroleo: Number(e.target.value) / 100 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200"
              min="0"
              max="100"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Guardar Configuración
          </button>
        </div>
      )}
    </div>
  );
};

