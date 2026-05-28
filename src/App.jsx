import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Send, MessageSquare, Brain, Radio, Calendar, Cpu, Sparkles, MessageCircle, Menu, FileText } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('core');
  const [coreStatus, setCoreStatus] = useState('sleeping');
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [isBrowserListening, setIsBrowserListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  const addLog = (text, type = 'system') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev.slice(-150), { text, type, time }]); // cap at 150 entries
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
    addLog('Shubham AI Neural Network active.', 'system');
    addLog('Memory registers loaded.', 'system');
    fetchMemoryCount();
    fetchChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── Process message ────────────────────────────────────────
  const processInput = async (messageText) => {
    if (!messageText?.trim()) return;

    setCoreStatus('processing');
    addLog(`User Command: "${messageText}"`, 'action');

    const { data, error } = await safeFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText }),
    });

    if (error) {
      setCoreStatus('sleeping');
      addLog(error, 'error');
      return;
    }

    const response = data?.response || 'No response received.';
    addLog(`AI Response: "${response}"`, 'response');

    if (data?.action) {
      addLog(`Automation: [${data.action.type}] ${JSON.stringify(data.action)}`, 'system');
      const actType = data.action.type;
      if (actType.startsWith('whatsapp')) setActiveTab('whatsapp');
      else if (actType.startsWith('save_memory') || actType === 'forget_memory') setActiveTab('memory');
      else if (actType === 'generate_site') setActiveTab('builder');
      else if (actType === 'analyze_data') setActiveTab('data');
    }

    setCoreStatus('speaking');
    fetchMemoryCount();
    fetchChatHistory();
    setTimeout(() => setCoreStatus('sleeping'), 4000);
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
    try {
      socket?.emit('toggle_listening', { enable: next });
    } catch (_) {}
    addLog(next ? 'Remote mic listening triggered.' : 'Remote mic listening disabled.', 'system');
  };

  const handleNewChat = () => {
    setChatHistory([]);
    addLog('New chat session initiated.', 'system');
  };

  const handleDeleteChat = (id) => {
    addLog(`Deleted chat session ${id}`, 'system');
  };

  // ── Suspense wrapper for tab modules ──────────────────────
  const TabModule = ({ name, children }) => (
    <ErrorBoundary name={name} inline>
      <Suspense fallback={<GlassLoader label={`LOADING ${name.toUpperCase()}...`} size="lg" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row relative overflow-hidden crt-overlay">
      {/* Sidebar */}
      <TabModule name="Chat Sidebar">
        <ChatSidebar
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </TabModule>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ── HUD Header ── */}
        <header className="border-b border-[#00f3ff]/10 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-1.5 rounded-lg border border-[#00f3ff]/30 text-[#00f3ff] bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20"
            >
              <Menu size={18} />
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-[#00f3ff] animate-ping" />
            <h1 className="text-sm font-mono font-extrabold tracking-[0.4em] text-white">
              SHUBHAM AI <span className="text-[#00f3ff] font-light animate-glitch cursor-default">OS_V3</span>
            </h1>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-2 border border-slate-800 bg-slate-950/60 p-1 rounded-xl">
            {[
              { id: 'core',     label: 'Reactor Core',  icon: <Radio size={12} />,           activeColor: 'bg-[#00f3ff]/10 text-[#00f3ff]' },
              { id: 'whatsapp', label: 'WhatsApp Hub',  icon: <MessageCircle size={12} />,   activeColor: 'bg-emerald-500/10 text-emerald-400' },
              { id: 'memory',   label: 'Memory Vault',  icon: <Brain size={12} />,           activeColor: 'bg-[#bd00ff]/10 text-[#bd00ff]' },
              { id: 'builder',  label: 'Web Builder',   icon: <Cpu size={12} />,             activeColor: 'bg-cyan-400/10 text-cyan-400' },
              { id: 'data',     label: 'Data Hub',      icon: <FileText size={12} />,        activeColor: 'bg-amber-400/10 text-amber-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-1.5 ${
                  activeTab === tab.id ? tab.activeColor : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6 font-mono text-[10px] text-slate-400">
            <div>COGNITIVE LINK: <span className="text-emerald-400 font-bold">STABLE</span></div>
            <div>DATE: {new Date().toLocaleDateString()}</div>
          </div>
        </header>

        {/* ── Main workspace ── */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* REACTOR CORE */}
            {activeTab === 'core' && (
              <motion.main
                key="core"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="dashboard-grid h-full p-6 gap-6"
              >
                {/* Left — Diagnostics */}
                <section className="flex flex-col gap-5 justify-between h-[75vh]">
                  <TabModule name="Status Panel">
                    <StatusPanel memoriesCount={memoriesCount} />
                  </TabModule>
                  <Console logs={logs} />
                </section>

                {/* Center — Orb + Chat */}
                <section className="glass-panel flex flex-col justify-between p-6 h-[75vh]">
                  <div className="flex-1 flex items-center justify-center">
                    <TabModule name="AI Orb">
                      <AIOrb coreStatus={coreStatus} isBrowserListening={isBrowserListening} />
                    </TabModule>
                  </div>

                  {/* Dialogue log */}
                  <div className="h-[220px] flex flex-col border border-slate-800/40 bg-slate-950/20 rounded-xl p-4 mt-4">
                    <span className="text-[9px] font-mono text-slate-500 block mb-2 uppercase tracking-widest flex items-center gap-1">
                      <MessageSquare size={10} /> dialogue interface
                    </span>
                    <div className="flex-1 overflow-y-auto pr-1 mb-3 custom-scrollbar">
                      {chatHistory.length === 0 ? (
                        <div className="text-center text-slate-500 font-mono text-xs py-8">
                          INITIATE SYSTEM LOG OR GREET WAKE WORD "HEY BUDDY"
                        </div>
                      ) : (
                        chatHistory.map((chat, index) => (
                          <MessageBubble
                            key={index}
                            message={chat.cleanText}
                            isUser={chat.sender === 'user'}
                            isNew={index === chatHistory.length - 1}
                          />
                        ))
                      )}
                      {coreStatus === 'processing' && <TypingIndicator />}
                      <div ref={chatEndRef} />
                    </div>

                    <RouteIndicator message={inputText} />

                    <form onSubmit={handleSendText} className="flex gap-2 items-center mt-1">
                      <VoiceAssistant isListening={isBrowserListening} onToggle={toggleVoiceListen} />
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Transmit query text or click mic..."
                        className="flex-1 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#00f3ff]/40"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff] hover:text-slate-950 transition-all"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </section>

                {/* Right — Planner */}
                <section className="flex flex-col gap-5 justify-between h-[75vh]">
                  <TabModule name="Planner">
                    <Planner />
                  </TabModule>
                </section>
              </motion.main>
            )}

            {/* WHATSAPP HUB */}
            {activeTab === 'whatsapp' && (
              <motion.div key="whatsapp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <TabModule name="WhatsApp Hub">
                  <WhatsAppHub onLog={addLog} />
                </TabModule>
              </motion.div>
            )}

            {/* MEMORY VAULT */}
            {activeTab === 'memory' && (
              <motion.div key="memory" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <TabModule name="Memory Vault">
                  <MemoryVault onLog={addLog} />
                </TabModule>
              </motion.div>
            )}

            {/* SITE BUILDER */}
            {activeTab === 'builder' && (
              <motion.div key="builder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <TabModule name="Site Builder">
                  <SiteBuilder onLog={addLog} />
                </TabModule>
              </motion.div>
            )}

            {/* DATA HUB */}
            {activeTab === 'data' && (
              <motion.div key="data" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <TabModule name="Data Hub">
                  <DataHub onLog={addLog} />
                </TabModule>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <footer className="bg-slate-950/20 border-t border-[#00f3ff]/5 py-2.5 px-6 flex items-center justify-between text-[9px] font-mono text-slate-500 z-10">
          <div className="flex items-center gap-2">
            <Brain size={12} className="text-[#00f3ff]" />
            <span>COGNITIVE FACTS LOADED: {memoriesCount}</span>
          </div>
          <div>SYSTEM STATUS: <span className="text-emerald-400 font-bold">ONLINE</span></div>
          <span>BUDDY COMPANION V3.5</span>
        </footer>
      </div>
    </div>
  );
};

export default App;
