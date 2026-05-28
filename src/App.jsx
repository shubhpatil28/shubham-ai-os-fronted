import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Send, MessageSquare, Brain, Radio, Calendar, Cpu, Sparkles, MessageCircle, Menu, FileText, ChevronRight, Database, Zap, Search, ShieldAlert, Mic2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// ── Core config ──────────────────────────────────────────────
import { API_URL, safeFetch } from './config/api';
import { AGENTS, TASK_STAGES } from './config/agents';

// ── Always-needed components (eager) ────────────────────────
import ErrorBoundary from './components/ErrorBoundary';
import GlassLoader from './components/GlassLoader';
import FallbackCard from './components/FallbackCard';
import AgentOrb from './components/AgentOrb';
import MessageBubble from './components/MessageBubble';
import TypingIndicator from './components/TypingIndicator';
import VoiceAssistant from './components/VoiceAssistant';
import StatusPanel from './components/StatusPanel';
import Console from './components/Console';
import BootScreen from './components/BootScreen';
import NeuralBackground from './components/NeuralBackground';
import AgentNetwork from './components/AgentNetwork';
import TaskPipeline from './components/TaskPipeline';

// ── Lazy-loaded tab modules ──────────────────────────────────
const ChatSidebar = lazy(() => import('./components/ChatSidebar').catch(() => ({ default: () => <FallbackCard name="Chat Sidebar" /> })));
const Planner     = lazy(() => import('./components/Planner').catch(() => ({ default: () => <FallbackCard name="Planner" /> })));
const WhatsAppHub = lazy(() => import('./components/WhatsAppHub').catch(() => ({ default: () => <FallbackCard name="WhatsApp Hub" /> })));
const MemoryVault = lazy(() => import('./components/MemoryVault').catch(() => ({ default: () => <FallbackCard name="Memory Vault" /> })));
const DataHub     = lazy(() => import('./components/DataHub').catch(() => ({ default: () => <FallbackCard name="Data Hub" /> })));

// ── Safe WebSocket init ──────────────────────────────────────
let socket = null;
try {
  socket = io(API_URL, { transports: ['websocket', 'polling'], timeout: 5000 });
} catch (e) {
  console.warn('[App] Socket.IO connection failed (non-fatal):', e.message);
}

// ── App ──────────────────────────────────────────────────────
const App = () => {
  const [isBooted, setIsBooted] = useState(false);
  const [activeTab, setActiveTab] = useState('core');
  
  // Agent Ecosystem States
  const [activeAgentId, setActiveAgentId] = useState('nexus');
  const [communicatingWith, setCommunicatingWith] = useState(null);
  const [currentStage, setCurrentStage] = useState('queued');
  const [activeTaskName, setActiveTaskName] = useState('SYSTEM_IDLE');
  const [coreState, setCoreState] = useState('idle');
  
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [isBrowserListening, setIsBrowserListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  const addLog = (text, type = 'system') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs((prev) => [...prev.slice(-150), { text, type, time }]);
  };

  const fetchMemoryCount = async () => {
    const { data } = await safeFetch('/api/memory');
    if (Array.isArray(data)) setMemoriesCount(data.length);
  };

  const fetchChatHistory = async () => {
    const { data } = await safeFetch('/api/chat-history');
    if (!Array.isArray(data)) return;
    const cleanHistory = data.map((item) => {
      let text = item?.message || '';
      try {
        const parsed = JSON.parse(text);
        if (parsed?.response) text = parsed.response;
      } catch (_) {}
      return { ...item, cleanText: text };
    });
    setChatHistory(cleanHistory);
  };

  useEffect(() => {
    if (isBooted) {
      addLog('Multi-Agent Neural Ecosystem initialized.', 'system');
      addLog('All agents reporting status: OPTIMAL', 'system');
      fetchMemoryCount();
      fetchChatHistory();
    }
  }, [isBooted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const simulateTaskPipeline = async (type, task) => {
    setActiveTaskName(task.toUpperCase().replace(/\s/g, '_'));
    
    const stages = ['queued', 'analyzing', 'planning', 'generating', 'validating', 'completed'];
    const orchestrators = {
      'nexus': ['analyze', 'routing'],
      'forge': ['generate_site', 'coding'],
      'echo': ['save_memory', 'memory'],
      'oracle': ['research', 'data'],
      'sentinel': ['validate', 'security']
    };

    let targetAgent = 'nexus';
    if (type.includes('site') || type.includes('code')) targetAgent = 'forge';
    else if (type.includes('memory') || type.includes('forget')) targetAgent = 'echo';
    else if (type.includes('data') || type.includes('research')) targetAgent = 'oracle';

    addLog(`Task Routed to Agent ${targetAgent.toUpperCase()}`, 'system');
    
    for (const stage of stages) {
      setCurrentStage(stage);
      setCommunicatingWith(stage === 'planning' ? 'nexus' : targetAgent);
      setActiveAgentId(stage === 'generating' ? targetAgent : 'nexus');
      await new Promise(r => setTimeout(r, stage === 'generating' ? 3000 : 1500));
    }
    
    // Add success log
    addLog(`Task ${task} completed successfully by ${targetAgent.toUpperCase()}`, 'response');
    setTimeout(() => {
      setCurrentStage('queued');
      setActiveAgentId('nexus');
      setCommunicatingWith(null);
      setActiveTaskName('SYSTEM_IDLE');
    }, 5000);
  };

  const processInput = async (messageText) => {
    if (!messageText?.trim()) return;

    setCoreState('processing');
    addLog(`Direct Link Command: "${messageText}"`, 'action');

    const { data, error } = await safeFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText }),
    });

    if (error) {
      setCoreState('warning');
      addLog(error, 'error');
      setTimeout(() => setCoreState('idle'), 3000);
      return;
    }

    const response = data?.response || 'Incomplete telemetry.';
    addLog(`[NEXUS] Routing complete. Response buffering...`, 'system');

    if (data?.action) {
      simulateTaskPipeline(data.action.type, messageText);
    } else {
      // General chat routing
      setActiveAgentId('nexus');
    }

    setCoreState('speaking');
    fetchMemoryCount();
    fetchChatHistory();
    setTimeout(() => setCoreState('idle'), 4000);
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    processInput(inputText);
    setInputText('');
  };

  const toggleVoiceListen = () => {
    const next = !isBrowserListening;
    setIsBrowserListening(next);
    setCoreState(next ? 'listening' : 'idle');
    setActiveAgentId(next ? 'pulse' : 'nexus');
    try {
      socket?.emit('toggle_listening', { enable: next });
    } catch (_) {}
    addLog(next ? 'Agent PULSE activated voice array.' : 'PULSE standby. Control returned to NEXUS.', 'system');
  };

  const handleNewChat = () => {
    setChatHistory([]);
    addLog('Neural chat buffer purged.', 'system');
  };

  const TabModule = ({ name, children }) => (
    <ErrorBoundary name={name} inline>
      <Suspense fallback={<GlassLoader label={`ESTABLISHING ${name.toUpperCase()} TETHER...`} size="lg" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="relative min-h-screen bg-[#020308] text-slate-100 font-sans selection:bg-[#00f3ff]/30 selection:text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {!isBooted ? (
          <BootScreen key="boot" onComplete={() => setIsBooted(true)} />
        ) : (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-screen w-full relative overflow-hidden crt-overlay"
          >
            <NeuralBackground />

            {/* Cinematic Sidebar */}
            <TabModule name="Chat Sidebar">
              <ChatSidebar
                chatHistory={chatHistory}
                onNewChat={handleNewChat}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </TabModule>

            <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
              {/* ── Multi-Agent OS Header ── */}
              <header className="px-8 py-5 flex items-center justify-between border-b border-[#00f3ff]/5 bg-black/60 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-6">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-[#00f3ff]"><Menu /></button>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-[0.6em] text-white flex items-center gap-4">
                      <div className="relative">
                         <div className="w-3 h-3 rounded-full bg-[#00f3ff]" />
                         <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#00f3ff] animate-ping" />
                      </div>
                      SHUBHAM AI <span className="font-light text-[#00f3ff]/60 text-xs tracking-[1em]">ECOSYSTEM</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                       <span className="text-[9px] font-mono font-bold text-cyan-400/80 uppercase tracking-widest flex items-center gap-2">
                         <Activity size={12} /> GLOBAL AI UPTIME: 99.98%
                       </span>
                       <span className="text-slate-800">|</span>
                       <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                         ACTIVE AGENTS: 6/6
                       </span>
                    </div>
                  </div>
                </div>

                {/* Agent Status Bar */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-2xl border border-white/5">
                   {Object.values(AGENTS).map(agent => (
                     <motion.div 
                        key={agent.id}
                        animate={{ 
                          opacity: activeAgentId === agent.id ? 1 : 0.3,
                          scale: activeAgentId === agent.id ? 1.1 : 1
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center relative group"
                        style={{ color: agent.color }}
                     >
                        <agent.icon size={16} />
                        {activeAgentId === agent.id && (
                          <motion.div layoutId="activeAgent" className="absolute -bottom-1 w-1 h-1 rounded-full bg-current" />
                        )}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-2 py-1 rounded text-[7px] font-mono text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                          {agent.name.toUpperCase()} [{agent.role.toUpperCase()}]
                        </div>
                     </motion.div>
                   ))}
                </div>

                <div className="hidden xl:flex items-center gap-1.5 p-1.5 bg-black/40 rounded-xl border border-white/5">
                  {[
                    { id: 'core',     icon: <Cpu size={14} />,            label: 'Network' },
                    { id: 'whatsapp', icon: <MessageCircle size={14} />,  label: 'Nexus' },
                    { id: 'memory',   icon: <Brain size={14} />,           label: 'Vault' },
                    { id: 'data',     icon: <Database size={14} />,       label: 'Oracle' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-[0.2em] transition-all ${
                        activeTab === tab.id ? 'bg-[#00f3ff] text-black shadow-[0_0_30px_rgba(0,243,255,0.4)]' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden lg:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </header>

              {/* ── Neural Workspace ── */}
              <div className="flex-1 p-6 overflow-hidden relative overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeTab === 'core' && (
                    <motion.div 
                      key="core"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="dashboard-grid h-full"
                    >
                      {/* Left HUD Panel - Diagnostics & Network */}
                      <div className="flex flex-col gap-6 h-full p-2">
                        <AgentNetwork activeAgentId={activeAgentId} communicatingWith={communicatingWith} />
                        <Console logs={logs} />
                      </div>

                      {/* Center Agent Core */}
                      <div className="flex flex-col h-full glass-panel border-[#00f3ff]/10">
                        <div className="flex-1 flex items-center justify-center p-8 relative">
                           <AgentOrb agentId={activeAgentId} state={coreState} isListening={isBrowserListening} />
                        </div>

                        {/* Dialogue Overlay */}
                        <div className="h-[300px] m-4 bg-black/60 rounded-3xl border border-white/5 flex flex-col p-6 backdrop-blur-2xl shadow-2xl">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-[0.3em]">Synaptic Stream</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-[8px] font-mono text-slate-500 uppercase">Latency: 24ms</span>
                                <span className="text-[8px] font-mono text-slate-500 uppercase">Uptime: 99.9%</span>
                             </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            {chatHistory.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                <Sparkles size={40} className="mb-4 text-cyan-400" />
                                <p className="text-xs font-mono tracking-[0.2em] uppercase leading-relaxed">
                                  Neural network online.<br/>Awaiting system command to initialize agent taskforce.
                                </p>
                              </div>
                            ) : (
                              chatHistory.map((chat, i) => (
                                <MessageBubble key={i} message={chat.cleanText} isUser={chat.sender === 'user'} isNew={i === chatHistory.length - 1} themeColor={activeAgentId === 'nexus' ? '#00f3ff' : AGENTS[activeAgentId?.toUpperCase()]?.color} />
                              ))
                            )}
                            {coreState === 'processing' && <TypingIndicator />}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendText} className="mt-6 flex gap-4 items-center">
                            <VoiceAssistant isListening={isBrowserListening} onToggle={toggleVoiceListen} />
                            <div className="flex-1 relative group">
                              <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all" />
                              <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={`ISSUE COMMAND TO ${activeAgentId.toUpperCase()}...`}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all relative z-10"
                              />
                            </div>
                            <button type="submit" className="p-4 bg-[#00f3ff] rounded-2xl text-black hover:bg-white shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center">
                               <Send size={20} />
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Right HUD Panel - Task Pipeline & Planner */}
                      <div className="flex flex-col gap-6 h-full p-2">
                        <TaskPipeline currentStage={currentStage} activeAgentId={activeAgentId} taskName={activeTaskName} />
                        <TabModule name="Planner">
                           <Planner />
                        </TabModule>
                        <div className="glass-panel p-6 flex flex-col gap-5">
                          <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Agent Resource Load</h3>
                          {Object.values(AGENTS).map(agent => (
                            <div key={agent.id} className="flex flex-col gap-2">
                              <div className="flex justify-between text-[9px] font-mono">
                                <span className={activeAgentId === agent.id ? 'text-white font-bold' : 'text-slate-500'}>{agent.name}</span>
                                <span style={{ color: agent.color }}>{activeAgentId === agent.id ? '92%' : '8%'}</span>
                              </div>
                              <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  animate={{ width: activeAgentId === agent.id ? '92%' : '8%' }} 
                                  className="h-full" 
                                  style={{ backgroundColor: agent.color }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab !== 'core' && (
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full pb-20">
                       {activeTab === 'whatsapp' && <TabModule name="WhatsApp Hub"><WhatsAppHub onLog={addLog} /></TabModule>}
                       {activeTab === 'memory' && <TabModule name="Memory Vault"><MemoryVault onLog={addLog} /></TabModule>}
                       {activeTab === 'data' && <TabModule name="Data Hub"><DataHub onLog={addLog} /></TabModule>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Cinematic OS Footer ── */}
              <footer className="px-8 py-3.5 border-t border-white/5 bg-black/80 flex items-center justify-between text-[10px] font-mono text-slate-600 relative z-40 backdrop-blur-2xl">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold tracking-widest">ECOSYSTEM ONLINE</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-6">
                    <span>MEMORY NODES: {memoriesCount}</span>
                    <span>ACTIVE THREADS: {Math.floor(Math.random() * 200 + 400)}</span>
                    <span>ENCRYPTION: AES-256-GCM</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <Zap size={12} className="text-amber-400" />
                      <span>POWER: 1.21 GW</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-[#00f3ff]" />
                      <span className="text-[#00f3ff] animate-pulse uppercase tracking-[0.4em] font-black">Autonomous Mode V3 Active</span>
                   </div>
                </div>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
