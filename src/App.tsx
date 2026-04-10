import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Peer, DataConnection } from 'peerjs';
import { 
  UploadCloud, Copy, CheckCircle2, AlertCircle, Loader2, Download, 
  Wifi, FileBox, X, Share2, QrCode, Lock, Zap, Infinity, ArrowRight, Moon, Sun, Type, FileUp, MessageSquare, Instagram, Github, Info, Heart, Mail, Wrench
} from 'lucide-react';

// --- TYPES ---
type SharePayload = { type: 'files'; data: File[] } | { type: 'text'; data: string };

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.error('Modern copy failed', err);
    }
  }
  // Fallback for older browsers
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatEta = (seconds: number) => {
  if (seconds === Infinity || seconds === 0 || isNaN(seconds)) return 'Calculating...';
  if (seconds < 60) return `${Math.round(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s left`;
};

// --- CUSTOM HOOK FOR SPEED & ETA ---
const useTransferSpeed = () => {
  const [speed, setSpeed] = useState(0); 
  const [eta, setEta] = useState(Infinity);
  const lastTimeRef = useRef(Date.now());
  const lastBytesRef = useRef(0);

  const updateSpeed = useCallback((currentBytes: number, totalBytes: number) => {
    const now = Date.now();
    const timeDiff = now - lastTimeRef.current;
    
    if (timeDiff >= 500) { 
      const bytesDiff = currentBytes - lastBytesRef.current;
      const currentSpeed = (bytesDiff / timeDiff) * 1000; 
      setSpeed(currentSpeed);

      const remainingBytes = totalBytes - currentBytes;
      setEta(currentSpeed > 0 ? remainingBytes / currentSpeed : Infinity);

      lastTimeRef.current = now;
      lastBytesRef.current = currentBytes;
    }
  }, []);

  const resetSpeed = useCallback(() => {
    setSpeed(0); setEta(Infinity);
    lastTimeRef.current = Date.now();
    lastBytesRef.current = 0;
  }, []);

  return { speed, eta, updateSpeed, resetSpeed };
};

// --- BACKGROUND & HEADER COMPONENTS ---
const BackgroundShapes = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[5%] w-32 h-32 bg-[#7B3F00]/5 dark:bg-[#d4a373]/5 rounded-3xl rotate-12 blur-sm" />
    <motion.div animate={{ y: [0, 40, 0], rotate: [0, -15, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[10%] right-[5%] w-48 h-48 bg-[#C68E17]/10 dark:bg-[#e5b342]/10 rounded-full blur-md" />
  </div>
);

const ChocolateHeader = () => (
  <div className="fixed top-0 left-0 w-full overflow-hidden leading-none z-0 pointer-events-none opacity-50 dark:opacity-30">
    <svg className="relative block w-full h-[80px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#3C1F00" className="dark:fill-[#110800]"></path>
    </svg>
  </div>
);

const ProgressBar = ({ progress, statusText, speed = 0, eta = Infinity }: { progress: number; statusText: string; speed?: number; eta?: number }) => (
  <div className="w-full mt-4">
    <div className="flex justify-between text-sm font-semibold text-[#7B3F00] dark:text-[#d4a373] mb-2 transition-colors">
      <span>{statusText}</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="h-4 w-full bg-[#FFFDD0] dark:bg-[#1a0b00] rounded-full border border-[#7B3F00]/20 dark:border-[#d4a373]/20 overflow-hidden shadow-inner transition-colors">
      <motion.div className="h-full bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: "linear", duration: 0.2 }} />
    </div>
    {speed > 0 && progress < 100 && (
      <div className="flex justify-between text-xs font-bold text-[#7B3F00]/70 dark:text-[#d4a373]/70 mt-2 transition-colors">
        <span>⚡ {formatBytes(speed)}/s</span>
        <span>⏱️ {formatEta(eta)}</span>
      </div>
    )}
  </div>
);

// --- MODALS & VIEWS ---
const ReceiveModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [code, setCode] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    // 🔥 FIX 1: Convert to uppercase secretly behind the scenes when submitting!
    let peerId = code.trim().toUpperCase();
    
    // Safety check just in case they pasted a full URL
    if (peerId.includes('#/RECEIVE/')) peerId = peerId.split('#/RECEIVE/')[1];
    
    window.location.hash = `#/receive/${peerId}`;
    onClose(); setCode('');
  };

  return (
    <div className="fixed inset-0 bg-[#3C1F00]/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-[#2d1a0a] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#7B3F00]/20 dark:border-[#d4a373]/20 transition-colors">
        <div className="bg-[#7B3F00] dark:bg-[#1a0b00] p-6 text-white flex justify-between items-center transition-colors">
          <h3 className="text-xl font-bold flex items-center gap-2"><QrCode className="w-6 h-6"/> Receive Content</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-8">
          <p className="text-[#7B3F00] dark:text-[#d4a373] mb-6 font-medium transition-colors">Enter the secure code or paste the full link shared by the sender below.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* 🔥 FIX 2: Removed .toUpperCase() from onChange, and added 'uppercase' to the end of the className */}
            <input 
              type="text" 
              placeholder="e.g. A7X9P2" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              className="w-full px-4 py-4 rounded-xl border-2 border-[#C68E17]/30 dark:border-[#e5b342]/30 bg-transparent dark:text-white focus:border-[#7B3F00] dark:focus:border-[#e5b342] focus:ring-2 focus:ring-[#7B3F00]/20 outline-none transition-all text-[#3C1F00] font-bold text-center text-xl tracking-widest uppercase" 
              autoFocus 
            />
            
            <button type="submit" disabled={!code.trim()} className="w-full py-4 bg-[#C68E17] hover:bg-[#7B3F00] dark:bg-[#e5b342] dark:hover:bg-[#c28415] disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              Connect & Receive <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <motion.div whileHover={{ y: -5 }} className="bg-white/60 dark:bg-[#2d1a0a]/60 backdrop-blur-sm p-8 rounded-3xl shadow-sm border border-[#7B3F00]/10 dark:border-[#d4a373]/10 flex flex-col items-center text-center transition-colors">
    <div className="w-16 h-16 bg-[#FFFDD0] dark:bg-[#1a0b00] text-[#7B3F00] dark:text-[#e5b342] rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-extrabold text-[#3C1F00] dark:text-white mb-3 transition-colors">{title}</h3>
    <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/80 font-medium leading-relaxed transition-colors">{desc}</p>
  </motion.div>
);

const MaintenanceView = () => (
  <div className="min-h-screen bg-[#FFFDD0] dark:bg-[#110800] text-[#3C1F00] dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
    <BackgroundShapes />
    <ChocolateHeader />
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-lg w-full bg-white/90 dark:bg-[#2d1a0a]/90 backdrop-blur-md rounded-3xl shadow-2xl border border-[#7B3F00]/10 dark:border-[#d4a373]/10 p-10 text-center relative z-10"
    >
      <motion.div 
        animate={{ rotate: [0, -10, 10, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="w-20 h-20 bg-[#FFFDD0] dark:bg-[#1a0b00] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#C68E17]/30 dark:border-[#e5b342]/30"
      >
        <Wrench className="w-10 h-10 text-[#7B3F00] dark:text-[#e5b342]" />
      </motion.div>
      
      <h1 className="text-3xl font-black mb-4 text-[#3C1F00] dark:text-white tracking-tight">We're upgrading the machinery.</h1>
      <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/80 font-medium mb-8 leading-relaxed">
        ChocoShare is currently undergoing scheduled maintenance to improve speed and security. We'll be back online shortly. Grab a coffee and check back in a few minutes!
      </p>
      
      <div className="inline-flex items-center justify-center gap-2 bg-[#FFFDD0]/50 dark:bg-[#1a0b00]/50 px-6 py-3 rounded-full border border-[#7B3F00]/20 dark:border-[#d4a373]/20">
        <div className="w-2 h-2 bg-[#C68E17] dark:bg-[#e5b342] rounded-full animate-ping"></div>
        <span className="text-sm font-bold text-[#7B3F00] dark:text-[#d4a373] uppercase tracking-wider">System Status: Maintenance</span>
      </div>
    </motion.div>
  </div>
);

const HomeView = ({ onShare }: { onShare: (payload: SharePayload) => void }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onShare({ type: 'files', data: Array.from(e.dataTransfer.files) });
    }
  }, [onShare]);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onShare({ type: 'text', data: textInput.trim() });
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-20">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.4, duration: 0.8 }} 
        className="w-full max-w-xl mx-auto mt-4 sm:mt-8 bg-white/90 dark:bg-[#2d1a0a]/90 backdrop-blur-md rounded-3xl shadow-2xl border border-[#7B3F00]/10 dark:border-[#d4a373]/10 p-8 md:p-8 transition-colors"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-4 bg-[#FFFDD0] dark:bg-[#1a0b00] rounded-full mb-4 shadow-sm border border-[#C68E17]/30 dark:border-[#e5b342]/30 transition-colors">
            <Share2 className="w-10 h-10 text-[#7B3F00] dark:text-[#e5b342]" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#3C1F00] dark:text-white mb-2 transition-colors">Share Securely</h2>
          <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/80 font-medium transition-colors">Direct device-to-device transfer. Fast and Encrypted.</p>
        </div>

        {/* --- TABS --- */}
        <div className="flex bg-[#FFFDD0] dark:bg-[#1a0b00] p-1 rounded-2xl mb-8 border border-[#7B3F00]/10 dark:border-[#d4a373]/10">
          <button onClick={() => setActiveTab('files')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'files' ? 'bg-white dark:bg-[#2d1a0a] text-[#C68E17] dark:text-[#e5b342] shadow-sm' : 'text-[#7B3F00]/60 dark:text-[#d4a373]/60 hover:text-[#7B3F00] dark:hover:text-[#d4a373]'}`}>
            <FileUp className="w-4 h-4" /> Files
          </button>
          <button onClick={() => setActiveTab('text')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'text' ? 'bg-white dark:bg-[#2d1a0a] text-[#C68E17] dark:text-[#e5b342] shadow-sm' : 'text-[#7B3F00]/60 dark:text-[#d4a373]/60 hover:text-[#7B3F00] dark:hover:text-[#d4a373]'}`}>
            <Type className="w-4 h-4" /> Text / Links
          </button>
        </div>

        {/* --- FILE UPLOAD AREA --- */}
        {activeTab === 'files' && (
          <div
            className={`relative border-4 border-dashed rounded-3xl p-6 md:p-8 text-center transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center ${
              isDragging ? "border-[#C68E17] dark:border-[#e5b342] bg-[#FFFDD0]/50 dark:bg-[#1a0b00]/50 scale-105" : "border-[#7B3F00]/30 dark:border-[#d4a373]/30 hover:border-[#7B3F00]/60 dark:hover:border-[#d4a373]/60 hover:bg-[#FFFDD0]/20 dark:hover:bg-[#1a0b00]/30"
            }`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && e.target.files.length > 0 && onShare({ type: 'files', data: Array.from(e.target.files) })} />
            <motion.div animate={{ y: isDragging ? -10 : 0 }}>
              <UploadCloud className={`w-16 h-16 mb-4 transition-colors ${isDragging ? "text-[#C68E17] dark:text-[#e5b342]" : "text-[#7B3F00]/50 dark:text-[#d4a373]/50"}`} />
            </motion.div>
            <p className="text-xl font-bold text-[#3C1F00] dark:text-white mb-2 transition-colors">
              {isDragging ? "Drop them like they're hot!" : "Drag & Drop your files here"}
            </p>
            <p className="text-sm text-[#7B3F00]/70 dark:text-[#d4a373]/80 font-semibold bg-[#FFFDD0] dark:bg-[#1a0b00] px-4 py-1 rounded-full mt-2 border border-[#7B3F00]/10 dark:border-[#d4a373]/10 transition-colors">or click to browse</p>
          </div>
        )}

        {/* --- TEXT INPUT AREA --- */}
        {activeTab === 'text' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <textarea 
              placeholder="Paste a link, API key, or write a message here..." 
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-40 p-4 rounded-2xl bg-[#FFFDD0]/30 dark:bg-[#1a0b00]/30 border-2 border-[#7B3F00]/20 dark:border-[#d4a373]/20 focus:border-[#C68E17] dark:focus:border-[#e5b342] text-[#3C1F00] dark:text-white outline-none resize-none transition-colors"
            />
            <button 
              onClick={handleTextSubmit} 
              disabled={!textInput.trim()}
              className="w-full py-4 bg-[#C68E17] hover:bg-[#7B3F00] dark:bg-[#e5b342] dark:hover:bg-[#c28415] disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Generate Share Code <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </motion.div>

      <motion.div id="how-it-works" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="w-full max-w-6xl mx-auto mt-32 px-4 scroll-mt-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#3C1F00] dark:text-white mb-6 tracking-tight transition-colors">How ChocoShare Works ?</h2>
          <p className="text-lg text-[#7B3F00] dark:text-[#d4a373] max-w-2xl mx-auto font-medium transition-colors">
            Unlike other services, ChocoShare doesn't store your files or text on a server. We use Peer-to-Peer (P2P) WebRTC technology to connect your device directly to the receiver. It's just you and them.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <FeatureCard icon={<Infinity className="w-8 h-8" />} title="No Size Limits" desc="Because data goes directly from your device to theirs, there are no cloud storage limits. Send 10MB or 100GB seamlessly." />
          <FeatureCard icon={<Lock className="w-8 h-8" />} title="End-to-End Encrypted" desc="Your data is heavily encrypted during transit. Since it never passes through a central server, no one else can read it." />
          <FeatureCard icon={<Zap className="w-8 h-8" />} title="Lightning Fast" desc="Data takes the absolute shortest path. If both devices are on the same WiFi network, files transfer at local network speeds." />
        </div>
      </motion.div>
    </div>
  );
};

// --- INDIVIDUAL TRANSFER TASK (For 1-to-Many Sharing) ---
const TransferTask = ({ conn, payload }: { conn: DataConnection, payload: SharePayload }) => {
  const [status, setStatus] = useState<string>('connecting'); 
  const [progress, setProgress] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState({ current: 0, total: payload.type === 'files' ? payload.data.length : 1 });
  const { speed, eta, updateSpeed, resetSpeed } = useTransferSpeed();

  useEffect(() => {
    let currentIndex = 0;
    let isTransferring = false; 
    let lastUiUpdate = 0;

    const sendInitialData = () => {
      if (payload.type === 'text') {
        conn.send({ type: 'text_message', data: payload.data });
        setStatus('complete');
      } else {
        const files = payload.data;
        if (currentIndex >= files.length) {
          setStatus('complete'); conn.send({ type: 'all_done' }); return;
        }
        const file = files[currentIndex];
        setFileProgress({ current: currentIndex + 1, total: files.length });
        resetSpeed(); 
        lastUiUpdate = 0; 
        conn.send({ type: 'metadata', name: file.name, size: file.size, mime: file.type || 'application/octet-stream' });
      }
    };
    
    if (conn.open) sendInitialData();
    else conn.on('open', () => sendInitialData());

    const CHUNK_SIZE = 256 * 1024; 
    
    const sendNextChunk = async (file: File, offset: number) => {
      if (offset >= file.size) { conn.send({ type: 'eof' }); return; }
      
      if (conn.dataChannel && conn.dataChannel.bufferedAmount > 1024 * 1024 * 16) {
        setTimeout(() => sendNextChunk(file, offset), 5); return; 
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer(); 
      
      conn.send(buffer);
      const newOffset = offset + CHUNK_SIZE;
      
      if (newOffset - lastUiUpdate > 1024 * 1024 || newOffset >= file.size) {
         setProgress(Math.min(100, (newOffset / file.size) * 100));
         lastUiUpdate = newOffset;
      }
      updateSpeed(newOffset, file.size);
      setTimeout(() => sendNextChunk(file, newOffset), 0); 
    };

    conn.on('data', (data: any) => {
      if (data.type === 'request_metadata') {
        if (!isTransferring) sendInitialData();
      }
      else if (data.type === 'ready' && payload.type === 'files') {
        if (!isTransferring) {
          isTransferring = true; setStatus('transferring'); sendNextChunk(payload.data[currentIndex], 0); 
        }
      } 
      else if (data.type === 'done' && payload.type === 'files') {
        currentIndex++; isTransferring = false; sendInitialData();
      }
    });
    
    conn.on('close', () => { setStatus(prev => prev !== 'complete' ? 'error' : prev); });
  }, [conn, payload, resetSpeed, updateSpeed]); 

  return (
    <div className="w-full bg-[#FFFDD0]/60 dark:bg-[#1a0b00]/60 p-4 rounded-xl border border-[#7B3F00]/20 dark:border-[#d4a373]/20 mb-3 shadow-sm transition-colors">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-[#3C1F00] dark:text-white text-sm flex items-center gap-2">
          {status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : status === 'error' ? <X className="w-4 h-4 text-red-500" /> : <Loader2 className="w-4 h-4 animate-spin text-[#C68E17]" />}
          Guest: {conn.peer.substring(0, 6).toUpperCase()}
        </span>
        <span className={`text-xs font-bold uppercase tracking-wider ${status === 'complete' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-[#7B3F00]/70 dark:text-[#d4a373]/70'}`}>
          {status}
        </span>
      </div>
      {status === 'transferring' && <ProgressBar progress={progress} statusText={`File ${fileProgress.current}/${fileProgress.total}`} speed={speed} eta={eta} />}
    </div>
  );
};

// --- SENDER VIEW (The Room) ---
const SenderView = ({ payload, onCancel}: { payload: SharePayload; onCancel: () => void }) => {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [receivers, setReceivers] = useState<DataConnection[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  
  const peerRef = useRef<Peer | null>(null);
  const shareUrl = peerId ? `${window.location.origin}${window.location.pathname}#/receive/${peerId}` : '';

  useEffect(() => {
    // 🔥 Generates a highly secure 6-character Alphanumeric code (e.g., A7X9P2)
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const peer = new Peer(id, {
      config: {
        iceServers: [
          { urls: "stun:stun.relay.metered.ca:80" },
          { urls: "stun:free.expressturn.com:3478" },
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
          {
            urls: "turn:free.expressturn.com:3478?transport=tcp",
            username: "000000002088860057",
            credential: "I+TSjeTYD3+Jd/eANOhkPvvTh8k="
          },
          {
            urls: "turn:free.expressturn.com:3478",
            username: "000000002088916220",
            credential: "nhYjASv8X4q9sOPjsK1VyVxn32c="
          }
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => setPeerId(id));
    
    // 🔥 1-to-Many Magic: Every time a new person connects, add them to the list!
    peer.on('connection', (conn) => {
      // Must use reliable:true and binary serialization for high-speed buffers
      conn.serialization = 'binary';
      setReceivers(prev => [...prev, conn]);
    });
    
    peer.on('error', (err) => console.error(err));
    return () => peer.destroy();
  }, []); 

  const handleCopy = () => { copyToClipboard(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="w-full max-w-[500px] mx-auto bg-white/95 dark:bg-[#2d1a0a]/95 backdrop-blur-md rounded-3xl shadow-2xl border border-[#7B3F00]/10 dark:border-[#d4a373]/10 overflow-hidden transition-colors">
      <div className="p-4 text-center text-white font-bold flex items-center justify-center gap-2 bg-[#C68E17] dark:bg-[#e5b342]">
        {!peerId ? <><Loader2 className="animate-spin" /> Securing Room...</> : <><div className="w-3 h-3 bg-white rounded-full animate-pulse" /> Room Open - Waiting for Guests</>}
      </div>

      <div className="p-8 flex flex-col items-center">
        <div className="flex items-center gap-3 w-full bg-[#FFFDD0]/50 dark:bg-[#1a0b00]/50 p-4 rounded-xl mb-6 border border-[#7B3F00]/20 dark:border-[#d4a373]/20 transition-colors">
          {payload.type === 'files' ? ( <FileBox className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" /> ) : ( <MessageSquare className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" /> )}
          <div className="overflow-hidden">
            {payload.type === 'files' ? (
              <>
                <p className="font-bold text-[#3C1F00] dark:text-white truncate">{payload.data.length} File{payload.data.length > 1 ? 's' : ''} Ready</p>
                <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{formatBytes(payload.data.reduce((acc, file) => acc + file.size, 0))}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-[#3C1F00] dark:text-white truncate">Secure Text Snippet</p>
                <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{payload.data.length} characters</p>
              </>
            )}
          </div>
        </div>

        {peerId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full mb-6">
                <div className="bg-white p-3 rounded-2xl border-4 border-[#C68E17] dark:border-[#e5b342] shadow-lg shrink-0 hover:scale-105 transition-transform">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&color=3C1F00`} alt="QR Code" className="w-[120px] h-[120px]" />
                </div>
                <div className="bg-[#FFFDD0] dark:bg-[#1a0b00] border-2 border-[#C68E17] dark:border-[#e5b342] rounded-2xl w-full h-full p-4 text-center shadow-inner relative overflow-hidden flex flex-col justify-center min-h-[148px] transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415]"></div>
                  <p className="text-[#7B3F00] dark:text-[#d4a373] font-bold mb-1 uppercase tracking-wider text-[10px]">Share Code</p>
                  <div className="text-4xl sm:text-3xl md:text-4xl font-black text-[#3C1F00] dark:text-white tracking-[0.1em] drop-shadow-sm">{peerId}</div>
                  <p className="text-[#7B3F00]/70 dark:text-[#d4a373]/70 text-[10px] mt-2 font-medium">Scan QR or enter code</p>
                </div>
            </div>
            
            <div className="w-full flex gap-3 mb-6">
              <button onClick={handleCopy} className="flex-1 bg-white dark:bg-[#1a0b00] border-2 border-[#7B3F00]/20 dark:border-[#d4a373]/20 hover:border-[#7B3F00] dark:hover:border-[#e5b342] text-[#7B3F00] dark:text-[#e5b342] p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied Link" : "Copy Link"}
              </button>
            </div>

            {/* --- LIST OF ACTIVE GUESTS --- */}
            <div className="w-full">
              {receivers.length > 0 && <p className="text-sm font-bold text-[#7B3F00] dark:text-[#d4a373] mb-2 uppercase tracking-wider text-left">Active Transfers ({receivers.length})</p>}
              <AnimatePresence>
                {receivers.map((conn, index) => (
                  <motion.div key={index} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <TransferTask conn={conn} payload={payload} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

          </motion.div>
        )}

        <button onClick={onCancel} className="mt-4 text-sm text-[#7B3F00]/70 dark:text-[#d4a373]/70 hover:text-red-500 font-semibold underline-offset-2 hover:underline">Close Room & Stop Sharing</button>
      </div>
    </motion.div>
  );
};

const ReceiverView = ({ senderId }: { senderId: string }) => {
  const [status, setStatus] = useState<string>('connecting'); 
  const [progress, setProgress] = useState<number>(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [receivedText, setReceivedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { speed, eta, updateSpeed, resetSpeed } = useTransferSpeed(); 

  useEffect(() => {
    let activeUrls: string[] = []; 
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.relay.metered.ca:80" },
          { urls: "stun:free.expressturn.com:3478" },
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
          {
            urls: "turn:free.expressturn.com:3478?transport=tcp",
            username: "000000002088860057",
            credential: "I+TSjeTYD3+Jd/eANOhkPvvTh8k="
          },
          {
            urls: "turn:free.expressturn.com:3478",
            username: "000000002088916220",
            credential: "nhYjASv8X4q9sOPjsK1VyVxn32c="
          }
        ]
      }
    });
    let handshakeInterval: any;

    peer.on('open', () => {
      // 🔥 Add serialization: 'binary' here
      const conn = peer.connect(senderId, { reliable: true, serialization: 'binary' });
      let chunks: any[] = []; 
      let receivedSize = 0; 
      let fileMeta: any = null;
      let lastUiUpdate = 0; // 🔥 Added UI Throttle tracker

      conn.on('open', () => {
        setStatus('connecting');
        conn.send({ type: 'request_metadata' });
        
        handshakeInterval = setInterval(() => {
          if (conn.open) {
            conn.send({ type: 'request_metadata' });
          }
        }, 1000);
      });

      conn.on('data', (data: any) => {
        
        // 🔥 THE BULLETPROOF CHECK: If it doesn't have a 'type' property, it is our raw file chunk!
        if (!data.type) {
          chunks.push(data); 
          
          // Safely get the size no matter what weird binary format the browser uses
          const chunkSize = data.byteLength || data.size || data.length || 0;
          receivedSize += chunkSize;
          
          // 🔥 UI Throttle for Receiver (Updates every 1MB to prevent lag)
          if (receivedSize - lastUiUpdate > 1024 * 1024 || receivedSize >= fileMeta.size) {
             setProgress(Math.min(100, (receivedSize / fileMeta.size) * 100));
             lastUiUpdate = receivedSize;
          }
          updateSpeed(receivedSize, fileMeta.size);
          return;
        }

        // --- Handle JSON Objects for Control Messages ---
        if (data.type === 'metadata' || data.type === 'text_message') {
          if (handshakeInterval) clearInterval(handshakeInterval);
        }

        if (data.type === 'text_message') {
          setReceivedText(data.data);
          setStatus('complete');
        }
        else if (data.type === 'metadata') {
          fileMeta = data; setMetadata(data); chunks = []; receivedSize = 0; lastUiUpdate = 0; setProgress(0); setStatus('receiving'); 
          resetSpeed(); 
          conn.send({ type: 'ready' }); 
        } 
        else if (data.type === 'chunk') {
           // Fallback just in case older devices send the chunk wrapped in an object
           chunks.push(new Blob([data.data])); receivedSize += data.data.byteLength;
           if (fileMeta) {
             setProgress((receivedSize / fileMeta.size) * 100);
             updateSpeed(receivedSize, fileMeta.size); 
           }
        }
        else if (data.type === 'eof') {
          // Compile all chunks into a single file Blob at the very end
          const finalBlob = new Blob(chunks, { type: fileMeta.mime });
          const url = URL.createObjectURL(finalBlob);
          activeUrls.push(url); 
          
          const a = document.createElement('a');
          a.href = url; a.download = fileMeta.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
          conn.send({ type: 'done' });
        }
        else if (data.type === 'all_done') { setStatus('complete'); }
      });
      
      conn.on('close', () => { setStatus(prev => prev !== 'complete' ? 'error' : prev); });
    });
    peer.on('error', (err) => { console.error(err); setStatus('error'); });
    
    return () => { 
      if (handshakeInterval) clearInterval(handshakeInterval);
      activeUrls.forEach(url => URL.revokeObjectURL(url)); 
      peer.destroy(); 
    };
  }, [senderId, resetSpeed, updateSpeed]); 

  const handleCopyText = () => {
    if (receivedText) {
      copyToClipboard(receivedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="w-full max-w-md mx-auto bg-white/95 dark:bg-[#2d1a0a]/95 backdrop-blur-md rounded-3xl shadow-2xl border border-[#7B3F00]/10 dark:border-[#d4a373]/10 overflow-hidden transition-colors">
      <div className={`p-4 text-center text-white font-bold flex items-center justify-center gap-2 ${ status === 'connecting' ? 'bg-[#C68E17] dark:bg-[#e5b342]' : status === 'receiving' ? 'bg-blue-500' : status === 'complete' ? 'bg-green-500' : 'bg-red-500' }`}>
        {status === 'connecting' && <><Loader2 className="animate-spin" /> Connecting to Sender...</>}
        {status === 'receiving' && <><Download className="animate-bounce" /> Receiving Data...</>}
        {status === 'complete' && <><CheckCircle2 /> Transfer Complete!</>}
        {status === 'error' && <><X /> Link Expired or Broken</>}
      </div>

      <div className="p-8 flex flex-col items-center">
        {metadata && status !== 'complete' && !receivedText && (
          <div className="flex items-center gap-3 w-full bg-[#FFFDD0]/50 dark:bg-[#1a0b00]/50 p-4 rounded-xl mb-6 border border-[#7B3F00]/20 dark:border-[#d4a373]/20 shadow-sm transition-colors">
            <FileBox className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" />
            <div className="overflow-hidden">
              <p className="font-bold text-[#3C1F00] dark:text-white truncate">{metadata.name}</p>
              <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{formatBytes(metadata.size)}</p>
            </div>
          </div>
        )}

        {status === 'connecting' && !metadata && !receivedText && (
          <div className="py-10 flex flex-col items-center text-[#7B3F00] dark:text-[#d4a373]">
            <Wifi className="w-12 h-12 mb-4 animate-pulse opacity-50" />
            <p className="font-semibold text-center">Looking for sender...<br/>Make sure they haven't closed their tab.</p>
          </div>
        )}

        {status === 'receiving' && !receivedText && <ProgressBar progress={progress} statusText={`Downloading ${metadata?.name}...`} speed={speed} eta={eta} />}

        {status === 'complete' && receivedText && (
          <div className="w-full flex flex-col mt-2 mb-6">
            <div className="flex items-center gap-2 mb-3 text-[#7B3F00] dark:text-[#d4a373] font-bold">
              <MessageSquare className="w-5 h-5" /> Received Message:
            </div>
            <div className="bg-[#FFFDD0]/50 dark:bg-[#1a0b00]/50 p-4 rounded-xl border border-[#7B3F00]/20 dark:border-[#d4a373]/20 text-[#3C1F00] dark:text-white mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap word-break-all font-medium text-sm">
              {receivedText}
            </div>
            <button onClick={handleCopyText} className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-[#2d1a0a] border-2 border-[#C68E17]/30 dark:border-[#e5b342]/30 hover:border-[#C68E17] dark:hover:border-[#e5b342] text-[#3C1F00] dark:text-white rounded-xl font-bold transition-all shadow-sm">
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-[#C68E17] dark:text-[#e5b342]" />}
              {copied ? "Copied to Clipboard!" : "Copy Text"}
            </button>
          </div>
        )}

        {status === 'complete' && !receivedText && (
          <div className="text-center w-full py-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.6 }} className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </motion.div>
            <p className="font-bold text-[#3C1F00] dark:text-white mb-2 text-xl">All Done!</p>
            <p className="text-sm text-[#7B3F00]/70 dark:text-[#d4a373]/70 mb-6 font-medium">Files have been saved to your device.</p>
          </div>
        )}

        {status === 'complete' && (
          <button onClick={() => window.location.hash = ''} className="bg-[#7B3F00] dark:bg-[#e5b342] hover:bg-[#3C1F00] dark:hover:bg-[#c28415] text-white dark:text-[#1a0b00] px-8 py-3 rounded-xl font-bold transition-all shadow-md w-full">
            Go to Homepage
          </button>
        )}

        {status === 'error' && (
          <div className="text-center w-full py-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="font-bold text-[#3C1F00] dark:text-white mb-2 text-xl">Transfer Failed</p>
            <p className="text-sm text-[#7B3F00]/70 dark:text-[#d4a373]/70 mb-6 font-medium">The sender might have closed their tab, or the link is invalid.</p>
            <button onClick={() => window.location.hash = ''} className="bg-[#7B3F00] dark:bg-[#e5b342] hover:bg-[#3C1F00] dark:hover:bg-[#c28415] text-white dark:text-[#1a0b00] px-8 py-3 rounded-xl font-bold transition-all shadow-md">
              Go to Homepage
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- LEGAL MODALS ---
const LegalModal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#3C1F00]/40 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-[#2d1a0a] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[#7B3F00]/20 dark:border-[#d4a373]/20 flex flex-col transition-colors">
        <div className="bg-[#7B3F00] dark:bg-[#1a0b00] p-6 text-white flex justify-between items-center transition-colors shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">{title}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto text-[#7B3F00]/80 dark:text-[#d4a373]/90 font-medium space-y-4">
          {children}
        </div>
        <div className="p-6 border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 bg-[#FFFDD0]/30 dark:bg-[#110800]/30 shrink-0">
          <button onClick={onClose} className="w-full py-3 bg-[#C68E17] hover:bg-[#7B3F00] dark:bg-[#e5b342] dark:hover:bg-[#c28415] text-white font-bold rounded-xl transition-colors">
            I Understand
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- FOOTER COMPONENT ---
const Footer = ({ onOpenPrivacy, onOpenTerms }: { onOpenPrivacy: () => void, onOpenTerms: () => void }) => (
  <footer className="w-full relative z-40 border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 bg-[#FFFDD0]/80 dark:bg-[#110800]/80 backdrop-blur-md transition-colors mt-auto">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-8 mb-12">
        
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => {window.location.hash = ''; window.scrollTo(0,0);}}>
            <img src="/logo.png" alt="ChocoShare Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#3C1F00] dark:text-white transition-colors">
              Choco<span className="text-[#7B3F00] dark:text-[#e5b342] transition-colors">share</span>
            </h2>
          </div>
          <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/80 font-medium max-w-sm transition-colors mb-6 leading-relaxed">
            Redefining secure, device-to-device file transfers. No cloud storage, no file size limits, just lightning-fast peer-to-peer encryption.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com/basic30" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#2d1a0a] text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] border border-[#7B3F00]/10 dark:border-[#d4a373]/20 shadow-sm hover:scale-110 transition-all"><Github className="w-4 h-4" /></a>
            <a href="https://instagram.com/snahasish0915" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#2d1a0a] text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] border border-[#7B3F00]/10 dark:border-[#d4a373]/20 shadow-sm hover:scale-110 transition-all"><Instagram className="w-4 h-4" /></a>
            <a href="mailto:snahasishdey143@gmail.com" className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#2d1a0a] text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] border border-[#7B3F00]/10 dark:border-[#d4a373]/20 shadow-sm hover:scale-110 transition-all"><Mail className="w-4 h-4" /></a>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-[#3C1F00] dark:text-white mb-5 transition-colors uppercase tracking-wider text-sm">Product</h3>
          <ul className="space-y-3 sm:space-y-4">
            <li><button onClick={() => {window.location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' });}} className="text-[#7B3F00]/80 hover:text-[#7B3F00] dark:text-[#d4a373]/80 dark:hover:text-[#e5b342] transition-colors font-medium">Home</button></li>
            <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-[#7B3F00]/80 hover:text-[#7B3F00] dark:text-[#d4a373]/80 dark:hover:text-[#e5b342] transition-colors font-medium">How it Works</button></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-[#3C1F00] dark:text-white mb-5 transition-colors uppercase tracking-wider text-sm">Legal</h3>
          <ul className="space-y-3 sm:space-y-4">
            <li><button onClick={onOpenPrivacy} className="text-[#7B3F00]/80 hover:text-[#7B3F00] dark:text-[#d4a373]/80 dark:hover:text-[#e5b342] transition-colors font-medium">Privacy Policy</button></li>
            <li><button onClick={onOpenTerms} className="text-[#7B3F00]/80 hover:text-[#7B3F00] dark:text-[#d4a373]/80 dark:hover:text-[#e5b342] transition-colors font-medium">Terms of Service</button></li>
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[#7B3F00]/60 dark:text-[#d4a373]/60 font-medium text-sm text-center md:text-left transition-colors">© {new Date().getFullYear()} ChocoShare. All rights reserved.</p>
        <p className="text-[#7B3F00]/60 dark:text-[#d4a373]/60 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors">
          Engineered with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> by <span className="font-bold text-[#3C1F00] dark:text-white">Snahasish Dey</span>
        </p>
      </div>
    </div>
  </footer>
);

export default function App() {
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  if (isMaintenanceMode) {
    return <MaintenanceView />;
  }
  const [route, setRoute] = useState<string>('home'); 
  const [payloadToShare, setPayloadToShare] = useState<SharePayload | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  
  const [isDark, setIsDark] = useState<boolean>(false);
  const [lava, setLava] = useState({ active: false, x: 0, y: 0, type: 'dark' });

  const handleToggleTheme = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const nextTheme = isDark ? 'light' : 'dark';

    setLava({ active: true, x, y, type: nextTheme });

    setTimeout(() => {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    }, 500);

    setTimeout(() => {
      setLava(prev => ({ ...prev, active: false }));
    }, 1200);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/receive/')) {
        // 🔥 Automatically force the URL to uppercase to prevent case sensitivity issues!
        const id = hash.replace('#/receive/', '').toUpperCase();
        setReceiverId(id); setRoute('receive');
      } else if (payloadToShare !== null) {
        setRoute('send');
      } else {
        setRoute('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [payloadToShare]);

  const startSharing = (payload: SharePayload) => { setPayloadToShare(payload); setRoute('send'); window.location.hash = '#/send'; };
  const cancelSharing = () => { setPayloadToShare(null); setRoute('home'); window.location.hash = ''; };

  return (
    <div className={`min-h-screen bg-[#FFFDD0] dark:bg-[#110800] text-[#3C1F00] dark:text-white font-sans selection:bg-[#C68E17] selection:text-white flex flex-col relative overflow-x-hidden transition-colors ${!lava.active ? 'duration-500' : ''}`}>
      
      {/* --- LAVA ANIMATION OVERLAY --- */}
      <AnimatePresence>
        {lava.active && (
          <motion.div
            className={`fixed inset-0 z-[100] pointer-events-none ${lava.type === 'dark' ? 'bg-[#110800]' : 'bg-[#FFFDD0]'}`}
            initial={{ clipPath: `circle(0px at ${lava.x}px ${lava.y}px)`, opacity: 1 }}
            animate={{ 
              clipPath: `circle(3000px at ${lava.x}px ${lava.y}px)`, 
              opacity: [1, 1, 0] 
            }}
            transition={{ duration: 1.2, times: [0, 0.5, 1], ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <BackgroundShapes />
      <ChocolateHeader />

      <header className="fixed top-0 left-0 w-full p-3 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-[#FFFDD0] dark:from-[#110800] to-transparent transition-colors">
        
        {/* --- LEFT: BRANDING --- */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0" onClick={() => window.location.hash = ''}>
          {/* flex-shrink-0 prevents the logo from getting squished */}
          <div className="flex-shrink-0 flex items-center justify-center hover:rotate-3 transition-transform">
            <img src="/logo.png" alt="ChocoShare Logo" className="w-8 h-8 sm:w-14 sm:h-14 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight drop-shadow-sm text-[#3C1F00] dark:text-white transition-colors truncate">
            Choco<span className="text-[#7B3F00] dark:text-[#e5b342] transition-colors">share</span>
          </h1>
        </div>

        {/* --- RIGHT: ICONS & BUTTONS --- */}
        <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
          
          <a 
            href="https://instagram.com/snahasish0915" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 sm:w-11 sm:h-11 bg-white dark:bg-[#2d1a0a] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border border-[#7B3F00]/10 dark:border-[#d4a373]/20 group"
            aria-label="Follow on Instagram"
          >
            <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform" />
          </a>

          <a 
            href="https://github.com/basic30" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 sm:w-11 sm:h-11 bg-white dark:bg-[#2d1a0a] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border border-[#7B3F00]/10 dark:border-[#d4a373]/20 group"
          >
            <Github className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 dark:text-gray-200 group-hover:scale-110 transition-transform" />
          </a>

          <button 
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden md:flex w-11 h-11 bg-white dark:bg-[#2d1a0a] rounded-full items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border border-[#7B3F00]/10 dark:border-[#d4a373]/20 group"
            title="How it works"
          >
            <Info className="w-5 h-5 text-[#7B3F00] dark:text-[#e5b342] group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            onClick={handleToggleTheme} 
            className="w-8 h-8 sm:w-11 sm:h-11 bg-white dark:bg-[#2d1a0a] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border border-[#7B3F00]/10 dark:border-[#d4a373]/20"
            aria-label="Toggle Theme"
          >
            <motion.div initial={false} animate={{ rotate: isDark ? 180 : 0 }} transition={{ duration: 0.5 }}>
              {isDark ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#e5b342]" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#C68E17]" />}
            </motion.div>
          </button>

          <button onClick={() => setShowReceiveModal(true)} className="flex items-center gap-1.5 sm:gap-2 bg-[#7B3F00] dark:bg-[#e5b342] hover:bg-[#3C1F00] dark:hover:bg-[#c28415] text-white dark:text-[#1a0b00] px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 text-xs sm:text-base">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Receive</span>
          </button>

        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 pt-24 md:pt-28 relative z-10 w-full">
        <AnimatePresence mode="wait">
          {route === 'home' && <HomeView key="home" onShare={startSharing} />}
          {route === 'send' && payloadToShare !== null && (
            <div className="w-full mt-8 sm:mt-16 mb-20 flex justify-center">
              <SenderView key="send" payload={payloadToShare} onCancel={cancelSharing} />
            </div>
          )}
          {route === 'receive' && receiverId && (
            <div className="w-full mt-8 sm:mt-16 mb-20 flex justify-center">
               <ReceiverView key={`receive-${receiverId}`} senderId={receiverId} />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER PASSES CLICKS TO OPEN MODALS */}
      <Footer 
        onOpenPrivacy={() => setShowPrivacyModal(true)} 
        onOpenTerms={() => setShowTermsModal(true)} 
      />

      <ReceiveModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} />

      {/* PRIVACY POLICY MODAL TEXT */}
      <LegalModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
        <p className="font-bold text-[#3C1F00] dark:text-white text-lg">Your data is yours.</p>
        <p>Because ChocoShare is built on Peer-to-Peer (P2P) WebRTC technology, absolute privacy is fundamentally engineered into the core of our application.</p>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li><strong className="text-[#3C1F00] dark:text-white">No Server Storage:</strong> We do not store, host, or read your files or text messages. Your data goes directly from your device to the receiver's device.</li>
          <li><strong className="text-[#3C1F00] dark:text-white">End-to-End Encryption:</strong> All transfers are heavily encrypted in transit by standard WebRTC security protocols (DTLS/SRTP).</li>
          <li><strong className="text-[#3C1F00] dark:text-white">Routing Data:</strong> We use STUN/TURN servers strictly to help devices find each other across firewalls. These relay servers securely pass the encrypted data chunks without decrypting or logging them.</li>
          <li><strong className="text-[#3C1F00] dark:text-white">No Tracking:</strong> We do not use invasive tracking cookies, and we do not collect personal IP addresses for analytics.</li>
        </ul>
      </LegalModal>

      {/* TERMS OF SERVICE MODAL TEXT */}
      <LegalModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms of Service">
        <p>By using ChocoShare, you agree to the following terms:</p>
        <ul className="list-disc pl-5 space-y-3 mt-4">
          <li><strong className="text-[#3C1F00] dark:text-white">Acceptable Use:</strong> You agree not to use this service to transfer illegal, malicious, or harmful files.</li>
          <li><strong className="text-[#3C1F00] dark:text-white">User Responsibility:</strong> Because transfers are direct and encrypted, ChocoShare cannot monitor or moderate content. You are entirely responsible for the files and text you choose to send or receive.</li>
          <li><strong className="text-[#3C1F00] dark:text-white">No Warranty:</strong> ChocoShare is a free tool provided "as is" without warranties of any kind. We are not liable for interrupted transfers, data loss, or network limitations.</li>
          <li><strong className="text-[#3C1F00] dark:text-white">Fair Use:</strong> While there are no hard file size limits, users must respect the fair use of our free TURN relay servers to ensure the service remains fast for everyone.</li>
        </ul>
      </LegalModal>
      
    </div>
  );
}
