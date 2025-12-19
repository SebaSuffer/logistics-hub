import React from 'react';

interface KpiCardProps {
  title: string;
  icon: string;
  value: string | number;
  subtext?: string;
  colorIcon?: string;
  trendPositive?: boolean;
  badgeColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  icon,
  value,
  subtext = '',
  colorIcon = '#3B82F6',
  trendPositive = true,
  badgeColor,
}) => {
  const defaultBadgeColor = trendPositive
    ? 'bg-green-500/20 text-green-400'
    : 'bg-red-500/20 text-red-400';
  
  const badgeClass = badgeColor || defaultBadgeColor;
  const iconTrend = trendPositive ? 'arrow_upward' : 'arrow_downward';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-icons-outlined text-sm" style={{ color: colorIcon }}>
          {icon}
        </span>
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {title === 'Egresos Totales' || title === 'IVA Recuperado' ? (
          <span className="material-icons-outlined text-xs text-slate-500 cursor-help">help_outline</span>
        ) : null}
      </div>
      <div className="text-3xl font-bold mb-2 text-slate-50">
        {typeof value === 'number' 
          ? (value < 0 ? '-' : '') + '$' + Math.abs(value).toLocaleString('es-CL', { maximumFractionDigits: 0 })
          : value}
      </div>
      {subtext && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
          <span className="material-icons-outlined text-xs mr-1">
            {iconTrend}
          </span>
          {subtext}
        </span>
      )}
    </div>
  );
};

