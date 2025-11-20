
import React from 'react';
import { Snapshot } from '../types';
import { Image, Clock } from 'lucide-react';

interface Props {
  snapshots: Snapshot[];
}

const SnapshotGallery: React.FC<Props> = ({ snapshots }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 h-full shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Image size={14} className="text-purple-400" /> Captured Evidence
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">{snapshots.length} RECORDS</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
        {snapshots.length === 0 ? (
          <div className="w-full h-24 bg-slate-950/50 border border-slate-800 border-dashed rounded flex items-center justify-center text-[10px] text-slate-600">
            Waiting for analysis cycle...
          </div>
        ) : (
          snapshots.map((snap) => (
            <div key={snap.id} className="snap-start shrink-0 w-32 bg-slate-950 rounded border border-slate-800 overflow-hidden group relative">
               <img src={snap.imageData} alt="Evidence" className="w-full h-20 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
               <div className="p-1.5 bg-slate-900 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold ${snap.riskScore > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                      RISK: {snap.riskScore}
                    </span>
                    <span className="text-[8px] text-slate-600 flex items-center gap-1">
                      <Clock size={8} /> {new Date(snap.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SnapshotGallery;
