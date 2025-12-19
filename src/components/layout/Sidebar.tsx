import React from 'react';
import type { User } from '@supabase/supabase-js';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange, user, onLogout }) => {
  const modules = [
    'Dashboard',
    'Historial de Viajes',
    'Subir Archivos',
    'Gestión de Flota',
    'Conductores',
    'Clientes',
    'Rutas',
    'Tarifarios',
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-700 bg-slate-800 flex flex-col h-full overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight mb-1 text-slate-50">LogisticsHub</h1>
        <p className="text-xs text-slate-400">
          Usuario: {user?.email || user?.user_metadata?.name || 'Usuario'}
        </p>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={onLogout}
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors text-slate-200"
        >
          Cerrar Sesión
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {modules.map((module) => (
          <button
            key={module}
            onClick={() => onModuleChange(module)}
            className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeModule === module
                ? 'text-blue-400 bg-slate-800'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 mr-3 rounded-full ${
                activeModule === module
                  ? 'bg-red-500'
                  : 'bg-gray-600 group-hover:bg-gray-500'
              }`}
            ></span>
            {module}
          </button>
        ))}
      </nav>

      <div className="px-4 mt-6">
        <div className="flex items-center mb-2 px-2 text-slate-200 font-semibold">
          <span className="material-icons-outlined text-sm mr-2">settings</span>
          Configuración
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Open config modal or expand config panel
          }}
          className="flex items-center justify-between px-3 py-2 mt-2 text-sm font-medium rounded-md border border-slate-700 text-slate-400 hover:bg-slate-700"
        >
          <div className="flex items-center">
            <span className="material-icons-outlined text-sm mr-2 text-yellow-500">paid</span>
            Costos & Variables
          </div>
          <span className="material-icons-outlined text-xs">chevron_right</span>
        </a>
      </div>

      <div className="p-4 mt-auto">
        <div className="bg-blue-900/30 border border-blue-800 rounded p-3">
          <p className="text-xs font-medium text-blue-300">Sistema Operativo v10.2</p>
          <p className="text-xs text-blue-400">(ERP Full)</p>
        </div>
      </div>
    </aside>
  );
};

