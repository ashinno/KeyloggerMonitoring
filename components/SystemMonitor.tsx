import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, Wifi, Usb, AlertTriangle, PlugZap } from 'lucide-react';
import { UsbEvent, SystemResources } from '../types';

interface Props {
  usbEvents: UsbEvent[];
  onSimulateUsb: () => void;
  onUsbDetected: (event: UsbEvent) => void;
}

const SystemMonitor: React.FC<Props> = ({ usbEvents, onSimulateUsb, onUsbDetected }) => {
  const [resources, setResources] = useState<SystemResources>({
    cpuUsage: 12,
    ramUsage: 45,
    networkLatency: 24
  });

  // Real-time WebUSB Listener
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      const nav = navigator as any;

      const handleConnect = (event: any) => {
        const deviceName = event.device.productName || `Unknown Device (VID:${event.device.vendorId})`;
        onUsbDetected({
            id: Math.random().toString(36).substr(2, 9),
            deviceName: deviceName,
            timestamp: Date.now(),
            status: 'connected',
            isSuspicious: false
        });
      };

      const handleDisconnect = (event: any) => {
        const deviceName = event.device.productName || `Unknown Device (VID:${event.device.vendorId})`;
        onUsbDetected({
            id: Math.random().toString(36).substr(2, 9),
            deviceName: deviceName,
            timestamp: Date.now(),
            status: 'disconnected',
            isSuspicious: false
        });
      };

      nav.usb.addEventListener('connect', handleConnect);
      nav.usb.addEventListener('disconnect', handleDisconnect);

      return () => {
        nav.usb.removeEventListener('connect', handleConnect);
        nav.usb.removeEventListener('disconnect', handleDisconnect);
      };
    }
  }, [onUsbDetected]);

  // Function to request permission (Required for WebUSB to start listening)
  const authorizeDevice = async () => {
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
            const nav = navigator as any;
            // Requesting any device just to grant permission context
            await nav.usb.requestDevice({ filters: [] });
        } catch (err) {
            // Ignore user cancellation errors
            console.log("USB Auth cancelled or failed", err);
        }
    } else {
        console.warn("WebUSB not supported in this browser");
    }
  };

  // Simulate system resource fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setResources(prev => ({
        cpuUsage: Math.min(100, Math.max(5, prev.cpuUsage + (Math.random() * 10 - 5))),
        ramUsage: Math.min(100, Math.max(20, prev.ramUsage + (Math.random() * 4 - 2))),
        networkLatency: Math.max(5, prev.networkLatency + (Math.random() * 10 - 5))
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-lg h-full">
      <h3 className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        <Cpu size={14} className="text-cyan-400" /> System Integrity Monitor
      </h3>

      {/* Resources Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* CPU */}
        <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-500 font-mono">CPU LOAD</span>
            <Cpu size={10} className="text-slate-600" />
          </div>
          <div className="text-lg font-bold text-white font-mono">{Math.round(resources.cpuUsage)}%</div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${resources.cpuUsage > 80 ? 'bg-red-500' : 'bg-cyan-500'}`} 
              style={{ width: `${resources.cpuUsage}%` }}
            ></div>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-500 font-mono">RAM ALLOC</span>
            <HardDrive size={10} className="text-slate-600" />
          </div>
          <div className="text-lg font-bold text-white font-mono">{Math.round(resources.ramUsage)}%</div>
           <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${resources.ramUsage > 90 ? 'bg-red-500' : 'bg-purple-500'}`} 
              style={{ width: `${resources.ramUsage}%` }}
            ></div>
          </div>
        </div>

        {/* Network */}
        <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-500 font-mono">LATENCY</span>
            <Wifi size={10} className="text-slate-600" />
          </div>
          <div className="text-lg font-bold text-white font-mono">{Math.round(resources.networkLatency)}ms</div>
           <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${resources.networkLatency > 100 ? 'bg-yellow-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(100, resources.networkLatency)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* USB Monitor */}
      <div className="flex-1 bg-slate-950/30 border border-slate-800 rounded p-2 overflow-hidden flex flex-col">
         <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
              <Usb size={12} /> I/O Events
            </span>
            <div className="flex gap-1">
                <button 
                  onClick={authorizeDevice}
                  className="text-[9px] bg-slate-800 hover:bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center gap-1"
                  title="Authorize a real USB device to monitor connection status"
                >
                  <PlugZap size={8} /> AUTH DEVICE
                </button>
                <button 
                  onClick={onSimulateUsb}
                  className="text-[9px] bg-slate-800 hover:bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-slate-700 hover:border-red-500/50 transition-colors"
                >
                  SIM INJECT
                </button>
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {usbEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic text-center px-4">
                No events. Click 'AUTH DEVICE' to pair a real USB device for monitoring.
              </div>
            ) : (
              usbEvents.map(event => (
                <div key={event.id} className={`flex items-center justify-between p-1.5 rounded border ${event.isSuspicious ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-900 border-slate-800'}`}>
                   <div className="flex items-center gap-2 overflow-hidden">
                      {event.isSuspicious ? <AlertTriangle size={12} className="text-red-500 shrink-0" /> : <Usb size={12} className="text-slate-500 shrink-0" />}
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-mono truncate ${event.isSuspicious ? 'text-red-400' : 'text-slate-300'}`}>
                          {event.deviceName}
                        </span>
                        <span className="text-[8px] text-slate-600">
                          {event.status.toUpperCase()} - {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
};

export default SystemMonitor;