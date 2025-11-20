
import React from 'react';
import { ActivityLog } from '../types';
import { ShieldAlert, ShieldCheck, Activity, Terminal } from 'lucide-react';

interface Props {
  logs: ActivityLog[];
}

const AIAnalysis: React.FC<Props> = ({ logs }) => {
  const latest = logs[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        <Terminal className="text-purple-400" size={18} />
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Intelligence Log</h3>
      </div>

      {/* Latest Status Highlight */}
      {latest ? (
         <div className="mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800 relative overflow-hidden">
             <div className={`absolute left-0 top-0 bottom-0 w-1 ${latest.riskScore > 50 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
             <div className="flex justify-between items-start mb-2">
                 <h4 className="text-slate-400 text-xs uppercase font-bold">Current Status</h4>
                 <span className={`text-xs font-mono px-2 py-0.5 rounded ${latest.riskScore > 50 ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    RISK: {latest.riskScore}/100
                 </span>
             </div>
             <div className="text-xl font-bold text-white mb-1">{latest.activity}</div>
             <p className="text-slate-400 text-sm leading-snug">{latest.description}</p>
             <div className="mt-3 flex gap-2 text-xs font-mono text-slate-500">
                 <span>FOCUS: <span className="text-cyan-400">{latest.focusLevel}</span></span>
             </div>
         </div>
      ) : (
        <div className="mb-6 bg-slate-950 p-6 rounded-lg border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-600">
            <Activity className="mb-2 opacity-50" />
            <span className="text-xs uppercase">Waiting for data stream...</span>
        </div>
      )}

      {/* Log History */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {logs.slice(1).map((log, idx) => (
            <div key={idx} className="flex gap-3 text-sm border-l border-slate-800 pl-3 py-1 hover:bg-slate-800/30 transition-colors">
                <div className="mt-1 min-w-[16px]">
                    {log.riskScore > 50 
                        ? <ShieldAlert size={14} className="text-red-500" /> 
                        : <ShieldCheck size={14} className="text-slate-600" />
                    }
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-medium">{log.activity}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-500 text-xs truncate max-w-[200px]">{log.description}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AIAnalysis;
