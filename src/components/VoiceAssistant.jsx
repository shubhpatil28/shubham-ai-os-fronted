import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';

// ── Jarvis-style TTS with command-specific acknowledgements ─────────────────
const VOICE_PHRASES = {
  'open chrome':     'Opening Chrome, sir.',
  'chrome':          'Opening Chrome, sir.',
  'open vscode':     'Launching Visual Studio Code.',
  'vscode':          'Launching Visual Studio Code.',
  'vs code':         'Launching Visual Studio Code.',
  'code':            'Launching Visual Studio Code.',
  'open whatsapp':   'Opening WhatsApp.',
  'whatsapp':        'Opening WhatsApp.',
  'open downloads':  'Opening Downloads folder.',
  'downloads':       'Opening Downloads folder.',
  'open documents':  'Opening Documents folder.',
  'documents':       'Opening Documents folder.',
  'shutdown pc':     'Warning. Shutdown sequence initiated.',
  'shutdown':        'Warning. Shutdown sequence initiated.',
  'shut down':       'Warning. Shutdown sequence initiated.',
  'restart pc':      'Warning. Restart sequence initiated.',
  'restart':         'Warning. Restart sequence initiated.',
  'reboot':          'Warning. Restart sequence initiated.',
};

function buildPhrase(transcript) {
  const t = transcript.trim().toLowerCase();
  // Check exact phrases first
  if (VOICE_PHRASES[t]) return VOICE_PHRASES[t];
  // Parameterised: create folder <name>
  if (t.startsWith('create folder') || t.startsWith('make folder') || t.startsWith('new folder')) {
    const name = t.replace(/^(create|make|new) folder\s*/i, '').trim();
    return name ? `Creating folder ${name}.` : 'Creating new folder.';
  }
  return `Executing: ${transcript}.`;
}

export function speak(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate   = 1;
  utterance.pitch  = 0.9;
  utterance.volume = 1;
  // Prefer a deep/robotic English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /google us english|zira|david/i.test(v.name));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ── Status badge mapping ─────────────────────────────────────────────────────
const STATUS_MAP = {
  standby:    { label: 'STANDBY',     color: 'text-slate-500' },
  listening:  { label: 'LISTENING...', color: 'text-emerald-400 animate-pulse' },
  processing: { label: 'PROCESSING...', color: 'text-cyan-400 animate-pulse' },
  executing:  { label: 'EXECUTING...',  color: 'text-amber-400 animate-pulse' },
};

// ── Component ────────────────────────────────────────────────────────────────
const VoiceAssistant = ({ isListening, onToggle, onCommand }) => {
  const [micStatus,  setMicStatus]  = useState('unknown');
  const [voiceStatus, setVoiceStatus] = useState('standby');
  const recognitionRef = useRef(null);
  const activeRef      = useRef(false); // tracks live recognition session

  // ── Check browser capability ──
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      return;
    }

    navigator.permissions
      ?.query({ name: 'microphone' })
      .then(result => {
        setMicStatus(result.state === 'denied' ? 'denied' : 'available');
        result.onchange = () =>
          setMicStatus(result.state === 'denied' ? 'denied' : 'available');
      })
      .catch(() => setMicStatus('available'));
  }, []);

  // ── Build recognition instance once ──
  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = false;
    rec.lang            = 'en-US';

    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();

      console.log('VOICE_COMMAND_RECEIVED', transcript);
      setVoiceStatus('processing');

      const phrase = buildPhrase(transcript);
      speak(phrase);

      requestAnimationFrame(() => {
        setVoiceStatus('executing');
        onCommand?.(transcript);
        console.log('VOICE_COMMAND_EXECUTED', transcript);
        setTimeout(() => {
          if (activeRef.current) setVoiceStatus('listening');
        }, 1500);
      });
    };

    rec.onerror = (e) => {
      console.warn('[VoiceAssistant] Recognition error:', e.error);
      speak('Microphone error detected.');
      if (e.error !== 'no-speech') {
        activeRef.current = false;
        setVoiceStatus('standby');
        onToggle?.(); // sync parent state
      }
    };

    // Re-start automatically while still "on"
    rec.onend = () => {
      if (activeRef.current) {
        try { rec.start(); } catch (_) {}
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, [onCommand, onToggle]);

  // ── Sync with parent's isListening toggle ──
  useEffect(() => {
    if (micStatus !== 'available') return;
    const rec = getRecognition();
    if (!rec) return;

    if (isListening && !activeRef.current) {
      activeRef.current = true;
      try {
        rec.start();
        setVoiceStatus('listening');
        console.log('VOICE_RECOGNITION_STARTED');
        speak('Voice assistant online. Listening.');
      } catch (e) {
        console.warn('[VoiceAssistant] Start error:', e);
      }
    } else if (!isListening && activeRef.current) {
      activeRef.current = false;
      try { rec.stop(); } catch (_) {}
      setVoiceStatus('standby');
      console.log('VOICE_RECOGNITION_STOPPED');
      speak('Voice assistant offline. Standing by.');
    }
  }, [isListening, micStatus, getRecognition]);

  // ── Cleanup on unmount ──
  useEffect(() => () => {
    activeRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_) {}
  }, []);

  // ── Render: unsupported ──
  if (micStatus === 'unsupported') {
    return (
      <div
        title="Voice assistant unavailable on this device"
        className="flex items-center gap-1.5 p-3 rounded-full border border-slate-700 bg-slate-900/40 text-slate-600 cursor-not-allowed"
      >
        <AlertTriangle size={16} className="text-amber-500/60" />
      </div>
    );
  }

  // ── Render: mic denied ──
  if (micStatus === 'denied') {
    return (
      <div
        title="Microphone permission denied. Enable mic in browser settings."
        className="p-3 rounded-full border border-red-500/20 bg-red-900/10 text-red-500/60 cursor-not-allowed"
      >
        <MicOff size={18} />
      </div>
    );
  }

  // ── Render: normal ──
  const status = STATUS_MAP[voiceStatus] || STATUS_MAP.standby;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Status badge */}
      <span className={`text-[8px] font-mono font-black tracking-[0.25em] uppercase ${status.color}`}>
        {status.label}
      </span>

      <div className="relative flex items-center justify-center">
        {/* Pulse rings when active */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-[-10px] rounded-full border border-red-500/30 animate-pulse" />
          </>
        )}

        <button
          type="button"
          id="voice-toggle-btn"
          onClick={() => {
            try { onToggle(); } catch (e) { console.warn('[VoiceAssistant] Toggle error:', e); }
          }}
          className={`relative z-10 p-3 rounded-full border transition-all duration-300 shadow-lg ${
            isListening
              ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-500/30'
              : 'bg-[#bd00ff]/10 border-[#bd00ff]/30 text-[#bd00ff] hover:bg-[#bd00ff] hover:text-white shadow-[0_0_10px_rgba(189,0,255,0.2)]'
          }`}
          title={isListening ? 'Stop Listening' : 'Start Jarvis Voice Assistant'}
        >
          {isListening
            ? <Mic size={20} className="animate-pulse" />
            : <MicOff size={20} />
          }
        </button>
      </div>
    </div>
  );
};

export default VoiceAssistant;
