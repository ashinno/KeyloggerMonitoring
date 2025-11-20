
import React, { useEffect, useState } from 'react';
import { AppWindow, EyeOff, Eye, Layers } from 'lucide-react';

const WindowTracker: React.FC = () => {
  const [isFocused, setIsFocused] = useState(true);
  const [lastEventTime, setLastEventTime] = useState(Date.now());

  useEffect(() => {
    const onBlur = () => {
      setIsFocused(false);
      setLastEventTime(Date.now());
    };
    const onFocus = () => {
      setIsFocused(true);
      setLastEventTime(Date.now());
    };
    const onVisibilityChange = () => {
      setIsFocused(document.visibilityState === 'visible');
      setLastEventTime(Date.now());
    };

    // Check initial state
    setIsFocused(document.visibilityState === 'visible' && document.hasFocus());

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg h-full overflow-hidden group">
       {/* Ambient Glow */}
       <div className={`absolute inset-0 opacity-5 pointer-events-none transition-colors duration-500 ${isFocused ? 'bg-cyan-500' : 'bg-orange-500'}`}></div>
       
       {/* Header */}
       <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-2">
             <Layers size={14} className="text-slate-500" />
             <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Environment</h3>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isFocused ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-orange-500 animate-pulse'}`}></div>
       </div>

       {/* Main Status */}
       <div className="flex items-center gap-3 my-2 z-10">
          <div className={`p-2.5 rounded-md border transition-all duration-300 ${isFocused ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-orange-950/50 border-orange-500/30 text-orange-400'}`}>
            <AppWindow size={24} strokeWidth={1.5} />
          </div>
          <div>
             <div className={`text-lg font-mono font-bold tracking-tight transition-colors duration-300 ${isFocused ? 'text-white' : 'text-slate-400'}`}>
                {isFocused ? "FOCUSED" : "BLURRED"}
             </div>
             <div className="flex items-center gap-1.5">
                {isFocused ? <Eye size={10} className="text-cyan-500" /> : <EyeOff size={10} className="text-orange-500" />}
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">{isFocused ? "Monitoring Active" : "Input Suspended"}</span>
             </div>
          </div>
       </div>

       {/* Footer / Timestamp */}
       <div className="border-t border-slate-800/50 pt-2 mt-1 z-10 flex justify-between items-center">
          <span className="text-[9px] text-slate-600 font-mono uppercase">PID: {Math.floor(Math.random() * 9000) + 1000}</span>
          <span className="text-[10px] text-slate-400 font-mono">{new Date(lastEventTime).toLocaleTimeString()}</span>
       </div>
    </div>
  );
};

export default WindowTracker;
