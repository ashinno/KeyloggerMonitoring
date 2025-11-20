
import React from 'react';
import { KeyMetrics } from '../types';

// Full QWERTY Layout Definition
const ROWS = [
  ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
  ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'],
  ['SHIFT_L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT_R'],
  ['CTRL_L', 'WIN', 'ALT_L', 'SPACE', 'ALT_R', 'FN', 'CTRL_R']
];

// Map visual labels to DOM 'code' values (stripped of 'Key' prefix where applicable)
const KEY_CODE_MAP: Record<string, string> = {
  '~': 'Backquote',
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  '0': 'Digit0',
  '-': 'Minus',
  '=': 'Equal',
  'BACKSPACE': 'Backspace',
  'TAB': 'Tab',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  'CAPS': 'CapsLock',
  ';': 'Semicolon',
  "'": 'Quote',
  'ENTER': 'Enter',
  'SHIFT_L': 'ShiftLeft',
  'SHIFT_R': 'ShiftRight',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  'CTRL_L': 'ControlLeft',
  'CTRL_R': 'ControlRight',
  'WIN': 'MetaLeft',
  'ALT_L': 'AltLeft',
  'ALT_R': 'AltRight',
  'SPACE': 'Space',
  'FN': 'Fn' // Usually not captureable, but for visual completeness
};

interface Props {
  data: KeyMetrics[];
  totalKeys: number;
}

const KeyboardHeatmap: React.FC<Props> = ({ data, totalKeys }) => {
  
  const getKeyData = (label: string) => {
    // 1. Try mapping from visual label to code
    const code = KEY_CODE_MAP[label] || label; 
    // 2. Find in data (data keys are code.replace('Key', ''))
    return data.find(k => k.key === code);
  };

  const getVisualLabel = (label: string) => {
    switch(label) {
      case 'SHIFT_L': return 'SHIFT';
      case 'SHIFT_R': return 'SHIFT';
      case 'CTRL_L': return 'CTRL';
      case 'CTRL_R': return 'CTRL';
      case 'ALT_L': return 'ALT';
      case 'ALT_R': return 'ALT';
      case 'BACKSPACE': return '←';
      case 'CAPS': return 'CAPS';
      case 'ENTER': return 'ENTER';
      case 'TAB': return 'TAB';
      case 'WIN': return '❖';
      default: return label;
    }
  };

  const getKeyWidth = (label: string) => {
    switch(label) {
      case 'BACKSPACE': return 'w-16 xs:w-20 sm:w-24';
      case 'TAB': return 'w-12 xs:w-14 sm:w-16';
      case '\\': return 'w-12 xs:w-14 sm:w-16';
      case 'CAPS': return 'w-14 xs:w-16 sm:w-20';
      case 'ENTER': return 'w-16 xs:w-20 sm:w-24';
      case 'SHIFT_L': return 'w-20 xs:w-24 sm:w-28';
      case 'SHIFT_R': return 'w-20 xs:w-24 sm:w-28';
      case 'SPACE': return 'w-48 xs:w-64 sm:w-80 md:w-96';
      case 'CTRL_L':
      case 'CTRL_R':
      case 'ALT_L':
      case 'ALT_R':
      case 'WIN':
      case 'FN':
        return 'w-10 xs:w-12 sm:w-14';
      default: return 'w-7 xs:w-9 sm:w-11 md:w-12'; // Standard key width
    }
  };

  const getIntensityClasses = (keyData: KeyMetrics | undefined) => {
    if (!keyData) return 'bg-slate-800/80 text-slate-500 border-slate-700';
    
    const intensity = Math.min(keyData.count / 10, 1); // Lower threshold for visual feedback on rare keys
    
    if (intensity > 0.8) return 'bg-cyan-500/90 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400 font-bold';
    if (intensity > 0.5) return 'bg-cyan-600/80 text-white border-cyan-500';
    if (intensity > 0.2) return 'bg-cyan-900/60 text-cyan-200 border-cyan-800';
    return 'bg-slate-700/50 text-slate-300 border-slate-600';
  };

  const getBorderWidth = (count: number) => {
    if (count > 20) return 'border-[3px]';
    if (count > 10) return 'border-2';
    return 'border';
  };

  return (
    <div className="flex flex-col gap-3 items-center p-3 xs:p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg select-none w-full overflow-x-auto custom-scrollbar">
      <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold tracking-[0.2em] mb-2 uppercase font-mono sticky left-0">Full Spectrum Heatmap</h3>
      
      <div className="flex flex-col items-center min-w-max gap-1 xs:gap-1.5 sm:gap-2">
          {ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 xs:gap-1.5 sm:gap-2">
              {row.map((label) => {
                const keyData = getKeyData(label);
                const count = keyData ? keyData.count : 0;
                const hasError = keyData && keyData.errors > 0;
                const errorSeverity = keyData ? keyData.errors / Math.max(keyData.count, 1) : 0;
                const usagePercent = (totalKeys > 0 && count > 0) ? Math.round((count / totalKeys) * 100) : 0;
                const widthClass = getKeyWidth(label);
                const visualLabel = getVisualLabel(label);

                return (
                  <div
                    key={label}
                    title={keyData ? `${visualLabel} | Count: ${count} | Usage: ${usagePercent}% | Errors: ${keyData.errors}` : visualLabel}
                    className={`
                      relative
                      ${widthClass}
                      h-8 xs:h-10 sm:h-12 md:h-14 
                      flex items-center justify-center rounded 
                      transition-all duration-200 
                      font-mono overflow-hidden
                      text-[9px] xs:text-[10px] sm:text-xs md:text-sm
                      ${getBorderWidth(count)}
                      ${getIntensityClasses(keyData)}
                      ${hasError ? 'border-red-500/70' : ''}
                    `}
                  >
                    {/* Subtle Fill based on usage */}
                    {keyData && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400/30 to-transparent pointer-events-none"
                        style={{ height: `${Math.min(usagePercent * 5, 100)}%` }}
                      ></div>
                    )}

                    <span className="relative z-10 truncate px-0.5">{visualLabel}</span>
                    
                    {/* Percentage Label */}
                    {usagePercent > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 text-[6px] xs:text-[8px] opacity-70 font-mono leading-none z-10 text-inherit font-bold">
                        {usagePercent}%
                      </span>
                    )}

                    {/* Error Indicator Dot */}
                    {hasError && (
                      <div className={`absolute -top-1 -right-1 w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)] border border-slate-900 ${errorSeverity > 0.2 ? 'animate-pulse' : ''} z-20`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-[9px] uppercase tracking-widest text-slate-500 mt-2 border-t border-slate-800/50 pt-2 w-full">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-700 rounded border border-slate-600"></div> Idle</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-900 rounded border border-cyan-800"></div> Low</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-600 rounded border border-cyan-500"></div> Med</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-400 rounded border border-cyan-300 shadow-[0_0_5px_cyan]"></div> High</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.8)]"></div> Error</div>
      </div>
    </div>
  );
};

export default KeyboardHeatmap;
