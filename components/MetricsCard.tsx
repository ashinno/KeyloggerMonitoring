import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  colorClass?: string;
}

const MetricsCard: React.FC<Props> = ({ title, value, subValue, icon: Icon, colorClass = "text-cyan-400" }) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-3 sm:p-5 rounded-xl shadow-lg hover:border-slate-700 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="overflow-hidden">
          <p className="text-slate-500 text-[10px] sm:text-xs font-mono font-medium uppercase tracking-widest truncate">{title}</p>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1 group-hover:text-white transition-colors truncate font-mono">{value}</h4>
          {subValue && <p className="text-[10px] text-slate-600 mt-1 truncate font-mono">{subValue}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg bg-slate-950/50 border border-slate-800 group-hover:border-slate-700 transition-colors ${colorClass}`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;