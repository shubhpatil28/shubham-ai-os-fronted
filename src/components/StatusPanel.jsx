import React, { useState, useEffect } from 'react';
import { Shield, Radio, Database, Cpu, Wifi } from 'lucide-react';
import { safeFetch } from '../config/api';

const StatusPanel = ({ memoriesCount = 0 }) => {
  const [status, setStatus] = useState({
    status: 'connecting',
    voice_active: false,
    database_connected: false,
    config_loaded: { openai_enabled: false, elevenlabs_enabled: false },
  });

  const fetchStatus = async () => {
    const { data, error } = await safeFetch('/api/status');
    if (!error && data) {
      setStatus(data);
    } else {
      setStatus((prev) => ({ ...prev, status: 'offline' }));
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = status.status === 'online';

  return (
    <div className="glass-panel p-5 flex flex-col h-[340px] justify-between">
      <div>
        <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-2 mb-4">
          <Shield size={14} className="text-[#00f3ff]" />
          <h2 className="text-xs font-mono font-bold tracking-[0.2em] text-[#00f3ff]">CORE DIAGNOSTICS</h2>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5"><Cpu size={12} /> CORE OS:</span>
            <span className={`font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5"><Radio size={12} /> MIC DAEMON:</span>
            <span className={`font-bold ${status.voice_active ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {status.voice_active ? 'BACKGROUND LISTENING' : 'ACTIVE WAKE WORD'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5"><Database size={12} /> SQL MEMORY:</span>
            <span className="text-emerald-400 font-bold">CONNECTED ({memoriesCount} FACTS)</span>
          </div>

          <div className="border-t border-slate-800/60 pt-3 mt-2">
            <span className="text-[9px] font-mono text-slate-500 block mb-1.5">INTEGRATED SYSTEMS</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className={`p-1.5 rounded border text-center ${
                status.config_loaded?.openai_enabled
                  ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}>
                GPT-4o {status.config_loaded?.openai_enabled ? 'READY' : 'OFFLINE'}
              </div>
              <div className={`p-1.5 rounded border text-center ${
                status.config_loaded?.elevenlabs_enabled
                  ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}>
                11LABS {status.config_loaded?.elevenlabs_enabled ? 'READY' : 'LOCAL TTS'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sync info */}
      <div className="mt-4 p-2.5 rounded bg-[#0066ff]/5 border border-[#0066ff]/20 flex items-start gap-2">
        <Wifi size={14} className="text-[#00d2ff] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <span className="text-[9px] font-mono font-bold text-[#00d2ff] block uppercase">Mobile Sync Channel</span>
          <p className="text-[8px] font-mono text-slate-400 leading-normal mt-0.5">
            Access this control node from your phone on the same Wi-Fi.
          </p>
          <span className="text-[9px] font-mono text-emerald-400 font-bold block mt-1">
            http://[Your-PC-Local-IP]:5173
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
