
import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  score: number; // 0-100
}

const TrustGauge: React.FC<Props> = ({ score }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [feedbackClass, setFeedbackClass] = useState('');

  useEffect(() => {
    if (Math.abs(score - prevScore) < 0.1) return;

    if (score > prevScore) {
      // Green Pulse
      setFeedbackClass('text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] scale-105');
    } else if (score < prevScore) {
      // Red Glitch
      setFeedbackClass('text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] translate-x-[-2px]');
      setTimeout(() => setFeedbackClass('text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] translate-x-[2px]'), 50);
      setTimeout(() => setFeedbackClass('text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] translate-x-[-2px]'), 100);
    }

    const timer = setTimeout(() => {
      setFeedbackClass('');
      setPrevScore(score);
    }, 300);

    return () => clearTimeout(timer);
  }, [score, prevScore]);

  const getColor = (s: number) => {
    if (s > 80) return 'text-emerald-400 stroke-emerald-400';
    if (s > 40) return 'text-yellow-400 stroke-yellow-400';
    return 'text-red-500 stroke-red-500';
  };

  const getStatusText = (s: number) => {
    if (s > 80) return 'SECURE';
    if (s > 40) return 'ANALYZING';
    return 'COMPROMISED';
  };

  const baseColorClass = getColor(score);
  const displayClass = feedbackClass || baseColorClass;
  
  // SVG Dimensions
  const size = 140;
  const center = size / 2;
  const radius = 58;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800 shadow-lg overflow-hidden group h-full">
      
      {/* Ambient Background Glow */}
      <div className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000 ${score > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      
      {/* Top Status Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 flex justify-center">
          <div className={`h-full transition-all duration-500 ${score > 50 ? 'w-1/3 bg-emerald-500/50' : 'w-2/3 bg-red-500/50 animate-pulse'}`}></div>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Outer Track (Dashed) */}
          <circle
            className="text-slate-800"
            strokeWidth="2"
            strokeDasharray="4 4"
            stroke="currentColor"
            fill="transparent"
            r={radius + 8}
            cx={center}
            cy={center}
          />

          {/* Inner Track (Solid) */}
          <circle
            className="text-slate-800/50"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />

          {/* Progress Ring */}
          <circle
            className={`${displayClass} transition-all duration-700 ease-out drop-shadow-[0_0_4px_currentColor]`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className={`mb-1 transition-colors duration-300 ${displayClass}`}>
             {score > 80 ? <ShieldCheck size={24} /> : score > 40 ? <Shield size={24} /> : <ShieldAlert size={24} />}
          </div>
          <span className={`text-3xl font-bold font-mono tracking-tighter ${displayClass} drop-shadow-md`}>
            {Math.round(score)}%
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-1 ${score > 50 ? 'text-slate-400' : 'text-red-400 animate-pulse'}`}>
             {getStatusText(score)}
          </span>
        </div>
      </div>

      {/* Footer Info */}
       <div className="mt-2 text-center z-10">
         <h4 className="text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            Identity Trust
            <span className={`block w-1.5 h-1.5 rounded-full ${score > 80 ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`}></span>
         </h4>
      </div>
    </div>
  );
};

export default TrustGauge;
