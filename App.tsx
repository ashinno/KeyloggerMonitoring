import React, { useState, useEffect, useRef } from 'react';
import { KeyEvent, SessionMetrics, ActivityLog, MouseEventData, Snapshot, UsbEvent } from './types';
import { calculateMetrics } from './utils/analytics';
import { generateBotKeystrokes } from './utils/botAttack';
import { WSClient, WSStatus, AnalysisResponse as WSAnalysisResponse } from './services/wsClient';
import { KeyboardCapture } from './services/keyboardCapture';
import { Persistence, UserProfile } from './services/persistence';
import { exportData } from './utils/export';

// Components
import SurveillanceFeed from './components/TypingArea';
import MetricsCard from './components/MetricsCard';
import Dashboard from './components/Dashboard';
import KeyboardHeatmap from './components/KeyboardHeatmap';
import AIAnalysis from './components/AIAnalysis';
import TrustGauge from './components/TrustGauge';
import SystemMonitor from './components/SystemMonitor';
import WindowTracker from './components/WindowTracker';
import SnapshotGallery from './components/SnapshotGallery';

// Icons
import { Fingerprint, Lock, Eye, Zap, Activity, Database, ShieldAlert, Bot, Sun, Moon, FileJson, FileSpreadsheet, FileText, Power, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [events, setEvents] = useState<KeyEvent[]>([]);
  const [mouseEvents, setMouseEvents] = useState<MouseEventData[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>(calculateMetrics([], [], false));
  
  // System State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorMode, setMonitorMode] = useState<'SCREEN' | 'CAMERA' | 'IDLE'>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [usbEvents, setUsbEvents] = useState<UsbEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Research Features State
  const [trustScore, setTrustScore] = useState(100);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [botMode, setBotMode] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [noirMode, setNoirMode] = useState(false);
  
  // Refs
  const intervalRef = useRef<number | null>(null);
  const wsSendRef = useRef<number | null>(null);
  const botRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const metricsRef = useRef(metrics);
  const wsRef = useRef<WSClient | null>(null);
  const lastAnalysisRef = useRef<WSAnalysisResponse | null>(null);
  const [wsStatus, setWsStatus] = useState<WSStatus>('idle');
  const eventsRef = useRef<KeyEvent[]>([]);
  const mouseRef = useRef<MouseEventData[]>([]);
  const lastKeyTsRef = useRef<number>(0);
  const screenshotRef = useRef<number | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const loadedLogs = Persistence.getLogs(encryptionEnabled);
    const loadedProfile = Persistence.getProfile();
    setLogs(loadedLogs);
    setProfile(loadedProfile);
  }, [encryptionEnabled]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    mouseRef.current = mouseEvents;
  }, [mouseEvents]);

  // Apply Noir Mode
  useEffect(() => {
    if (noirMode) {
      document.body.classList.add('noir-mode');
    } else {
      document.body.classList.remove('noir-mode');
    }
  }, [noirMode]);

  // --- Error Auto-Dismiss ---
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // --- WebSocket Lifecycle ---
  useEffect(() => {
    const clientId = localStorage.getItem('client_id') || (() => {
      const id = Math.random().toString(36).slice(2);
      localStorage.setItem('client_id', id);
      return id;
    })();

    const url = `ws://${window.location.hostname}:5051/ws/stream/${clientId}`;

    const onMessage = (msg: WSAnalysisResponse) => {
      lastAnalysisRef.current = msg;
      setTrustScore(msg.trustScore);
      const currentMetrics = metricsRef.current;
      const newLog = {
        timestamp: Date.now(),
        activity: msg.currentActivity,
        focusLevel: msg.focusLevel,
        riskScore: msg.riskScore,
        trustScore: Math.round(msg.trustScore),
        description: msg.summary,
        isEncrypted: encryptionEnabled,
      } as ActivityLog;
      Persistence.saveLog(newLog, encryptionEnabled);
      setLogs(prev => [newLog, ...prev].slice(0, 50));
    };

    const onStatus = (s: WSStatus) => {
      setWsStatus(s);
      if (s === 'error') setErrorMessage('Realtime stream error');
    };

    if (isMonitoring) {
      wsRef.current = new WSClient(url, onMessage, onStatus);
      wsRef.current.connect();
      wsSendRef.current = window.setInterval(() => {
        const ks = eventsRef.current.slice(-200).map(e => ({
          type: e.type === 'down' ? 'keydown' : 'keyup',
          key: e.key,
          timestamp: e.timestamp / 1000,
        }));
        const ms = mouseRef.current.slice(-200).map(m => ({
          x: m.x,
          y: m.y,
          timestamp: m.timestamp / 1000,
        }));
        wsRef.current?.send({ keystrokes: ks, mouse: ms });
      }, 1000);
    } else {
      if (wsSendRef.current) { clearInterval(wsSendRef.current); wsSendRef.current = null; }
      wsRef.current?.disconnect();
      wsRef.current = null;
    }
    return () => {
      if (wsSendRef.current) { clearInterval(wsSendRef.current); wsSendRef.current = null; }
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [isMonitoring, encryptionEnabled]);

  // --- Bot Attack Simulator ---
  useEffect(() => {
    if (botMode && isMonitoring) {
        botRef.current = window.setInterval(() => {
             const botKeys = generateBotKeystrokes(Date.now());
             setEvents(prev => [...prev, ...botKeys]);
        }, 2000);
    } else {
        if (botRef.current) clearInterval(botRef.current);
    }
    return () => { if (botRef.current) clearInterval(botRef.current); }
  }, [botMode, isMonitoring]);

  useEffect(() => {
    const kb = new KeyboardCapture((msg) => {
      if (!isMonitoring) return;
      const event: KeyEvent = { key: msg.key, code: msg.code, timestamp: msg.timestamp, type: msg.type };
      setEvents(prev => [...prev, event]);
      lastKeyTsRef.current = msg.timestamp;
    });
    if (isMonitoring) kb.start();

    let lastMouseTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMonitoring) return;
      const now = Date.now();
      if (now - lastMouseTime > 50) {
        setMouseEvents(prev => [...prev, { x: e.clientX, y: e.clientY, timestamp: now }].slice(-100));
        lastMouseTime = now;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { capture: true } as any);

    const focusCheck = () => {
      if (!document.hasFocus()) {
        console.warn('Window not focused; keyboard events may be suppressed');
        try { window.focus(); } catch {}
      }
    };
    const focusInterval = window.setInterval(focusCheck, 3000);

    const detectSilence = () => {
      if (!isMonitoring) return;
      const now = Date.now();
      if (lastKeyTsRef.current && now - lastKeyTsRef.current > 10000) {
        console.warn('No keystrokes detected in 10s; ensure window is focused');
      }
    };
    const silenceInterval = window.setInterval(detectSilence, 5000);

    return () => {
      kb.stop();
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(focusInterval);
      clearInterval(silenceInterval);
    };
  }, [isMonitoring]);

  useEffect(() => {
    setMetrics(calculateMetrics(events, mouseEvents, privacyMode));
  }, [events, mouseEvents, privacyMode]);

  // --- USB Logic ---
  const simulateUsbAttack = () => {
     const newEvent: UsbEvent = {
       id: Math.random().toString(36).substr(2, 9),
       deviceName: Math.random() > 0.5 ? "HID Keyboard Device (Malicious)" : "Mass Storage (Unknown)",
       timestamp: Date.now(),
       status: 'connected',
       isSuspicious: true
     };
     setUsbEvents(prev => [newEvent, ...prev]);
     wsRef.current?.send({ usbEvent: { isSuspicious: true } });
  };

  const handleRealUsbEvent = (event: UsbEvent) => {
      setUsbEvents(prev => [event, ...prev]);
      wsRef.current?.send({ usbEvent: { isSuspicious: false } });
  };

  // --- Core AI Logic ---
  const performScan = async () => {
    if (!videoRef.current.videoWidth) return;

    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth / 2;
    canvasRef.current.height = videoRef.current.videoHeight / 2;
    ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.7);

    const result = lastAnalysisRef.current;
    if (result) {
      const newSnapshot: Snapshot = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageData: base64Image,
        riskScore: result.riskScore,
        activity: result.currentActivity,
      };
      setSnapshots(prev => [newSnapshot, ...prev].slice(0, 10));
      try {
        await fetch(`http://${window.location.hostname}:5051/media/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64Image, format: 'jpg' }),
        });
      } catch (e) {
        console.error('Screenshot save error', e);
      }
    }
  };

  const captureAndUpload = async () => {
    if (!videoRef.current.videoWidth) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth / 2;
    canvasRef.current.height = videoRef.current.videoHeight / 2;
    ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const base64Image = canvasRef.current.toDataURL('image/png', 0.9);
    try {
      await fetch(`http://${window.location.hostname}:5051/media/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, format: 'png' }),
      });
    } catch (e) {
      console.warn('Auto screenshot error', e);
    }
  };

  const startScreenMonitoring = async () => {
    try {
      stopMonitoring();
      const supportsDisplay = !!(navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia);
      if (!supportsDisplay) {
        await startCameraMonitoring();
        setErrorMessage('Screen capture not supported; using camera instead.');
        return;
      }
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      setStream(displayStream);
      setIsMonitoring(true);
      setMonitorMode('SCREEN');
      videoRef.current.srcObject = displayStream;
      await videoRef.current.play();
      displayStream.getVideoTracks()[0].onended = () => stopMonitoring();
      intervalRef.current = window.setInterval(performScan, 5000);
      screenshotRef.current = window.setInterval(captureAndUpload, 20000);
      setErrorMessage(null);
    } catch (err: any) {
      if (err?.name === 'NotSupportedError') {
        await startCameraMonitoring();
        setErrorMessage('Screen capture not supported by this browser or context; using camera.');
        return;
      }
      if (err?.name === 'NotAllowedError') {
        setErrorMessage('Screen Access Denied: User cancelled the prompt.');
      } else {
        setErrorMessage(`Screen Access Error: ${err?.message || 'Unknown error'}`);
      }
      setIsMonitoring(false);
    }
  };

  const startCameraMonitoring = async () => {
    try {
       stopMonitoring();
       
       const camStream = await navigator.mediaDevices.getUserMedia({ 
         video: true, 
         audio: false 
       });
       
       setStream(camStream);
       setIsMonitoring(true);
       setMonitorMode('CAMERA');
       videoRef.current.srcObject = camStream;
       videoRef.current.play();
       
       camStream.getVideoTracks()[0].onended = () => stopMonitoring();
       
      intervalRef.current = window.setInterval(performScan, 5000);
      screenshotRef.current = window.setInterval(captureAndUpload, 20000);
      setErrorMessage(null);
    } catch (err: any) {
       console.error("Error accessing camera:", err);
       if (err.name === 'NotAllowedError') {
        setErrorMessage("Camera Access Denied: Permission required.");
      } else {
        setErrorMessage(`Camera Access Error: ${err.message}`);
      }
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (screenshotRef.current) {
      clearInterval(screenshotRef.current);
      screenshotRef.current = null;
    }
    setIsMonitoring(false);
    setMonitorMode('IDLE');
  };

  const toggleSystem = async () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      // Default to Screen Monitoring for full system initialization
      await startScreenMonitoring();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 xs:p-4 md:p-8 font-sans transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        
        {/* Header */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 border-b border-slate-800/60 pb-4 sm:pb-6 relative">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3 font-mono">
              <Fingerprint className="text-cyan-400" size={28} />
              <span className="uppercase tracking-widest">SENTINEL // CORE</span>
            </h1>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-1 font-mono uppercase tracking-wider">
              Continuous Auth System <span className="text-slate-700">|</span> Ver: 3.2.0 <span className="text-slate-700">|</span> {noirMode ? "NOIR MODE" : "STD MODE"}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
             
             {/* MASTER POWER SWITCH */}
             <button
                onClick={toggleSystem}
                className={`flex items-center gap-2 px-4 py-1.5 rounded border transition-all font-mono font-bold uppercase tracking-wider ${
                  isMonitoring 
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                }`}
             >
                <Power size={16} strokeWidth={3} />
                <span className="hidden sm:inline">{isMonitoring ? "SYSTEM TERMINATE" : "SYSTEM INITIALIZE"}</span>
                <span className="sm:hidden">{isMonitoring ? "OFF" : "ON"}</span>
             </button>

             {/* Separator */}
             <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

             {/* Toggles */}
             <button 
                onClick={() => setBotMode(!botMode)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${botMode ? 'bg-red-600/20 text-red-400 border-red-500/50' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
             >
                <Bot size={14} /> <span className="text-[10px] sm:text-xs font-bold uppercase font-mono">Bot Sim</span>
             </button>
             <button 
                onClick={() => setPrivacyMode(!privacyMode)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${privacyMode ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
             >
                <Eye size={14} /> <span className="text-[10px] sm:text-xs font-bold uppercase font-mono">Privacy</span>
             </button>
             <button 
                onClick={() => setEncryptionEnabled(!encryptionEnabled)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${encryptionEnabled ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
             >
                <Lock size={14} /> <span className="text-[10px] sm:text-xs font-bold uppercase font-mono">Enc (Sim)</span>
             </button>
             <button 
                onClick={() => setNoirMode(!noirMode)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${noirMode ? 'bg-slate-100 text-black border-white' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
             >
                {noirMode ? <Sun size={14} /> : <Moon size={14} />} 
                <span className="text-[10px] sm:text-xs font-bold uppercase font-mono">{noirMode ? "Day" : "Noir"}</span>
             </button>

             {/* Separator */}
             <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

             {/* Data Export Controls */}
             <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-700 rounded p-1">
                <button
                    onClick={() => exportData('json', logs, profile, metrics)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                    title="Export Full System Dump (JSON)"
                >
                    <FileJson size={14} />
                </button>
                <button
                    onClick={() => exportData('csv', logs, profile, metrics)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                    title="Export Logs (CSV)"
                >
                    <FileSpreadsheet size={14} />
                </button>
                <button
                    onClick={() => exportData('md', logs, profile, metrics)}
                    className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors"
                    title="Generate Incident Report (MD)"
                >
                    <FileText size={14} />
                </button>
             </div>
          </div>
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="absolute -bottom-12 left-0 right-0 z-50 bg-red-500/10 border border-red-500/50 text-red-400 p-2 rounded flex items-center justify-center gap-2 text-xs font-mono uppercase font-bold animate-pulse">
                <AlertCircle size={14} />
                {errorMessage}
            </div>
          )}
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Col: Feed, Logs, Trust Gauge */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6 flex flex-col">
             <SurveillanceFeed 
                stream={stream} 
                isMonitoring={isMonitoring} 
                mode={monitorMode}
                onStartScreen={startScreenMonitoring}
                onStartCamera={startCameraMonitoring} 
                onStop={stopMonitoring} 
                onScan={performScan}
             />
             
             <div className="grid grid-cols-2 gap-4">
                <TrustGauge score={trustScore} />
                <WindowTracker />
             </div>

             <div className="flex-1 min-h-[300px] lg:min-h-0">
                <AIAnalysis logs={logs} />
             </div>
          </div>

          {/* Right Col: Biometrics & Analytics */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
             {/* Alert Banners */}
             {botMode && (
                 <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-3 animate-pulse backdrop-blur-sm">
                    <ShieldAlert size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Adversarial Attack Simulation Active: Injecting Synthetic Packets</span>
                 </div>
             )}

             {/* Quick Stats */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <MetricsCard 
                    title="Key Velocity" 
                    value={Math.round(metrics.wpm)} 
                    subValue="WPM (Keystroke)" 
                    icon={Zap} 
                    colorClass="text-yellow-400"
                />
                <MetricsCard 
                    title="Mouse Vel" 
                    value={metrics.mouseMetrics.avgVelocity.toFixed(2)} 
                    subValue="px/ms (Pointer)" 
                    icon={Activity} 
                    colorClass="text-purple-400"
                />
                 <MetricsCard 
                    title="Identity Risk" 
                    value={logs[0]?.riskScore || 0} 
                    subValue="Anomaly Score" 
                    icon={Lock} 
                    colorClass={logs[0]?.riskScore > 50 ? "text-red-500" : "text-emerald-400"}
                />
                <MetricsCard 
                    title="DB State" 
                    value={encryptionEnabled ? "AES-256" : "RAW"} 
                    subValue={logs.length + " Records"} 
                    icon={Database} 
                    colorClass="text-blue-400"
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                <SystemMonitor 
                    usbEvents={usbEvents} 
                    onSimulateUsb={simulateUsbAttack} 
                    onUsbDetected={handleRealUsbEvent}
                />
                <SnapshotGallery snapshots={snapshots} />
             </div>

             {/* Advanced Charts */}
             <Dashboard metrics={metrics} encryptionEnabled={encryptionEnabled} />
             
             {/* Heatmap */}
             <div className="grid grid-cols-1">
                <KeyboardHeatmap data={metrics.topKeys} totalKeys={metrics.totalKeys} />
             </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default App;
