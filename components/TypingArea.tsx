
import React, { useEffect, useRef, useState } from 'react';
import { ScanEye, VideoOff, Scan, Monitor, Camera } from 'lucide-react';

interface Props {
  stream: MediaStream | null;
  isMonitoring: boolean;
  onStartScreen: () => void;
  onStartCamera: () => void;
  onStop: () => void;
  onScan: () => void;
  mode: 'SCREEN' | 'CAMERA' | 'IDLE';
}

const SurveillanceFeed: React.FC<Props> = ({ stream, isMonitoring, onStartScreen, onStartCamera, onStop, onScan, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceName, setSourceName] = useState('NULL');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      setSourceName(track ? track.label : 'GENERIC_VIDEO_INPUT');
    } else {
      setSourceName('NULL');
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-950 border-2 border-slate-800 rounded-xl overflow-hidden group h-48 xs:h-56 sm:h-64 md:h-72 flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-3 z-10 flex justify-between items-start backdrop-blur-[2px]">
        <h2 className="text-[10px] sm:text-xs font-mono text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
            <ScanEye size={14} className={isMonitoring ? "animate-pulse" : ""} />
            {isMonitoring ? `${mode} FEED LIVE` : "FEED OFFLINE"}
        </h2>
        
        {isMonitoring && (
            <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                 <span className="text-[10px] text-red-400 font-mono uppercase tracking-widest">REC</span>
            </div>
        )}
      </div>

      {/* HUD Corners */}
      <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-cyan-500/30 pointer-events-none z-20"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-cyan-500/30 pointer-events-none z-20"></div>
      <div className="absolute bottom-14 left-4 w-4 h-4 border-l-2 border-b-2 border-cyan-500/30 pointer-events-none z-20"></div>
      <div className="absolute bottom-14 right-4 w-4 h-4 border-r-2 border-b-2 border-cyan-500/30 pointer-events-none z-20"></div>

      {/* Video Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        {stream ? (
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover opacity-80 ${mode === 'CAMERA' ? 'scale-x-[-1]' : ''}`} 
            />
        ) : (
            <div className="text-slate-700 flex flex-col items-center gap-2 sm:gap-3">
                <VideoOff size={32} strokeWidth={1} className="sm:w-12 sm:h-12" />
                <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest">No Signal Detected</p>
            </div>
        )}
        
        {/* Scanning Grid Effect Overlay */}
        {isMonitoring && (
            <>
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] opacity-20"></div>
                <div className="absolute inset-0 pointer-events-none bg-cyan-500/5 z-10 animate-pulse"></div>
                <div className="absolute w-full h-[2px] bg-cyan-500/20 top-0 animate-scan z-20 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
            </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-900/90 backdrop-blur p-2 sm:p-3 border-t border-slate-800 flex justify-between items-center z-30 gap-2">
         <div className="text-[10px] text-slate-500 font-mono truncate flex-1 hidden sm:block">
            SRC: {sourceName.substring(0, 20)}
         </div>
         
         <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
            {isMonitoring && (
                <button
                    onClick={onScan}
                    className="px-2 py-1 sm:px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono border bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700 flex items-center gap-2"
                    title="Force Analysis Scan"
                >
                    <Scan size={12} />
                </button>
            )}

            {!isMonitoring ? (
              <>
                <button 
                    onClick={onStartScreen}
                    className="flex-1 sm:flex-none px-2 py-1 sm:px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono border bg-cyan-900/20 text-cyan-400 hover:bg-cyan-900/30 border-cyan-500/30 flex items-center justify-center gap-2"
                >
                    <Monitor size={12} /> Screen
                </button>
                <button 
                    onClick={onStartCamera}
                    className="flex-1 sm:flex-none px-2 py-1 sm:px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono border bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 border-purple-500/30 flex items-center justify-center gap-2"
                >
                    <Camera size={12} /> Camera
                </button>
              </>
            ) : (
               <button 
                  onClick={onStop}
                  className="px-2 py-1 sm:px-4 rounded text-[10px] font-bold uppercase tracking-wider transition-all font-mono border bg-red-900/20 text-red-400 hover:bg-red-900/30 border-red-500/30"
              >
                  Terminate
              </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default SurveillanceFeed;
