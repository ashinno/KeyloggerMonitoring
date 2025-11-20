
import React from 'react';
import { SessionMetrics } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Lock, Eye, Shield, MousePointer2 } from 'lucide-react';

interface Props {
  metrics: SessionMetrics;
  encryptionEnabled: boolean;
}

const Dashboard: React.FC<Props> = ({ metrics, encryptionEnabled }) => {
  // Filter to top 5 for the chart as requested
  const topKeysData = metrics.topKeys.slice(0, 5).map(k => ({
    name: k.key.length > 3 ? k.key.substring(0, 3) + '..' : k.key, // Handle hashes
    count: k.count,
    dwell: Math.round(k.avgDwellTime)
  }));

  // Dummy data for visuals - in real app would be historical array
  const rhythmData = Array.from({ length: 20 }, (_, i) => ({
    index: i,
    latency: Math.max(20, metrics.avgFlightTime + (Math.random() - 0.5) * metrics.rhythmVariance * 2)
  }));

  return (
    <div className="space-y-6">
        
      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg border flex items-center justify-between ${metrics.privacyModeEnabled ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center gap-2">
                  {metrics.privacyModeEnabled ? <Eye size={16} className="text-emerald-400" /> : <Eye size={16} className="text-slate-500" />}
                  <span className="text-xs font-bold text-slate-300 uppercase">Privacy Hashing</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${metrics.privacyModeEnabled ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'}`}>
                  {metrics.privacyModeEnabled ? 'ACTIVE' : 'OFF'}
              </span>
          </div>
          <div className={`p-3 rounded-lg border flex items-center justify-between ${encryptionEnabled ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center gap-2">
                  {encryptionEnabled ? <Lock size={16} className="text-blue-400" /> : <Lock size={16} className="text-slate-500" />}
                  <span className="text-xs font-bold text-slate-300 uppercase">Secure Enclave</span>
              </div>
               <span className={`text-[10px] px-2 py-0.5 rounded ${encryptionEnabled ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {encryptionEnabled ? 'AES-SIM' : 'OFF'}
              </span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Flight Time / Rhythm Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h3 className="text-white font-semibold">Rhythm Consistency</h3>
                  <p className="text-xs text-slate-500">Flight time variance (latency between keys)</p>
              </div>
              <div className="text-right">
                  <span className="text-2xl font-bold text-cyan-400">{Math.round(metrics.rhythmVariance)}</span>
                  <span className="text-xs text-slate-500 ml-1">ms dev</span>
              </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rhythmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <YAxis stroke="#64748b" fontSize={10} />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#22d3ee" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mouse Dynamics */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                   <MousePointer2 size={18} className="text-purple-400" />
                  <div>
                    <h3 className="text-white font-semibold">Mouse Ballistics</h3>
                    <p className="text-xs text-slate-500">Velocity & Angular Movement</p>
                  </div>
              </div>
              <div className="text-right">
                  <span className="text-2xl font-bold text-purple-400">{metrics.mouseMetrics.avgVelocity.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 ml-1">px/ms</span>
              </div>
          </div>
          <div className="h-48 w-full flex flex-col justify-end space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                  <span>Micro-Tremors (Humanity Check)</span>
                  <span className="text-white">{metrics.mouseMetrics.tremorCount} events</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${Math.min(metrics.mouseMetrics.tremorCount * 5, 100)}%` }}></div>
              </div>
               <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Angular Velocity</span>
                  <span className="text-white">{metrics.mouseMetrics.angularVelocity.toFixed(3)} rad/ms</span>
              </div>
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${Math.min(metrics.mouseMetrics.angularVelocity * 1000, 100)}%` }}></div>
              </div>
          </div>
        </div>
      </div>
      
      {/* Dwell Time Bar Chart */}
       <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-white font-semibold mb-4">Top 5 Keys Dwell Time (ms)</h3>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topKeysData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }} 
                        itemStyle={{ color: '#8b5cf6' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="dwell" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
       </div>

    </div>
  );
};

export default Dashboard;
