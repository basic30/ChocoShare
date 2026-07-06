// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { io } from 'socket.io-client';
// import { 
//   UploadCloud, Copy, CheckCircle2, AlertCircle, Loader2, Download, 
//   Wifi, FileBox, X, Share2, QrCode, Lock, Zap, Infinity as InfinityIcon, ArrowRight, Moon, Sun, Type, FileUp, MessageSquare, Instagram, Github, Info, Heart, Mail, Wrench,
//   Clock, Trash2, FolderOpen, Signal, SignalHigh, SignalLow, WifiOff, History, FolderUp, File as FileIcon, MessageSquarePlus
// } from 'lucide-react';
// import PrivateChat from './PrivateChat';

// const socket = io('https://chocoshare-chocoshare-signaling.hf.space');

// // --- TYPES ---
// type SharePayload = { type: 'files'; data: File[] } | { type: 'text'; data: string };

// type TransferRecord = {
//   id: string;
//   direction: 'sent' | 'received';
//   contentType: 'files' | 'text';
//   fileName?: string;
//   fileCount?: number;
//   totalSize?: number;
//   textPreview?: string;
//   timestamp: number;
//   peerId: string;
//   status: 'complete' | 'failed';
// };

// type ConnectionQuality = 'direct' | 'relay' | 'disconnected' | 'checking';

// // --- UTILITY FUNCTIONS ---
// const copyToClipboard = async (text: string) => {
//   if (navigator.clipboard && window.isSecureContext) {
//     try {
//       await navigator.clipboard.writeText(text);
//       return;
//     } catch (err) {
//       console.error('Modern copy failed', err);
//     }
//   }
//   const textArea = document.createElement("textarea");
//   textArea.value = text;
//   document.body.appendChild(textArea);
//   textArea.select();
//   try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
//   document.body.removeChild(textArea);
// };

// const formatBytes = (bytes: number, decimals = 2) => {
//   if (!+bytes) return '0 Bytes';
//   const k = 1024;
//   const dm = decimals < 0 ? 0 : decimals;
//   const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
// };

// const formatEta = (seconds: number) => {
//   if (seconds === Infinity || seconds === 0 || isNaN(seconds)) return 'Calculating...';
//   if (seconds < 60) return `${Math.round(seconds)}s left`;
//   const m = Math.floor(seconds / 60);
//   const s = Math.round(seconds % 60);
//   return `${m}m ${s}s left`;
// };

// const formatRelativeTime = (timestamp: number): string => {
//   const diff = Date.now() - timestamp;
//   const seconds = Math.floor(diff / 1000);
//   if (seconds < 60) return 'Just now';
//   const minutes = Math.floor(seconds / 60);
//   if (minutes < 60) return `${minutes}m ago`;
//   const hours = Math.floor(minutes / 60);
//   if (hours < 24) return `${hours}h ago`;
//   const days = Math.floor(hours / 24);
//   if (days < 7) return `${days}d ago`;
//   return new Date(timestamp).toLocaleDateString();
// };

// const generateId = () => Math.random().toString(36).substring(2, 10);

// // --- TRANSFER HISTORY STORAGE ---
// const HISTORY_KEY = 'chocoshare_transfer_history';
// const MAX_HISTORY = 50;

// const saveTransferRecord = (record: TransferRecord) => {
//   try {
//     const existing = getTransferHistory();
//     existing.unshift(record);
//     if (existing.length > MAX_HISTORY) existing.length = MAX_HISTORY;
//     localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
//   } catch (e) { console.error('Failed to save transfer record', e); }
// };

// const getTransferHistory = (): TransferRecord[] => {
//   try {
//     const data = localStorage.getItem(HISTORY_KEY);
//     return data ? JSON.parse(data) : [];
//   } catch { return []; }
// };

// const clearTransferHistory = () => {
//   localStorage.removeItem(HISTORY_KEY);
// };

// // --- CUSTOM HOOK FOR SPEED & ETA ---
// const useTransferSpeed = () => {
//   const [speed, setSpeed] = useState(0); 
//   const [eta, setEta] = useState(Infinity);
//   const lastTimeRef = useRef(Date.now());
//   const lastBytesRef = useRef(0);

//   const updateSpeed = useCallback((currentBytes: number, totalBytes: number) => {
//     const now = Date.now();
//     const timeDiff = now - lastTimeRef.current;
    
//     if (timeDiff >= 500) { 
//       const bytesDiff = currentBytes - lastBytesRef.current;
//       const currentSpeed = (bytesDiff / timeDiff) * 1000; 
//       setSpeed(currentSpeed);

//       const remainingBytes = totalBytes - currentBytes;
//       setEta(currentSpeed > 0 ? remainingBytes / currentSpeed : Infinity);

//       lastTimeRef.current = now;
//       lastBytesRef.current = currentBytes;
//     }
//   }, []);

//   const resetSpeed = useCallback(() => {
//     setSpeed(0); setEta(Infinity);
//     lastTimeRef.current = Date.now();
//     lastBytesRef.current = 0;
//   }, []);

//   return { speed, eta, updateSpeed, resetSpeed };
// };

// // --- PARTICLE & BLURRED CHOCOLATE BACKGROUND ---
// const ParticleBackground = () => {
//   const particles = useMemo(() => {
//     return Array.from({ length: 14 }, (_, i) => ({
//       id: i,
//       size: Math.random() * 120 + 40,
//       x: Math.random() * 100,
//       y: Math.random() * 100,
//       duration: Math.random() * 10 + 8,
//       delay: Math.random() * 5,
//       opacity: Math.random() * 0.07 + 0.03,
//     }));
//   }, []);

//   return (
//     <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      
//       {/* Dark Chocolate Blob */}
//       <motion.div 
//         animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute top-[25%] left-[-10%] w-[400px] h-[400px] bg-[#5B2E15] rounded-full blur-[100px] opacity-30 dark:opacity-15" 
//       />
      
//       {/* Milk Chocolate Blob */}
//       <motion.div 
//         animate={{ scale: [1, 1.15, 1], x: [0, -30, 0] }}
//         transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute top-[15%] right-[-10%] w-[500px] h-[500px] bg-[#7B3F00] rounded-full blur-[100px] opacity-40 dark:opacity-20" 
//       />
      
//       {/* Caramel / Light Chocolate Blob */}
//       <motion.div 
//         animate={{ scale: [1, 1.1, 1], y: [0, -30, 0] }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] bg-[#D2691E] rounded-[40%_60%_70%_30%] blur-[110px] opacity-35 dark:opacity-20" 
//       />

//       {/* --- FLOATING PARTICLES --- */}
//       {particles.map((p) => (
//         <motion.div
//           key={p.id}
//           className="particle absolute"
//           style={{
//             width: p.size,
//             height: p.size,
//             left: `${p.x}%`,
//             top: `${p.y}%`,
//             background: `radial-gradient(circle, rgba(198, 142, 23, ${p.opacity}), transparent 70%)`,
//           }}
//           animate={{
//             y: [0, -(p.size * 0.5), p.size * 0.3, 0],
//             x: [0, p.size * 0.2, -(p.size * 0.15), 0],
//             rotate: [0, 5, -3, 0],
//           }}
//           transition={{
//             duration: p.duration,
//             repeat: Infinity,
//             ease: "easeInOut",
//             delay: p.delay,
//           }}
//         />
//       ))}
//     </div>
//   );
// };

// const ChocolateHeader = () => (
//   <div className="fixed top-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none opacity-50 dark:opacity-45 transition-opacity duration-700">
//     <svg className="relative block w-full h-[80px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
//       <path 
//         d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
//         className="fill-[#3C1F00] transition-colors duration-500"
//       />
//     </svg>
//   </div>
// );

// // --- PROGRESS BAR ---
// const ProgressBar = ({ progress, statusText, speed = 0, eta = Infinity }: { progress: number; statusText: string; speed?: number; eta?: number }) => (
//   <div className="w-full mt-4">
//     <div className="flex justify-between text-sm font-semibold text-[#7B3F00] dark:text-[#d4a373] mb-2 transition-colors">
//       <span>{statusText}</span>
//       <span className="font-display font-bold">{Math.round(progress)}%</span>
//     </div>
//     <div className="h-4 w-full bg-[#FFFDD0]/50 dark:bg-[#120601]/50 rounded-full border border-[#7B3F00]/15 dark:border-[#d4a373]/15 overflow-hidden backdrop-blur-sm transition-colors">
//       <motion.div 
//         className="h-full bg-gradient-to-r from-[#C68E17] via-[#d4a373] to-[#7B3F00] dark:from-[#e5b342] dark:via-[#d4a373] dark:to-[#c28415] rounded-full relative overflow-hidden progress-glow" 
//         initial={{ width: 0 }} 
//         animate={{ width: `${progress}%` }} 
//         transition={{ ease: "linear", duration: 0.2 }}
//       >
//         <div className="absolute inset-0 shimmer" />
//       </motion.div>
//     </div>
//     {speed > 0 && progress < 100 && (
//       <div className="flex justify-between text-xs font-bold text-[#7B3F00]/70 dark:text-[#d4a373]/70 mt-2 transition-colors">
//         <span>⚡ {formatBytes(speed)}/s</span>
//         <span>⏱️ {formatEta(eta)}</span>
//       </div>
//     )}
//   </div>
// );

// // --- CONNECTION STATUS BADGE ---
// const ConnectionBadge = ({ conn }: { conn: any }) => {
//   const [quality, setQuality] = useState<ConnectionQuality>('checking');

//   useEffect(() => {
//     let interval: any;

//     const checkConnection = async () => {
//       try {
//         const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
//         if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
//           setQuality('disconnected');
//           return;
//         }

//         const stats = await pc.getStats();
//         let isRelay = false;
//         let foundPair = false;

//         stats.forEach((report: any) => {
//           if (report.type === 'candidate-pair' && report.state === 'succeeded') {
//             foundPair = true;
            
//             // Check BOTH local and remote candidates
//             const localCandidate = stats.get(report.localCandidateId);
//             const remoteCandidate = stats.get(report.remoteCandidateId);
            
//             if (
//               (localCandidate && localCandidate.candidateType === 'relay') ||
//               (remoteCandidate && remoteCandidate.candidateType === 'relay')
//             ) {
//               isRelay = true;
//             }
//           }
//         });

//         if (foundPair) {
//           setQuality(isRelay ? 'relay' : 'direct');
//         }
//       } catch {
//         if (conn.readyState === 'open') setQuality('direct');
//       }
//     };

//     const timeout = setTimeout(() => {
//       checkConnection();
//       interval = setInterval(checkConnection, 3000);
//     }, 2000);

//     return () => {
//       clearTimeout(timeout);
//       if (interval) clearInterval(interval);
//     };
//   }, [conn]);

//   const config = {
//     checking: { color: 'text-[#7B3F00]/50 dark:text-[#d4a373]/50', bg: 'bg-[#7B3F00]/5 dark:bg-[#d4a373]/5', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Checking...' },
//     direct: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', icon: <SignalHigh className="w-3.5 h-3.5" />, label: 'Direct P2P' },
//     relay: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: <SignalLow className="w-3.5 h-3.5" />, label: 'Relayed (TURN)' },
//     disconnected: { color: 'text-red-500', bg: 'bg-red-500/10', icon: <WifiOff className="w-3.5 h-3.5" />, label: 'Disconnected' },
//   };

//   const c = config[quality];

//   return (
//     <motion.div 
//       initial={{ opacity: 0, scale: 0.9 }} 
//       animate={{ opacity: 1, scale: 1 }}
//       className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${c.color} ${c.bg} backdrop-blur-sm border border-current/10`}
//     >
//       <span className={quality === 'direct' ? 'connection-pulse' : ''}>{c.icon}</span>
//       {c.label}
//     </motion.div>
//   );
// };

// // --- TRANSFER HISTORY PANEL ---
// const TransferHistoryPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
//   const [history, setHistory] = useState<TransferRecord[]>([]);

//   useEffect(() => {
//     if (isOpen) {
//       setHistory(getTransferHistory());
//     }
//   }, [isOpen]);

//   const handleClear = () => {
//     clearTransferHistory();
//     setHistory([]);
//   };

//   return (
//     <>
//       <AnimatePresence>
//         {isOpen && (
//           <motion.div 
//             initial={{ opacity: 0 }} 
//             animate={{ opacity: 1 }} 
//             exit={{ opacity: 0 }}
//             onClick={onClose}
//             className="fixed inset-0 bg-[#3C1F00]/30 dark:bg-black/50 backdrop-blur-sm z-[55]"
//           />
//         )}
//       </AnimatePresence>

//       <AnimatePresence>
//         {isOpen && (
//           <motion.div 
//             initial={{ x: '100%' }} 
//             animate={{ x: 0 }} 
//             exit={{ x: '100%' }}
//             transition={{ type: "spring", damping: 25, stiffness: 250 }}
//             className="fixed top-0 right-0 h-full w-full max-w-md glass-card-strong z-[56] flex flex-col overflow-hidden"
//           >
//             <div className="p-6 border-b border-[#7B3F00]/10 dark:border-[#d4a373]/10 flex items-center justify-between shrink-0">
//               <h3 className="text-xl font-display font-bold text-[#3C1F00] dark:text-white flex items-center gap-2.5">
//                 <div className="w-9 h-9 rounded-xl bg-[#C68E17]/10 dark:bg-[#e5b342]/10 flex items-center justify-center">
//                   <History className="w-5 h-5 text-[#C68E17] dark:text-[#e5b342]" />
//                 </div>
//                 Transfer History
//               </h3>
//               <button onClick={onClose} className="glass-button w-9 h-9 rounded-xl flex items-center justify-center">
//                 <X className="w-5 h-5 text-[#7B3F00] dark:text-[#d4a373]" />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
//               {history.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center h-full text-center px-6">
//                   <div className="w-20 h-20 rounded-2xl bg-[#7B3F00]/5 dark:bg-[#d4a373]/5 flex items-center justify-center mb-5">
//                     <Clock className="w-10 h-10 text-[#7B3F00]/30 dark:text-[#d4a373]/30" />
//                   </div>
//                   <p className="font-display font-bold text-[#3C1F00] dark:text-white text-lg mb-2">No transfers yet</p>
//                   <p className="text-[#7B3F00]/60 dark:text-[#d4a373]/60 text-sm font-medium">Your transfer history will appear here after you send or receive files.</p>
//                 </div>
//               ) : (
//                 history.map((record) => (
//                   <motion.div 
//                     key={record.id}
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     className="glass-card rounded-2xl p-4 group hover:scale-[1.01] transition-transform"
//                   >
//                     <div className="flex items-start gap-3">
//                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
//                         record.direction === 'sent' 
//                           ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
//                           : 'bg-green-500/10 text-green-600 dark:text-green-400'
//                       }`}>
//                         {record.direction === 'sent' ? <UploadCloud className="w-5 h-5" /> : <Download className="w-5 h-5" />}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center justify-between gap-2">
//                           <p className="font-bold text-[#3C1F00] dark:text-white text-sm truncate">
//                             {record.contentType === 'files' 
//                               ? (record.fileCount && record.fileCount > 1 ? `${record.fileCount} Files` : record.fileName || 'File') 
//                               : 'Text Message'}
//                           </p>
//                           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
//                             record.status === 'complete' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'
//                           }`}>
//                             {record.status}
//                           </span>
//                         </div>
//                         <div className="flex items-center gap-3 mt-1.5">
//                           {record.totalSize && record.totalSize > 0 && (
//                             <span className="text-xs text-[#7B3F00]/60 dark:text-[#d4a373]/60 font-medium">{formatBytes(record.totalSize)}</span>
//                           )}
//                           {record.textPreview && (
//                             <span className="text-xs text-[#7B3F00]/60 dark:text-[#d4a373]/60 font-medium truncate max-w-[120px]">"{record.textPreview}"</span>
//                           )}
//                           <span className="text-xs text-[#7B3F00]/40 dark:text-[#d4a373]/40 font-medium ml-auto shrink-0">{formatRelativeTime(record.timestamp)}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </motion.div>
//                 ))
//               )}
//             </div>

//             {history.length > 0 && (
//               <div className="p-4 border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 shrink-0">
//                 <button 
//                   onClick={handleClear}
//                   className="w-full py-3 rounded-xl glass-button text-red-500 hover:text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/5"
//                 >
//                   <Trash2 className="w-4 h-4" /> Clear All History
//                 </button>
//               </div>
//             )}
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </>
//   );
// };

// // --- MODALS ---
// const ReceiveModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
//   const [code, setCode] = useState('');
//   if (!isOpen) return null;

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!code.trim()) return;
//     let peerId = code.trim().toUpperCase();
//     if (peerId.includes('#/RECEIVE/')) peerId = peerId.split('#/RECEIVE/')[1];
//     window.location.hash = `#/receive/${peerId}`;
//     onClose(); setCode('');
//   };

//   return (
//     <div className="fixed inset-0 bg-[#3C1F00]/30 dark:bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
//       <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card-strong rounded-3xl max-w-md w-full overflow-hidden">
//         <div className="bg-gradient-to-r from-[#7B3F00] to-[#3C1F00] dark:from-[#221207] dark:to-[#120601] p-6 text-white flex justify-between items-center">
//           <h3 className="text-xl font-display font-bold flex items-center gap-2.5"><QrCode className="w-6 h-6" /> Receive Content</h3>
//           <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
//         </div>
//         <div className="p-8">
//           <p className="text-[#7B3F00] dark:text-[#d4a373] mb-6 font-medium transition-colors">Enter the secure code or paste the full link shared by the sender below.</p>
//           <form onSubmit={handleSubmit} className="flex flex-col gap-4">
//             <input 
//               type="text" 
//               placeholder="e.g. A7X9P2" 
//               value={code} 
//               onChange={(e) => setCode(e.target.value)} 
//               className="w-full px-4 py-4 rounded-xl glass-input text-[#3C1F00] dark:text-white font-bold text-center text-xl tracking-widest uppercase outline-none" 
//               autoFocus 
//             />
//             <button type="submit" disabled={!code.trim()} className="w-full py-4 gradient-button disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2">
//               Connect & Receive <ArrowRight className="w-5 h-5" />
//             </button>
//           </form>
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// const FeatureCard = ({ icon, title, desc, delay = 0 }: { icon: React.ReactNode, title: string, desc: string, delay?: number }) => (
//   <motion.div 
//     initial={{ opacity: 0, y: 30 }}
//     whileInView={{ opacity: 1, y: 0 }}
//     viewport={{ once: true, margin: "-50px" }}
//     transition={{ duration: 0.6, delay, type: "spring", bounce: 0.3 }}
//     whileHover={{ y: -8, scale: 1.02, transition: { type: "tween", duration: 0.15 } }} 
//     className="glass-card rounded-3xl p-8 flex flex-col items-center text-center transition-shadow duration-200 glow-gold-hover cursor-default"
//   >
//     <div className="w-16 h-16 bg-gradient-to-br from-[#C68E17]/15 to-[#7B3F00]/10 dark:from-[#e5b342]/15 dark:to-[#c28415]/10 text-[#7B3F00] dark:text-[#e5b342] rounded-2xl flex items-center justify-center mb-6 glow-gold transition-colors">
//       {icon}
//     </div>
//     <h3 className="text-xl font-display font-extrabold text-[#3C1F00] dark:text-white mb-3 transition-colors">{title}</h3>
//     <p className="text-[#7B3F00]/75 dark:text-[#d4a373]/75 font-medium leading-relaxed transition-colors">{desc}</p>
//   </motion.div>
// );

// const MaintenanceView = () => (
//   <div className="min-h-screen bg-[#FFFDD0] dark:bg-[#221207] text-[#3C1F00] dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
//     <ParticleBackground />
//     <ChocolateHeader />
//     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full glass-card-strong rounded-3xl p-10 text-center relative z-10">
//       <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
//         className="w-20 h-20 bg-gradient-to-br from-[#FFFDD0] to-[#C68E17]/20 dark:from-[#120601] dark:to-[#e5b342]/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-gold"
//       >
//         <Wrench className="w-10 h-10 text-[#7B3F00] dark:text-[#e5b342]" />
//       </motion.div>
//       <h1 className="text-3xl font-display font-black mb-4 text-[#3C1F00] dark:text-white tracking-tight">We're upgrading the machinery.</h1>
//       <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/80 font-medium mb-8 leading-relaxed">
//         ChocoShare is currently undergoing scheduled maintenance to improve speed and security. We'll be back online shortly. Grab a coffee and check back in a few minutes!
//       </p>
//       <div className="inline-flex items-center justify-center gap-2 glass-card px-6 py-3 rounded-full">
//         <div className="w-2 h-2 bg-[#C68E17] dark:bg-[#e5b342] rounded-full animate-ping"></div>
//         <span className="text-sm font-bold text-[#7B3F00] dark:text-[#d4a373] uppercase tracking-wider">System Status: Maintenance</span>
//       </div>
//     </motion.div>
//   </div>
// );

// const UpdateModal = () => {
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     const expiryDate = new Date('2026-06-23T23:59:59').getTime();
//     const now = Date.now();
//     const hasSeenUpdate = localStorage.getItem('chocoshare_v3_update_seen');

//     if (now < expiryDate && !hasSeenUpdate) {
//       const timer = setTimeout(() => setIsVisible(true), 1000);
//       return () => clearTimeout(timer);
//     }
//   }, []);

//   const handleDismiss = () => {
//     localStorage.setItem('chocoshare_v3_update_seen', 'true');
//     setIsVisible(false);
//   };

//   if (!isVisible) return null;

//   return (
//     <div className="fixed inset-0 bg-[#3C1F00]/40 dark:bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
//       <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass-card-strong rounded-3xl max-w-md w-full overflow-hidden relative">
//         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#C68E17] via-[#d4a373] to-[#7B3F00] dark:from-[#e5b342] dark:via-[#d4a373] dark:to-[#c28415]"></div>
//         <div className="p-8 text-center">
//           <div className="w-16 h-16 bg-gradient-to-br from-[#FFFDD0] to-[#C68E17]/20 dark:from-[#120601] dark:to-[#e5b342]/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-gold">
//             <Zap className="w-8 h-8 text-[#C68E17] dark:text-[#e5b342] animate-pulse" />
//           </div>
//           <h3 className="text-2xl font-display font-black text-[#3C1F00] dark:text-white mb-3">A Massive Upgrade! 🚀</h3>
//           <p className="text-[#7B3F00]/80 dark:text-[#d4a373]/90 font-medium leading-relaxed mb-8">
//             We've officially moved to our new home at <strong className="text-[#3C1F00] dark:text-white">chocoshare.qzz.io</strong>! We've also deployed a custom raw signaling server for lightning-fast, bulletproof P2P connections. Plus, check out our brand-new <strong className="text-[#3C1F00] dark:text-white">Secure Private Chat</strong> for fully ephemeral messaging. Enjoy the upgrades! 🍫✨
//           </p>
//           <button onClick={handleDismiss} className="w-full py-4 gradient-button text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
//             Awesome, Got it!
//           </button>
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// // --- FOLDER TREE PREVIEW ---
// const FolderTreePreview = ({ files }: { files: File[] }) => {
//   const tree = useMemo(() => {
//     const folders: Record<string, { name: string; size: number; files: string[] }> = {};
//     let rootFiles: { name: string; size: number }[] = [];

//     files.forEach(file => {
//       const path = (file as any).webkitRelativePath || file.name;
//       const parts = path.split('/');
      
//       if (parts.length > 1) {
//         const folderName = parts[0];
//         if (!folders[folderName]) {
//           folders[folderName] = { name: folderName, size: 0, files: [] };
//         }
//         folders[folderName].size += file.size;
//         folders[folderName].files.push(parts.slice(1).join('/'));
//       } else {
//         rootFiles.push({ name: file.name, size: file.size });
//       }
//     });

//     return { folders, rootFiles };
//   }, [files]);

//   const folderEntries = Object.values(tree.folders);
//   if (folderEntries.length === 0 && tree.rootFiles.length === 0) return null;

//   return (
//     <motion.div 
//       initial={{ opacity: 0, height: 0 }} 
//       animate={{ opacity: 1, height: 'auto' }}
//       className="mt-4 glass-card rounded-2xl p-4 max-h-40 overflow-y-auto"
//     >
//       {folderEntries.map((folder) => (
//         <div key={folder.name} className="flex items-center gap-2 py-1.5 text-sm">
//           <FolderOpen className="w-4 h-4 text-[#C68E17] dark:text-[#e5b342] shrink-0" />
//           <span className="font-bold text-[#3C1F00] dark:text-white truncate">{folder.name}/</span>
//           <span className="text-[#7B3F00]/50 dark:text-[#d4a373]/50 text-xs ml-auto shrink-0">{folder.files.length} files · {formatBytes(folder.size)}</span>
//         </div>
//       ))}
//       {tree.rootFiles.map((file) => (
//         <div key={file.name} className="flex items-center gap-2 py-1.5 text-sm">
//           <FileIcon className="w-4 h-4 text-[#7B3F00]/50 dark:text-[#d4a373]/50 shrink-0" />
//           <span className="font-medium text-[#3C1F00] dark:text-white truncate">{file.name}</span>
//           <span className="text-[#7B3F00]/50 dark:text-[#d4a373]/50 text-xs ml-auto shrink-0">{formatBytes(file.size)}</span>
//         </div>
//       ))}
//     </motion.div>
//   );
// };

// // --- HOME VIEW ---
// const HomeView = ({ onShare }: { onShare: (payload: SharePayload) => void }) => {
//   const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
//   const [isDragging, setIsDragging] = useState<boolean>(false);
//   const [textInput, setTextInput] = useState('');
//   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
//   const [showFolderPreview, setShowFolderPreview] = useState(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const folderInputRef = useRef<HTMLInputElement>(null);

//   const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault(); e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
//     else if (e.type === "dragleave") setIsDragging(false);
//   }, []);

//   const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault(); e.stopPropagation();
//     setIsDragging(false);
//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//       onShare({ type: 'files', data: Array.from(e.dataTransfer.files) });
//     }
//   }, [onShare]);

//   const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       const files = Array.from(e.target.files);
//       setSelectedFiles(files);
//       setShowFolderPreview(true);
//     }
//   };

//   const handleFolderShare = () => {
//     if (selectedFiles.length > 0) {
//       onShare({ type: 'files', data: selectedFiles });
//       setSelectedFiles([]);
//       setShowFolderPreview(false);
//     }
//   };

//   const handleTextSubmit = () => {
//     if (textInput.trim()) {
//       onShare({ type: 'text', data: textInput.trim() });
//     }
//   };

//   return (
//     <div className="w-full flex flex-col items-center pb-20 md:pb-32">
//       <motion.div 
//         initial={{ opacity: 0, y: 40, scale: 0.95 }} 
//         animate={{ opacity: 1, y: 0, scale: 1 }} 
//         transition={{ type: "spring", bounce: 0.35, duration: 0.9 }} 
//         className="w-full max-w-xl mx-auto mt-10 glass-card-strong rounded-3xl p-5 md:p-6 transition-colors"
//       >
//         <div className="text-center mb-6">
//           <motion.div 
//             initial={{ scale: 0, rotate: -20 }}
//             animate={{ scale: 1, rotate: 0 }}
//             transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
//             className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-[#C68E17]/15 to-[#7B3F00]/10 dark:from-[#e5b342]/15 dark:to-[#c28415]/10 rounded-2xl mb-4 glow-gold transition-colors"
//           >
//             <Share2 className="w-10 h-10 text-[#7B3F00] dark:text-[#e5b342]" />
//           </motion.div>
//           <h2 className="text-3xl font-display font-extrabold text-[#3C1F00] dark:text-white mb-2 transition-colors">Share Securely</h2>
//           <p className="text-[#7B3F00]/75 dark:text-[#d4a373]/75 font-medium transition-colors">Direct device-to-device transfer. Fast and Encrypted.</p>
//         </div>

//         {/* --- TABS --- */}
//         <div className="flex glass-card p-1.5 rounded-2xl mb-8">
//           <button onClick={() => setActiveTab('files')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'files' ? 'bg-white dark:bg-[#2d1a0a] text-[#C68E17] dark:text-[#e5b342] shadow-md' : 'text-[#7B3F00]/50 dark:text-[#d4a373]/50 hover:text-[#7B3F00] dark:hover:text-[#d4a373]'}`}>
//             <FileUp className="w-4 h-4" /> Files
//           </button>
//           <button onClick={() => setActiveTab('text')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'text' ? 'bg-white dark:bg-[#2d1a0a] text-[#C68E17] dark:text-[#e5b342] shadow-md' : 'text-[#7B3F00]/50 dark:text-[#d4a373]/50 hover:text-[#7B3F00] dark:hover:text-[#d4a373]'}`}>
//             <Type className="w-4 h-4" /> Text / Links
//           </button>
//         </div>

//         {/* --- FILE UPLOAD AREA --- */}
//         {activeTab === 'files' && (
//           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
//             <div
//               className={`relative rounded-3xl p-6 md:p-8 text-center transition-all duration-500 ease-out cursor-pointer flex flex-col items-center justify-center grid-pattern ${
//                 isDragging 
//                   ? "animated-border scale-[1.02] glow-gold" 
//                   : "border-[3px] border-dashed border-[#7B3F00]/20 dark:border-[#d4a373]/20 hover:border-[#C68E17]/50 dark:hover:border-[#e5b342]/50"
//               }`}
//               onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
//               onClick={() => fileInputRef.current?.click()}
//             >
//               <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && e.target.files.length > 0 && onShare({ type: 'files', data: Array.from(e.target.files) })} />
//               <motion.div 
//                 animate={{ y: isDragging ? -15 : [0, -8, 0] }} 
//                 transition={isDragging ? { duration: 0.3 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
//               >
//                 <div className={`p-4 rounded-2xl mb-4 inline-flex transition-all duration-500 ${isDragging ? 'bg-[#C68E17]/15 glow-gold' : 'bg-[#7B3F00]/5 dark:bg-[#d4a373]/5'}`}>
//                   <UploadCloud className={`w-14 h-14 transition-colors duration-500 ${isDragging ? "text-[#C68E17] dark:text-[#e5b342]" : "text-[#7B3F00]/40 dark:text-[#d4a373]/40"}`} />
//                 </div>
//               </motion.div>
//               <p className="text-xl font-display font-bold text-[#3C1F00] dark:text-white mb-2 transition-colors">
//                 {isDragging ? "Drop them like they're hot!" : "Drag & Drop your files here"}
//               </p>
//               <span className="text-sm text-[#7B3F00]/60 dark:text-[#d4a373]/70 font-semibold glass-card px-5 py-2 rounded-full mt-2 inline-flex items-center gap-1.5 transition-colors">
//                 or click to browse
//               </span>
//             </div>

//             {/* Folder Upload Button */}
//             <div className="mt-4 flex gap-3">
//               <input
//                 type="file"
//                 ref={folderInputRef}
//                 className="hidden"
//                 /* @ts-ignore */
//                 webkitdirectory=""
//                 directory=""
//                 multiple
//                 onChange={handleFolderSelect}
//               />
//               <button 
//                 onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
//                 className="flex-1 py-3.5 glass-button rounded-xl text-[#7B3F00] dark:text-[#d4a373] font-bold text-sm flex items-center justify-center gap-2 hover:text-[#C68E17] dark:hover:text-[#e5b342]"
//               >
//                 <FolderUp className="w-4.5 h-4.5" /> Upload Folder
//               </button>
//             </div>

//             {/* Folder Preview */}
//             {showFolderPreview && selectedFiles.length > 0 && (
//               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
//                 <FolderTreePreview files={selectedFiles} />
//                 <div className="flex gap-3 mt-3">
//                   <button 
//                     onClick={() => { setSelectedFiles([]); setShowFolderPreview(false); }}
//                     className="flex-1 py-3 glass-button rounded-xl text-[#7B3F00]/60 dark:text-[#d4a373]/60 font-bold text-sm"
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     onClick={handleFolderShare}
//                     className="flex-1 py-3 gradient-button rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
//                   >
//                     Share {selectedFiles.length} Files <ArrowRight className="w-4 h-4" />
//                   </button>
//                 </div>
//               </motion.div>
//             )}
//           </motion.div>
//         )}

//         {/* --- TEXT INPUT AREA --- */}
//         {activeTab === 'text' && (
//           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
//             <textarea 
//               placeholder="Paste a link, API key, or write a message here..." 
//               value={textInput} 
//               onChange={(e) => setTextInput(e.target.value)}
//               className="w-full h-40 p-4 rounded-2xl glass-input text-[#3C1F00] dark:text-white outline-none resize-none transition-colors font-medium"
//             />
//             <button 
//               onClick={handleTextSubmit} 
//               disabled={!textInput.trim()}
//               className="w-full py-4 gradient-button disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2"
//             >
//               Generate Share Code <ArrowRight className="w-5 h-5" />
//             </button>
//           </motion.div>
//         )}
//       </motion.div>

//       {/* --- HOW IT WORKS SECTION --- */}
//       <motion.div id="how-it-works" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="w-full max-w-6xl mx-auto mt-32 px-4 scroll-mt-28">
//         <div className="text-center mb-16">
//           <motion.h2 
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true }}
//             className="text-4xl font-display font-black text-[#3C1F00] dark:text-white mb-6 tracking-tight transition-colors"
//           >
//             How ChocoShare Works ?
//           </motion.h2>
//           <motion.p 
//             initial={{ opacity: 0, y: 15 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true }}
//             transition={{ delay: 0.1 }}
//             className="text-lg text-[#7B3F00]/80 dark:text-[#d4a373] max-w-2xl mx-auto font-medium transition-colors"
//           >
//             Unlike other services, ChocoShare doesn't store your files or text on a server. We use Peer-to-Peer (P2P) WebRTC technology to connect your device directly to the receiver. It's just you and them.
//           </motion.p>
//         </div>
//         <div className="grid md:grid-cols-3 gap-8 text-left">
//           <FeatureCard icon={<InfinityIcon className="w-8 h-8" />} title="No Size Limits" desc="Because data goes directly from your device to theirs, there are no cloud storage limits. Send 10MB or 100GB seamlessly." delay={0} />
//           <FeatureCard icon={<Lock className="w-8 h-8" />} title="End-to-End Encrypted" desc="Your data is heavily encrypted during transit. Since it never passes through a central server, no one else can read it." delay={0.1} />
//           <FeatureCard icon={<Zap className="w-8 h-8" />} title="Lightning Fast" desc="Data takes the absolute shortest path. If both devices are on the same WiFi network, files transfer at local network speeds." delay={0.2} />
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// // --- INDIVIDUAL TRANSFER TASK ---
// const TransferTask = ({ conn, payload }: { conn: any, payload: SharePayload }) => {
//   const [status, setStatus] = useState<string>('connecting'); 
//   const [progress, setProgress] = useState<number>(0);
//   const [fileProgress, setFileProgress] = useState({ current: 0, total: payload.type === 'files' ? payload.data.length : 1 });
//   const { speed, eta, updateSpeed, resetSpeed } = useTransferSpeed();
//   const savedRef = useRef(false);

//   // Helper to send data natively
//   const sendData = (data: any) => {
//     if (conn.readyState === 'open') {
//       if (data instanceof ArrayBuffer || data instanceof Blob) {
//         conn.send(data);
//       } else {
//         conn.send(JSON.stringify(data));
//       }
//     }
//   };

//   useEffect(() => {
//     let currentIndex = 0;
//     let isTransferring = false; 
//     let lastUiUpdate = 0;

//     const sendInitialData = () => {
//       if (payload.type === 'text') {
//         sendData({ type: 'text_message', data: payload.data });
//         setStatus('complete');
//       } else {
//         const files = payload.data;
//         if (currentIndex >= files.length) {
//           setStatus('complete'); sendData({ type: 'all_done' }); return;
//         }
//         const file = files[currentIndex];
//         setFileProgress({ current: currentIndex + 1, total: files.length });
//         resetSpeed(); 
//         lastUiUpdate = 0; 
//         sendData({ type: 'metadata', name: file.name, size: file.size, mime: file.type || 'application/octet-stream' });
//       }
//     };
    
//     if (conn.readyState === 'open') sendInitialData();
//     else conn.onopen = () => sendInitialData();

//     // Small chunk size for weak networks
//     const CHUNK_SIZE = 64 * 1024; 
    
//     const sendNextChunk = async (file: File, offset: number) => {
//       if (offset >= file.size) { sendData({ type: 'eof' }); return; }
      
//       // Strict backpressure for instant ToffeeShare speeds
//       if (conn.bufferedAmount > 512 * 1024) {
//         setTimeout(() => sendNextChunk(file, offset), 10); return; 
//       }

//       const slice = file.slice(offset, offset + CHUNK_SIZE);
//       const buffer = await slice.arrayBuffer(); 
      
//       sendData(buffer);
//       const newOffset = offset + CHUNK_SIZE;
      
//       if (newOffset - lastUiUpdate > 1024 * 1024 || newOffset >= file.size) {
//          setProgress(Math.min(100, (newOffset / file.size) * 100));
//          lastUiUpdate = newOffset;
//       }
//       updateSpeed(newOffset, file.size);
//       setTimeout(() => sendNextChunk(file, newOffset), 0); 
//     };

//     conn.onmessage = (event: MessageEvent) => {
//       let data;
//       try {
//         data = typeof event.data === 'string' ? JSON.parse(event.data) : { type: 'chunk' };
//       } catch { return; }

//       if (data.type === 'request_metadata') {
//         if (!isTransferring) sendInitialData();
//       }
//       else if (data.type === 'ready' && payload.type === 'files') {
//         if (!isTransferring) {
//           isTransferring = true; setStatus('transferring'); sendNextChunk(payload.data[currentIndex], 0); 
//         }
//       } 
//       else if (data.type === 'done' && payload.type === 'files') {
//         currentIndex++; isTransferring = false; sendInitialData();
//       }
//     };
    
//     conn.onclose = () => { setStatus(prev => prev !== 'complete' ? 'error' : prev); };
//   }, [conn, payload, resetSpeed, updateSpeed]); 

//   // Save transfer record
//   useEffect(() => {
//     if ((status === 'complete' || status === 'error') && !savedRef.current) {
//       savedRef.current = true;
//       saveTransferRecord({
//         id: generateId(),
//         direction: 'sent',
//         contentType: payload.type,
//         fileName: payload.type === 'files' ? payload.data[0]?.name : undefined,
//         fileCount: payload.type === 'files' ? payload.data.length : undefined,
//         totalSize: payload.type === 'files' ? payload.data.reduce((acc, f) => acc + f.size, 0) : undefined,
//         textPreview: payload.type === 'text' ? payload.data.substring(0, 50) : undefined,
//         timestamp: Date.now(),
//         peerId: 'GUEST',
//         status: status as 'complete' | 'failed',
//       });
//     }
//   }, [status, conn, payload]);

//   return (
//     <div className="w-full glass-card p-4 rounded-2xl mb-3 transition-colors group">
//       <div className="flex justify-between items-center mb-1">
//         <span className="font-bold text-[#3C1F00] dark:text-white text-sm flex items-center gap-2">
//           {status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : status === 'error' ? <X className="w-4 h-4 text-red-500" /> : <Loader2 className="w-4 h-4 animate-spin text-[#C68E17]" />}
//           Direct Transfer Active
//         </span>
//         <div className="flex items-center gap-2">
//           {(status === 'transferring' || status === 'complete') && <ConnectionBadge conn={conn} />}
//           <span className={`text-xs font-bold uppercase tracking-wider ${status === 'complete' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-[#7B3F00]/70 dark:text-[#d4a373]/70'}`}>
//             {status}
//           </span>
//         </div>
//       </div>
//       {status === 'transferring' && <ProgressBar progress={progress} statusText={`File ${fileProgress.current}/${fileProgress.total}`} speed={speed} eta={eta} />}
//     </div>
//   );
// };

// // --- SENDER VIEW ---
// const SenderView = ({ payload, onCancel}: { payload: SharePayload; onCancel: () => void }) => {
//   const [peerId, setPeerId] = useState<string | null>(null);
//   const [receivers, setReceivers] = useState<any[]>([]);
//   const [copied, setCopied] = useState<boolean>(false);
//   const shareUrl = peerId ? `${window.location.origin}${window.location.pathname}#/receive/${peerId}` : '';

//   useEffect(() => {
//     let pc: RTCPeerConnection;
//     const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
//     const initializeRoom = async () => {
//       try {
//         const res = await fetch('https://chocoshare-turn-auth.snahasishdey141.workers.dev/');
//         const turnData = await res.json();

//         socket.emit('create-room', roomId);
//         setPeerId(roomId);

//         socket.on('peer-joined', async () => {
//           pc = new RTCPeerConnection({
//             iceServers: [ { urls: "stun:stun.l.google.com:19302" }, ...turnData.iceServers ],
//             iceCandidatePoolSize: 10
//           });

//           // Create the Data Channel natively
//           const dataChannel = pc.createDataChannel('chocoshare', { negotiated: false });
//           (dataChannel as any).peerConnection = pc; 
          
//           dataChannel.onopen = () => {
//             setReceivers(prev => [...prev, dataChannel]);
//           };

//           // Send Trickle ICE
//           pc.onicecandidate = (event) => {
//             if (event.candidate) {
//               socket.emit('signal', { roomId, signal: { type: 'candidate', candidate: event.candidate } });
//             }
//           };

//           // Create the Offer
//           const offer = await pc.createOffer();
//           await pc.setLocalDescription(offer);
//           socket.emit('signal', { roomId, signal: { type: 'offer', sdp: offer } });
//         });

//         // Handle the Receiver's Answer & ICE
//         socket.on('signal', async (signal) => {
//           if (signal.type === 'answer' && pc) {
//             await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
//           } else if (signal.type === 'candidate' && pc) {
//             await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
//           }
//         });

//       } catch (error) {
//         console.error("Connection failed", error);
//       }
//     };

//     initializeRoom();

//     return () => {
//       socket.off('peer-joined');
//       socket.off('signal');
//       if (pc) pc.close();
//     };
//   }, []); 

//   const handleCopy = () => { copyToClipboard(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

//   return (
//     <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.35 }} className="w-full max-w-[500px] mx-auto glass-card-strong rounded-3xl overflow-hidden transition-colors">
//       <div className="p-4 text-center text-white font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415]">
//         {!peerId ? <><Loader2 className="animate-spin" /> Securing Room...</> : <><div className="w-3 h-3 bg-white rounded-full animate-pulse" /> Room Open — Waiting for Guests</>}
//       </div>

//       <div className="p-8 flex flex-col items-center">
//         <div className="flex items-center gap-3 w-full glass-card p-4 rounded-2xl mb-6 transition-colors">
//           {payload.type === 'files' ? ( <FileBox className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" /> ) : ( <MessageSquare className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" /> )}
//           <div className="overflow-hidden">
//             {payload.type === 'files' ? (
//               <>
//                 <p className="font-bold text-[#3C1F00] dark:text-white truncate">{payload.data.length} File{payload.data.length > 1 ? 's' : ''} Ready</p>
//                 <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{formatBytes(payload.data.reduce((acc, file) => acc + file.size, 0))}</p>
//               </>
//             ) : (
//               <>
//                 <p className="font-bold text-[#3C1F00] dark:text-white truncate">Secure Text Snippet</p>
//                 <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{payload.data.length} characters</p>
//               </>
//             )}
//           </div>
//         </div>

//         {peerId && (
//           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
//             <div className="flex flex-col sm:flex-row items-center gap-4 w-full mb-6">
//                 <div className="bg-white p-3 rounded-2xl border-4 border-[#C68E17] dark:border-[#e5b342] shadow-lg shrink-0 hover:scale-105 transition-transform glow-gold">
//                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&color=3C1F00`} alt="QR Code" className="w-[120px] h-[120px]" />
//                 </div>
//                 <div className="glass-card-strong rounded-2xl w-full h-full p-4 text-center relative overflow-hidden flex flex-col justify-center min-h-[148px] transition-colors">
//                   <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#C68E17] via-[#d4a373] to-[#7B3F00] dark:from-[#e5b342] dark:via-[#d4a373] dark:to-[#c28415]"></div>
//                   <p className="text-[#7B3F00] dark:text-[#d4a373] font-bold mb-1 uppercase tracking-wider text-[10px]">Share Code</p>
//                   <div className="text-4xl sm:text-3xl md:text-4xl font-display font-black gradient-text tracking-[0.1em] drop-shadow-sm">{peerId}</div>
//                   <p className="text-[#7B3F00]/50 dark:text-[#d4a373]/50 text-[10px] mt-2 font-medium">Scan QR or enter code</p>
//                 </div>
//             </div>
            
//             <div className="w-full flex gap-3 mb-6">
//               <button onClick={handleCopy} className="flex-1 glass-button p-3 rounded-xl text-[#7B3F00] dark:text-[#e5b342] text-sm font-bold flex items-center justify-center gap-2">
//                 {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} {copied ? "Copied Link" : "Copy Link"}
//               </button>
//             </div>

//             <div className="w-full">
//               {receivers.length > 0 && <p className="text-sm font-bold text-[#7B3F00] dark:text-[#d4a373] mb-2 uppercase tracking-wider text-left">Active Transfers ({receivers.length})</p>}
//               <AnimatePresence>
//                 {receivers.map((conn, index) => (
//                   <motion.div key={index} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
//                     <TransferTask conn={conn} payload={payload} />
//                   </motion.div>
//                 ))}
//               </AnimatePresence>
//             </div>
//           </motion.div>
//         )}

//         <button onClick={onCancel} className="mt-4 text-sm text-[#7B3F00]/60 dark:text-[#d4a373]/60 hover:text-red-500 font-semibold underline-offset-4 hover:underline transition-colors">Close Room & Stop Sharing</button>
//       </div>
//     </motion.div>
//   );
// };

// // --- RECEIVER VIEW ---
// const ReceiverView = ({ senderId }: { senderId: string }) => {
//   const [status, setStatus] = useState<string>('connecting'); 
//   const [progress, setProgress] = useState<number>(0);
//   const [metadata, setMetadata] = useState<any>(null);
//   const [receivedText, setReceivedText] = useState<string | null>(null);
//   const [copied, setCopied] = useState(false);
//   const { speed, eta, updateSpeed, resetSpeed } = useTransferSpeed(); 
//   const connRef = useRef<any | null>(null);
//   const savedRef = useRef(false);

//   useEffect(() => {
//     let activeUrls: string[] = []; 
//     let pc: RTCPeerConnection;
//     let allFilesMeta: { name: string; size: number }[] = [];

//     const establishConnection = async () => {
//       try {
//         const res = await fetch('https://chocoshare-turn-auth.snahasishdey141.workers.dev/');
//         const turnData = await res.json();
        
//         pc = new RTCPeerConnection({
//           iceServers: [ { urls: "stun:stun.l.google.com:19302" }, ...turnData.iceServers ],
//           iceCandidatePoolSize: 10
//         });

//         socket.emit('join-room', senderId);

//         // Send Trickle ICE
//         pc.onicecandidate = (event) => {
//           if (event.candidate) {
//             socket.emit('signal', { roomId: senderId, signal: { type: 'candidate', candidate: event.candidate } });
//           }
//         };

//         // Handle Offer & ICE from Sender
//         socket.on('signal', async (signal) => {
//           if (signal.type === 'offer') {
//             await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             socket.emit('signal', { roomId: senderId, signal: { type: 'answer', sdp: answer } });
//           } else if (signal.type === 'candidate') {
//             await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
//           }
//         });

//         // When the Data Channel arrives
//         pc.ondatachannel = (event) => {
//           const conn = event.channel;
//           conn.binaryType = 'arraybuffer'; // Crucial for receiving raw files
//           (conn as any).peerConnection = pc; // Hack to keep ConnectionBadge working
//           connRef.current = conn;
          
//           let chunks: any[] = []; 
//           let receivedSize = 0; 
//           let fileMeta: any = null;
//           let lastUiUpdate = 0;

//           conn.onopen = () => {
//             setStatus('connecting');
//             conn.send(JSON.stringify({ type: 'request_metadata' }));
//           };

//           conn.onmessage = (e: MessageEvent) => {
//             if (typeof e.data !== 'string') {
//               // It's a raw file chunk
//               chunks.push(new Blob([e.data])); 
//               receivedSize += e.data.byteLength;
              
//               if (receivedSize - lastUiUpdate > 1024 * 1024 || receivedSize >= fileMeta.size) {
//                  setProgress(Math.min(100, (receivedSize / fileMeta.size) * 100));
//                  lastUiUpdate = receivedSize;
//               }
//               updateSpeed(receivedSize, fileMeta.size);
//               return;
//             }

//             // It's a JSON command
//             let data = JSON.parse(e.data);

//             if (data.type === 'text_message') {
//               setReceivedText(data.data);
//               setStatus('complete');
//             }
//             else if (data.type === 'metadata') {
//               fileMeta = data; setMetadata(data); chunks = []; receivedSize = 0; lastUiUpdate = 0; setProgress(0); setStatus('receiving'); 
//               allFilesMeta.push({ name: data.name, size: data.size });
//               resetSpeed(); 
//               conn.send(JSON.stringify({ type: 'ready' })); 
//             } 
//             else if (data.type === 'eof') {
//               const finalBlob = new Blob(chunks, { type: fileMeta.mime });
//               const url = URL.createObjectURL(finalBlob);
//               activeUrls.push(url); 
              
//               const a = document.createElement('a');
//               a.href = url; a.download = fileMeta.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
//               conn.send(JSON.stringify({ type: 'done' }));
//             }
//             else if (data.type === 'all_done') { setStatus('complete'); }
//           };
          
//           conn.onclose = () => { setStatus(prev => prev !== 'complete' ? 'error' : prev); };
//         };

//       } catch (error) {
//         setStatus('error');
//       }
//     };

//     establishConnection();
    
//     return () => { 
//       socket.off('signal');
//       activeUrls.forEach(url => URL.revokeObjectURL(url)); 
//       if (pc) pc.close(); 
//     };
//   }, [senderId, resetSpeed, updateSpeed]); 

//   // Save transfer record
//   useEffect(() => {
//     if ((status === 'complete' || status === 'error') && !savedRef.current) {
//       savedRef.current = true;
//       saveTransferRecord({
//         id: generateId(),
//         direction: 'received',
//         contentType: receivedText ? 'text' : 'files',
//         fileName: metadata?.name,
//         fileCount: metadata ? 1 : undefined,
//         totalSize: metadata?.size,
//         textPreview: receivedText ? receivedText.substring(0, 50) : undefined,
//         timestamp: Date.now(),
//         peerId: senderId.substring(0, 6).toUpperCase(),
//         status: status as 'complete' | 'failed',
//       });
//     }
//   }, [status, metadata, receivedText, senderId]);

//   const handleCopyText = () => {
//     if (receivedText) {
//       copyToClipboard(receivedText);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//     }
//   }

//   return (
//     <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.35 }} className="w-full max-w-md mx-auto glass-card-strong rounded-3xl overflow-hidden transition-colors">
//       <div className={`p-4 text-center text-white font-bold flex items-center justify-center gap-2 ${ status === 'connecting' ? 'bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415]' : status === 'receiving' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : status === 'complete' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600' }`}>
//         {status === 'connecting' && <><Loader2 className="animate-spin" /> Connecting to Sender...</>}
//         {status === 'receiving' && <><Download className="animate-bounce" /> Receiving Data...</>}
//         {status === 'complete' && <><CheckCircle2 /> Transfer Complete!</>}
//         {status === 'error' && <><X /> Link Expired or Broken</>}
//       </div>

//       <div className="p-8 flex flex-col items-center">
//         {/* Connection badge */}
//         {connRef.current && (status === 'receiving' || status === 'complete') && (
//           <div className="mb-4 self-start">
//             <ConnectionBadge conn={connRef.current} />
//           </div>
//         )}

//         {metadata && status !== 'complete' && !receivedText && (
//           <div className="flex items-center gap-3 w-full glass-card p-4 rounded-2xl mb-6 transition-colors">
//             <FileBox className="text-[#7B3F00] dark:text-[#e5b342] w-8 h-8 flex-shrink-0" />
//             <div className="overflow-hidden">
//               <p className="font-bold text-[#3C1F00] dark:text-white truncate">{metadata.name}</p>
//               <p className="text-sm text-[#7B3F00] dark:text-[#d4a373]">{formatBytes(metadata.size)}</p>
//             </div>
//           </div>
//         )}

//         {status === 'connecting' && !metadata && !receivedText && (
//           <div className="py-10 flex flex-col items-center text-[#7B3F00] dark:text-[#d4a373]">
//             <Wifi className="w-12 h-12 mb-4 animate-pulse opacity-50" />
//             <p className="font-semibold text-center">Looking for sender...<br/>Make sure they haven't closed their tab.</p>
//           </div>
//         )}

//         {status === 'receiving' && !receivedText && <ProgressBar progress={progress} statusText={`Downloading ${metadata?.name}...`} speed={speed} eta={eta} />}

//         {status === 'complete' && receivedText && (
//           <div className="w-full flex flex-col mt-2 mb-6">
//             <div className="flex items-center gap-2 mb-3 text-[#7B3F00] dark:text-[#d4a373] font-bold">
//               <MessageSquare className="w-5 h-5" /> Received Message:
//             </div>
//             <div className="glass-card p-4 rounded-2xl text-[#3C1F00] dark:text-white mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap word-break-all font-medium text-sm">
//               {receivedText}
//             </div>
//             <button onClick={handleCopyText} className="flex items-center justify-center gap-2 w-full py-3 glass-button rounded-xl font-bold transition-all">
//               {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-[#C68E17] dark:text-[#e5b342]" />}
//               {copied ? "Copied to Clipboard!" : "Copy Text"}
//             </button>
//           </div>
//         )}

//         {status === 'complete' && !receivedText && (
//           <div className="text-center w-full py-6">
//             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.6 }} className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
//               <CheckCircle2 className="w-10 h-10 text-green-600" />
//             </motion.div>
//             <p className="font-display font-bold text-[#3C1F00] dark:text-white mb-2 text-xl">All Done!</p>
//             <p className="text-sm text-[#7B3F00]/60 dark:text-[#d4a373]/60 mb-6 font-medium">Files have been saved to your device.</p>
//           </div>
//         )}

//         {status === 'complete' && (
//           <button onClick={() => window.location.hash = ''} className="gradient-button text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md w-full">
//             Go to Homepage
//           </button>
//         )}

//         {status === 'error' && (
//           <div className="text-center w-full py-6">
//             <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
//             <p className="font-display font-bold text-[#3C1F00] dark:text-white mb-2 text-xl">Transfer Failed</p>
//             <p className="text-sm text-[#7B3F00]/60 dark:text-[#d4a373]/60 mb-6 font-medium">The sender might have closed their tab, or the link is invalid.</p>
//             <button onClick={() => window.location.hash = ''} className="gradient-button text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md">
//               Go to Homepage
//             </button>
//           </div>
//         )}
//       </div>
//     </motion.div>
//   );
// };

// // --- LEGAL MODALS ---
// const LegalModal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
//   if (!isOpen) return null;
//   return (
//     <div className="fixed inset-0 bg-[#3C1F00]/30 dark:bg-black/50 backdrop-blur-md z-[60] flex items-center justify-center p-4">
//       <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card-strong rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors">
//         <div className="bg-gradient-to-r from-[#7B3F00] to-[#3C1F00] dark:from-[#221207] dark:to-[#120601] p-6 text-white flex justify-between items-center shrink-0">
//           <h3 className="text-xl font-display font-bold flex items-center gap-2">{title}</h3>
//           <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X className="w-6 h-6" /></button>
//         </div>
//         <div className="p-6 md:p-8 overflow-y-auto text-[#7B3F00]/80 dark:text-[#d4a373]/90 font-medium space-y-4">
//           {children}
//         </div>
//         <div className="p-6 border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 shrink-0">
//           <button onClick={onClose} className="w-full py-3 gradient-button text-white font-bold rounded-xl">
//             I Understand
//           </button>
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// // --- FOOTER ---
// const Footer = ({ onOpenPrivacy, onOpenTerms }: { onOpenPrivacy: () => void, onOpenTerms: () => void }) => (
//   <footer className="w-full relative z-40 border-t border-[#7B3F00]/8 dark:border-[#d4a373]/8 bg-[#FFFDD0]/70 dark:bg-[#221207]/70 backdrop-blur-xl transition-colors mt-auto">
//     <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-8 mb-12">
        
//         <div className="md:col-span-2">
//           <div className="flex items-center gap-3 mb-4 cursor-pointer group" onClick={() => {window.location.hash = ''; window.scrollTo(0,0);}}>
//             <img src="/logo.png" alt="ChocoShare Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
//             <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-[#3C1F00] dark:text-white transition-colors">
//               Choco<span className="text-[#7B3F00] dark:text-[#e5b342] transition-colors">share</span>
//             </h2>
//           </div>
//           <p className="text-[#7B3F00]/70 dark:text-[#d4a373]/70 font-medium max-w-sm transition-colors mb-6 leading-relaxed">
//             Redefining secure, device-to-device file transfers. No cloud storage, no file size limits, just lightning-fast peer-to-peer encryption.
//           </p>
//           <div className="flex gap-3">
//             <a href="https://github.com/basic30" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] hover:scale-110 transition-all"><Github className="w-4 h-4" /></a>
//             <a href="https://instagram.com/snahasish0915" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] hover:scale-110 transition-all"><Instagram className="w-4 h-4" /></a>
//             <a href="mailto:snahasishdey143@gmail.com" className="w-10 h-10 rounded-full flex items-center justify-center glass-button text-[#7B3F00]/70 hover:text-[#C68E17] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] hover:scale-110 transition-all"><Mail className="w-4 h-4" /></a>
//           </div>
//         </div>

//         <div>
//           <h3 className="font-display font-bold text-[#3C1F00] dark:text-white mb-5 transition-colors uppercase tracking-wider text-sm">Product</h3>
//           <ul className="space-y-3 sm:space-y-4">
//             <li><button onClick={() => {window.location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' });}} className="text-[#7B3F00]/70 hover:text-[#7B3F00] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] transition-colors font-medium">Home</button></li>
//             <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-[#7B3F00]/70 hover:text-[#7B3F00] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] transition-colors font-medium">How it Works</button></li>
//           </ul>
//         </div>

//         <div>
//           <h3 className="font-display font-bold text-[#3C1F00] dark:text-white mb-5 transition-colors uppercase tracking-wider text-sm">Legal</h3>
//           <ul className="space-y-3 sm:space-y-4">
//             <li><button onClick={onOpenPrivacy} className="text-[#7B3F00]/70 hover:text-[#7B3F00] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] transition-colors font-medium">Privacy Policy</button></li>
//             <li><button onClick={onOpenTerms} className="text-[#7B3F00]/70 hover:text-[#7B3F00] dark:text-[#d4a373]/70 dark:hover:text-[#e5b342] transition-colors font-medium">Terms of Service</button></li>
//           </ul>
//         </div>
//       </div>

//       <div className="pt-8 border-t border-[#7B3F00]/8 dark:border-[#d4a373]/8 flex flex-col md:flex-row justify-between items-center gap-4">
//         <p className="text-[#7B3F00]/50 dark:text-[#d4a373]/50 font-medium text-sm text-center md:text-left transition-colors">© {new Date().getFullYear()} ChocoShare. All rights reserved.</p>
//         <p className="text-[#7B3F00]/50 dark:text-[#d4a373]/50 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors">
//           Engineered with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> by <span className="font-bold text-[#3C1F00] dark:text-white">Snahasish Dey</span>
//         </p>
//       </div>
//     </div>
//   </footer>
// );

// // --- MAIN APP ---
// export default function App() {
//   const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
//   if (isMaintenanceMode) {
//     return <MaintenanceView />;
//   }
//   const [showPrivateChat, setShowPrivateChat] = useState(false);
//   const [route, setRoute] = useState<string>('home'); 
//   const [payloadToShare, setPayloadToShare] = useState<SharePayload | null>(null);
//   const [receiverId, setReceiverId] = useState<string | null>(null);
//   const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
//   const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
//   const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
//   const [showHistory, setShowHistory] = useState<boolean>(false);
  
//   const [isDark, setIsDark] = useState<boolean>(() => {
//     if (typeof window !== 'undefined') {
//       const saved = localStorage.getItem('theme');
//       if (saved) return saved === 'dark';
//       return window.matchMedia('(prefers-color-scheme: dark)').matches;
//     }
//     return false;
//   });

//   const handleToggleTheme = () => {
//     const nextTheme = isDark ? 'light' : 'dark';
//     setIsDark(!isDark);
//     localStorage.setItem('theme', nextTheme);
//   };

//   useEffect(() => {
//     if (isDark) {
//       document.documentElement.classList.add('dark');
//     } else {
//       document.documentElement.classList.remove('dark');
//     }
//   }, [isDark]);

//   useEffect(() => {
//     const handleHashChange = () => {
//       const hash = window.location.hash;
//       if (hash.startsWith('#/receive/')) {
//         const id = hash.replace('#/receive/', '').toUpperCase();
//         setReceiverId(id); setRoute('receive');
//       } else if (payloadToShare !== null) {
//         setRoute('send');
//       } else {
//         setRoute('home');
//       }
//     };
//     window.addEventListener('hashchange', handleHashChange);
//     handleHashChange(); 
//     return () => window.removeEventListener('hashchange', handleHashChange);
//   }, [payloadToShare]);

//   useEffect(() => {
//     // Check if there are files shared natively from the OS
//     const checkSharedFiles = async () => {
//       try {
//         const req = indexedDB.open('ChocoShareDB', 1);
//         req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('shared_store');
        
//         req.onsuccess = (e: any) => {
//           const db = e.target.result;
//           if (!db.objectStoreNames.contains('shared_store')) return;
          
//           const tx = db.transaction('shared_store', 'readwrite');
//           const store = tx.objectStore('shared_store');
//           const getReq = store.get('pending_share');
          
//           getReq.onsuccess = () => {
//             const files = getReq.result;
//             if (files && files.length > 0) {
//               // 1. Delete them from DB so it doesn't re-trigger on refresh
//               store.delete('pending_share');
              
//               // 2. Automatically kick off the sharing process
//               startSharing({ type: 'files', data: files });
//             }
//           };
//         };
//       } catch (error) {
//         console.error('Error loading natively shared files:', error);
//       }
//     };
    
//     checkSharedFiles();
//   }, []);

//   const startSharing = (payload: SharePayload) => { setPayloadToShare(payload); setRoute('send'); window.location.hash = '#/send'; };
//   const cancelSharing = () => { setPayloadToShare(null); setRoute('home'); window.location.hash = ''; };

//   return (
//     <div className="min-h-screen bg-[#FFFDD0] dark:bg-[#221207] text-[#3C1F00] dark:text-white font-sans selection:bg-[#C68E17]/30 selection:text-[#3C1F00] dark:selection:text-white flex flex-col relative overflow-x-hidden transition-colors duration-700 ease-in-out">

//       <UpdateModal />

//       <ParticleBackground />
//       <ChocolateHeader />

//       {/* --- HEADER / NAVBAR --- */}
//       <header className="fixed top-0 left-0 w-full p-3 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-[#FFFDD0] dark:from-[#221207] to-transparent transition-colors">
        
//         {/* LEFT: BRANDING */}
//         <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0" onClick={() => window.location.hash = ''}>
//           <div className="flex-shrink-0 flex items-center justify-center hover:rotate-3 transition-transform">
//             <img src="/logo.png" alt="ChocoShare Logo" className="w-8 h-8 sm:w-12 sm:h-12 object-contain drop-shadow-md" />
//           </div>
//           <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight drop-shadow-sm text-[#3C1F00] dark:text-white transition-colors truncate">
//             Choco<span className="gradient-text">share</span>
//           </h1>
//         </div>

//         {/* RIGHT: ICONS & BUTTONS */}
//         <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          
//           {/* History Button */}
//           <button 
//             onClick={() => setShowHistory(true)}
//             className="w-8 h-8 sm:w-10 sm:h-10 glass-button rounded-full flex items-center justify-center group"
//             aria-label="Transfer History"
//           >
//             <History className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#7B3F00] dark:text-[#d4a373] group-hover:text-[#C68E17] dark:group-hover:text-[#e5b342] transition-colors" />
//           </button>

//           <a 
//             href="https://instagram.com/snahasish0915" 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className="w-8 h-8 sm:w-10 sm:h-10 glass-button rounded-full flex items-center justify-center group"
//             aria-label="Follow on Instagram"
//           >
//             <Instagram className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform" />
//           </a>

//           <a 
//             href="https://github.com/basic30" 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className="w-8 h-8 sm:w-10 sm:h-10 glass-button rounded-full flex items-center justify-center group"
//           >
//             <Github className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-800 dark:text-gray-200 group-hover:scale-110 transition-transform" />
//           </a>

//           <button 
//             onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
//             className="hidden md:flex w-10 h-10 glass-button rounded-full items-center justify-center group"
//             title="How it works"
//           >
//             <Info className="w-[18px] h-[18px] text-[#7B3F00] dark:text-[#e5b342] group-hover:scale-110 transition-transform" />
//           </button>
          
//           <button 
//             onClick={handleToggleTheme} 
//             className="w-8 h-8 sm:w-10 sm:h-10 glass-button rounded-full flex items-center justify-center relative overflow-hidden group"
//             aria-label="Toggle Theme"
//           >
//             <AnimatePresence mode="wait" initial={false}>
//               <motion.div
//                 key={isDark ? "dark" : "light"}
//                 initial={{ y: -18, opacity: 0, rotate: -90 }}
//                 animate={{ y: 0, opacity: 1, rotate: 0 }}
//                 exit={{ y: 18, opacity: 0, rotate: 90 }}
//                 transition={{ type: "spring", stiffness: 350, damping: 20 }}
//                 className="flex items-center justify-center"
//               >
//                 {isDark ? (
//                   <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#e5b342]" />
//                 ) : (
//                   <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#C68E17] group-hover:rotate-45 transition-transform duration-300" />
//                 )}
//               </motion.div>
//             </AnimatePresence>
//           </button>

//           <button onClick={() => setShowReceiveModal(true)} className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#7B3F00] to-[#3C1F00] dark:from-[#e5b342] dark:to-[#c28415] hover:shadow-glow-gold text-white dark:text-[#120601] px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm">
//             <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
//             <span className="hidden sm:inline">Receive</span>
//           </button>

//         </div>
//       </header>

//       <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 pt-20 relative z-10 w-full min-h-[calc(100vh-120px)]">
//         <AnimatePresence mode="wait">
//           {route === 'home' && <HomeView key="home" onShare={startSharing} />}
//           {route === 'send' && payloadToShare !== null && (
//             <div className="w-full mt-8 sm:mt-16 mb-20 flex justify-center">
//               <SenderView key="send" payload={payloadToShare} onCancel={cancelSharing} />
//             </div>
//           )}
//           {route === 'receive' && receiverId && (
//             <div className="w-full mt-8 sm:mt-16 mb-20 flex justify-center">
//                <ReceiverView key={`receive-${receiverId}`} senderId={receiverId} />
//             </div>
//           )}
//         </AnimatePresence>
//       </main>

//       <Footer 
//         onOpenPrivacy={() => setShowPrivacyModal(true)} 
//         onOpenTerms={() => setShowTermsModal(true)} 
//       />

//       <ReceiveModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} />
//       <TransferHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />

//       <LegalModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
//         <p className="font-bold text-[#3C1F00] dark:text-white text-lg">Your data is yours.</p>
//         <p>Because ChocoShare is built on Peer-to-Peer (P2P) WebRTC technology, absolute privacy is fundamentally engineered into the core of our application.</p>
//         <ul className="list-disc pl-5 space-y-2 mt-4">
//           <li><strong className="text-[#3C1F00] dark:text-white">No Server Storage:</strong> We do not store, host, or read your files or text messages. Your data goes directly from your device to the receiver's device.</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">End-to-End Encryption:</strong> All transfers are heavily encrypted in transit by standard WebRTC security protocols (DTLS/SRTP).</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">Routing Data:</strong> We use STUN/TURN servers strictly to help devices find each other across firewalls. These relay servers securely pass the encrypted data chunks without decrypting or logging them.</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">No Tracking:</strong> We do not use invasive tracking cookies, and we do not collect personal IP addresses for analytics.</li>
//         </ul>
//       </LegalModal>

//       <LegalModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms of Service">
//         <p>By using ChocoShare, you agree to the following terms:</p>
//         <ul className="list-disc pl-5 space-y-3 mt-4">
//           <li><strong className="text-[#3C1F00] dark:text-white">Acceptable Use:</strong> You agree not to use this service to transfer illegal, malicious, or harmful files.</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">User Responsibility:</strong> Because transfers are direct and encrypted, ChocoShare cannot monitor or moderate content. You are entirely responsible for the files and text you choose to send or receive.</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">No Warranty:</strong> ChocoShare is a free tool provided "as is" without warranties of any kind. We are not liable for interrupted transfers, data loss, or network limitations.</li>
//           <li><strong className="text-[#3C1F00] dark:text-white">Fair Use:</strong> While there are no hard file size limits, users must respect the fair use of our free TURN relay servers to ensure the service remains fast for everyone.</li>
//         </ul>
//       </LegalModal>

//       {/* --- FLOATING CHAT BUTTON --- */}
//       <button
//         onClick={() => setShowPrivateChat(true)}
//         className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[45] bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group glow-gold border border-white/20"
//         aria-label="Open Private Chat"
//       >
//         <MessageSquarePlus className="w-7 h-7 group-hover:animate-pulse" />
        
//         {/* Optional Notification Dot */}
//         <span className="absolute top-0 right-0 flex h-3 w-3">
//           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//           <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
//         </span>
//       </button>

//       {/* --- SEPARATE CHAT PAGE OVERLAY --- */}
//       <AnimatePresence>
//         {showPrivateChat && (
//           <PrivateChat onClose={() => setShowPrivateChat(false)} />
//         )}
//       </AnimatePresence>
      
//     </div>
//   );
// }

import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-center selection:bg-gray-700">
      <div className="max-w-2xl bg-gray-800 rounded-lg shadow-2xl p-8 md:p-12 border border-gray-700">
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-6 tracking-tight">
          Heartbroken, but closing our doors.
        </h1>
        
        <div className="text-gray-300 space-y-6 text-lg leading-relaxed text-left">
          <p>
            Dear friends and users of ChocoShare,
          </p>
          <p>
            It is with a heavy heart that we have to share some devastating news with you today. Recently, our website name was taken from us, which has tragically resulted in ChocoShare being entirely removed from Google. 
          </p>
          <p>
            Building this peer-to-peer space and sharing it with all of you has been an incredible journey. What started with a sweet vision to help people connect and share seamlessly has unfortunately hit a bitter roadblock. 
          </p>
          <p>
            Because of these heartbreaking circumstances that are out of our control, we have made the incredibly difficult decision to officially shut down ChocoShare until further notice. 
          </p>
          <p>
            We are so deeply grateful for every file you shared, every connection you made, and the unwavering support you've shown us. Right now, we need to step back, protect what is left of our work, and figure out our next steps. 
          </p>
          <p>
            We hope this isn't goodbye forever, but for now, we must step away. 
          </p>
          
          <div className="pt-6 mt-6 border-t border-gray-700 text-center">
            <p className="font-medium text-gray-200">
              With all our love and deepest gratitude,
            </p>
            <p className="text-xl font-semibold text-white mt-2">
              The ChocoShare Team
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
