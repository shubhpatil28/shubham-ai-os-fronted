import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Send, MessageSquare, Brain, Radio, Calendar, Cpu, Sparkles, MessageCircle, Menu, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// ── Core config ──────────────────────────────────────────────
import { API_URL, safeFetch } from './config/api';

// ── Always-needed components (eager) ────────────────────────
import ErrorBoundary from './components/ErrorBoundary';
import GlassLoader from './components/GlassLoader';
import FallbackCard from './components/FallbackCard';
import AIOrb from './components/AIOrb';
import MessageBubble from './components/MessageBubble';
import TypingIndicator from './components/TypingIndicator';
import VoiceAssistant from './components/VoiceAssistant';
import RouteIndicator from './components/RouteIndicator';
import StatusPanel from './components/StatusPanel';
import Console from './components/Console';
import BootScreen from './components/BootScreen';
import NeuralBackground from './components/NeuralBackground';

// ── Lazy-loaded tab modules ──────────────────────────────────
const ChatSidebar = lazy(() => import('./components/ChatSidebar').catch(() => ({ default: () => <FallbackCard name="Chat Sidebar" /> })));
const JarvisCore  = lazy(() => import('./components/JarvisCore').catch(() => ({ default: () => <FallbackCard name="Jarvis Core" /> })));
const Planner     = lazy(() => import('./components/Planner').catch(() => ({ default: () => <FallbackCard name="Planner" /> })));
const WhatsAppHub = lazy(() => import('./components/WhatsAppHub').catch(() => ({ default: () => <FallbackCard name="WhatsApp Hub" /> })));
const MemoryVault = lazy(() => import('./components/MemoryVault').catch(() => ({ default: () => <FallbackCard name="Memory Vault" /> })));
const SiteBuilder = lazy(() => import('./components/SiteBuilder').catch(() => ({ default: () => <FallbackCard name="Site Builder" /> })));
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
  const [coreState, setCoreState] = useState('sleeping');
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
      addLog('OS Environment sequence established.', 'system');
      addLog('Neural synaptic bridge active.', 'action');
      fetchMemoryCount();
      fetchChatHistory();
    }
  }, [isBooted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const processInput = async (messageText) => {
    if (!messageText?.trim()) return;

    setCoreState('processing');
    addLog(`Direct Input: "${messageText}"`, 'action');

    const { data, error } = await safeFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText }),
    });

    if (error) {
      setCoreState('warning');
      addLog(error, 'error');
      setTimeout(() => setCoreState('sleeping'), 3000);
      return;
    }

    const response = data?.response || 'Incomplete data received.';
    addLog(`AI Response: "${response.substring(0, 50)}..."`, 'response');

    if (data?.action) {
      addLog(`System Command Executed: ${data.action.type}`, 'system');
      const actType = data.action.type;
      if (actType.startsWith('whatsapp')) setActiveTab('whatsapp');
      else if (actType.startsWith('save_memory')) setActiveTab('memory');
      else if (actType === 'generate_site') setActiveTab('builder');
      else if (actType === 'analyze_data') setActiveTab('data');
    }

    setCoreState('speaking');
    fetchMemoryCount();
    fetchChatHistory();
    setTimeout(() => setCoreState('sleeping'), 4000);
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
    setCoreState(next ? 'listening' : 'sleeping');
    try {
      socket?.emit('toggle_listening', { enable: next });
    } catch (_) {}
    addLog(next ? 'Mic array listening...' : 'Mic array standby.', 'system');
  };

  const handleNewChat = () => {
    setChatHistory([]);
    addLog('Chat buffer cleared.', 'system');
  };

  const TabModule = ({ name, children }) => (
    <ErrorBoundary name={name} inline>
      <Suspense fallback={<GlassLoader label={`LOADING ${name.toUpperCase()}...`} size="lg" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="relative min-h-screen bg-[#020308] text-slate-100 font-sans selection:bg-[#00f3ff]/30 selection:text-white">
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

            <div className="flex-1 flex flex-col h-full relative z-10">
              {/* ── Holographic HUD Header ── */}
              <header className="px-8 py-5 flex items-center justify-between border-b border-[#00f3ff]/5 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-[#00f3ff]"><Menu /></button>
                  <div className="flex flex-col">
                    <h1 className="text-lg font-black tracking-[0.4em] text-white flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#00f3ff] shadow-[0_0_8px_#00f3ff] animate-pulse" />
                      SHUBHAM AI <span className="font-light text-[#00f3ff]/60 text-xs tracking-[0.8em]">OS V3</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[8px] font-mono text-emerald-500 flex items-center gap-1 uppercase tracking-widest font-bold">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" /> Neural Link: Online
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                        Kernel: 4.1.9-AI-CORE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
                  {[
                    { id: 'core',     icon: <Cpu size={14} />,            label: 'Reactor' },
                    { id: 'whatsapp', icon: <MessageCircle size={14} />,  label: 'Nexus' },
                    { id: 'memory',   icon: <Brain size={14} />,           label: 'Vault' },
                    { id: 'builder',  icon: <Sparkles size={14} />,       label: 'Forge' },
                    { id: 'data',     icon: <Database size={14} />,       label: 'Data' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all ${
                        activeTab === tab.id ? 'bg-[#00f3ff] text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden lg:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="hidden xl:flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">System Time</span>
                    <span className="text-xs font-mono text-white font-bold">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-[#00f3ff]/20 flex items-center justify-center bg-[#00f3ff]/5">
                    <div className="w-6 h-6 rounded-full border-2 border-t-[#00f3ff] border-transparent animate-spin" />
                  </div>
                </div>
              </header>

              {/* ── Neural Dashboard ── */}
              <div className="flex-1 p-6 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'core' && (
                    <motion.div 
                      key="core"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="dashboard-grid h-full"
                    >
                      {/* Left HUD Panel */}
                      <div className="flex flex-col gap-6 h-full p-2 overflow-y-auto">
                        <TabModule name="Status Panel">
                          <StatusPanel memoriesCount={memoriesCount} />
                        </TabModule>
                        <Console logs={logs} />
                      </div>

                      {/* Center AI Core */}
                      <div className="flex flex-col h-full glass-panel border-[#00f3ff]/10">
                        <div className="flex-1 flex items-center justify-center p-8">
                           <AIOrb state={coreState} />
                        </div>

                        {/* Dialogue Overlay */}
                        <div className="h-[250px] m-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col p-4">
                          <div className="flex items-center justify-between mb-3 px-2">
                             <div className="flex items-center gap-2 text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest">
                                <MessageSquare size={12} /> Neural Stream
                             </div>
                             <div className="text-[8px] font-mono text-slate-600">ENCRYPTED CONNECTION</div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {chatHistory.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                                <Sparkles size={32} className="mb-2 text-cyan-400" />
                                <p className="text-[10px] font-mono tracking-widest uppercase text-center">Neural pathways standby...<br/>Transmit prompt to initialize</p>
                              </div>
                            ) : (
                              chatHistory.map((chat, i) => (
                                <MessageBubble key={i} message={chat.cleanText} isUser={chat.sender === 'user'} isNew={i === chatHistory.length - 1} />
                              ))
                            )}
                            {coreState === 'processing' && <TypingIndicator />}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendText} className="mt-4 flex gap-3 items-center">
                            <VoiceAssistant isListening={isBrowserListening} onToggle={toggleVoiceListen} />
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="ISSUE SYSTEM COMMAND..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                              />
                            </div>
                            <button type="submit" className="p-3 bg-cyan-500 rounded-xl text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                               <Send size={18} />
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Right HUD Panel */}
                      <div className="flex flex-col gap-6 h-full p-2 overflow-y-auto">
                        <TabModule name="Planner">
                           <Planner />
                        </TabModule>
                        <div className="glass-panel p-5 flex flex-col gap-4">
                          <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Active Systems</h3>
                          {[
                            { name: 'Cognitive Engine', val: 92, col: 'bg-cyan-500' },
                            { name: 'Visual Cortex', val: 45, col: 'bg-purple-500' },
                            { name: 'Memory Array', val: 78, col: 'bg-emerald-500' }
                          ].map(s => (
                            <div key={s.name} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                                <span>{s.name}</span>
                                <span>{s.val}%</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${s.val}%` }} className={`h-full ${s.col}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Modules - using same pattern as before but with motion */}
                  {activeTab !== 'core' && (
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full">
                       {activeTab === 'whatsapp' && <TabModule name="WhatsApp Hub"><WhatsAppHub onLog={addLog} /></TabModule>}
                       {activeTab === 'memory' && <TabModule name="Memory Vault"><MemoryVault onLog={addLog} /></TabModule>}
                       {activeTab === 'builder' && <TabModule name="Site Builder"><SiteBuilder onLog={addLog} /></TabModule>}
                       {activeTab === 'data' && <TabModule name="Data Hub"><DataHub onLog={addLog} /></TabModule>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Status Bar Footer ── */}
              <footer className="px-8 py-2.5 border-t border-white/5 bg-black/60 flex items-center justify-between text-[9px] font-mono text-slate-600">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SYSTEM ENGINE: NORMAL</span>
                  <span className="hidden sm:inline">NODES ACTIVE: {Math.floor(Math.random() * 50 + 20)}</span>
                </div>
                <div className="flex items-center gap-4">
                   <ChevronRight size={10} className="text-[#00f3ff]" />
                   <span className="text-[#00f3ff] animate-pulse uppercase tracking-[0.3em] font-bold">Transmitting Telemetry...</span>
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
