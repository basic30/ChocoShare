import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { X, Send, Image as ImageIcon, Mic, Square, Loader2, MessageSquare, Lock, Trash2, Smile, WifiOff, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string; 
  sender: 'me' | 'partner';
  timestamp: Date;
}

const BASIC_EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '🥺', '😡', '👍', '🙏', '❤️', '🔥', '✨', '🍫', '🎉', '👀', '💯'];

export default function PrivateChat({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<'lobby' | 'chat'>('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [status, setStatus] = useState('');
  const [connState, setConnState] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<{ blob: Blob, url: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const activeRoleRef = useRef<'creator' | 'joiner' | null>(null);
  const activeCodeRef = useRef<string | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());
  const chunkTrackerRef = useRef<Record<string, { type: 'text' | 'image', chunks: string[], count: number, timestamp: string }>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping, audioPreview]);

  useEffect(() => {
    return () => {
      console.log("[WebRTC] Component unmounting, tearing down connections and memory.");
      if (dcRef.current) dcRef.current.close();
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      
      activeBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      activeBlobUrlsRef.current.clear();
    };
  }, []);

  const getIceServers = async () => {
    try {
      const res = await fetch('https://chocoshare-turn-auth.snahasishdey141.workers.dev/');
      const data = await res.json();
      return [{ urls: "stun:stun.l.google.com:19302" }, ...data.iceServers];
    } catch (e) {
      console.error("[WebRTC] Failed to fetch TURN servers.", e);
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log("[DataChannel] Channel securely opened.");
      setStatus('');
      setConnState('connected');
      setView('chat');
    };

    let binaryTracker: { id: string, chunks: ArrayBuffer[], count: number, total: number, timestamp: string, mime: string } | null = null;

    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (binaryTracker) {
          binaryTracker.chunks.push(event.data);
          binaryTracker.count++;
          if (binaryTracker.count === binaryTracker.total) {
            console.log(`[DataChannel] Assembled complete binary payload for ${binaryTracker.id}`);
            const blob = new Blob(binaryTracker.chunks, { type: binaryTracker.mime });
            const url = URL.createObjectURL(blob);
            activeBlobUrlsRef.current.add(url);

            setMessages(prev => [...prev, { id: binaryTracker!.id, type: 'audio', content: url, sender: 'partner', timestamp: new Date(binaryTracker!.timestamp) }]);
            setPartnerTyping(false);
            binaryTracker = null;
          }
        }
        return;
      }

      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'msg_start_binary') {
          binaryTracker = { id: data.id, chunks: [], count: 0, total: data.total, timestamp: data.timestamp, mime: data.mimeType };
          return;
        }

        if (data.type === 'msg_start') {
          chunkTrackerRef.current[data.id] = { type: data.msgType, chunks: new Array(data.total), count: 0, timestamp: data.timestamp };
          return;
        }

        if (data.type === 'msg_chunk') {
          const tracker = chunkTrackerRef.current[data.id];
          if (!tracker) return;
          if (!tracker.chunks[data.index]) {
            tracker.chunks[data.index] = data.chunk;
            tracker.count++;
          }
          if (tracker.count === tracker.chunks.length) {
            setMessages(prev => [...prev, { id: data.id, type: tracker.type, content: tracker.chunks.join(''), sender: 'partner', timestamp: new Date(tracker.timestamp) }]);
            setPartnerTyping(false);
            delete chunkTrackerRef.current[data.id];
          }
          return;
        }

        if (data.type === 'typing') setPartnerTyping(data.status);
      } catch (e) {
        console.error("[DataChannel] Failed to parse text packet", e);
      }
    };

    channel.onerror = (error) => console.error("[DataChannel] Native Error:", error);
    channel.onclose = () => { 
      console.warn("[DataChannel] Closed by remote peer or network drop.");
      setConnState('disconnected'); 
      setPartnerTyping(false); 
    };
    dcRef.current = channel;
  };

  const createPeerConnection = async (isCreator: boolean, targetId: string) => {
    try {
      if (pcRef.current) pcRef.current.close(); 
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      candidateQueueRef.current = [];

      pc.onicecandidate = (e) => {
        if (e.candidate && socketRef.current?.connected) {
          socketRef.current.emit('signal', { roomId: targetId, signal: { type: 'candidate', candidate: e.candidate } });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          setConnState('reconnecting');
          if (isCreator && activeCodeRef.current) setTimeout(() => { if (pcRef.current === pc) initiateOffer(activeCodeRef.current!); }, 1500);
        } 
        else if (pc.iceConnectionState === 'disconnected') {
          setConnState('reconnecting');
        } 
        else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnState('connected');
        }
      };
      return pc;
    } catch (e) {
      console.error("[WebRTC] Failed to create RTCPeerConnection", e);
      throw e;
    }
  };

  const initiateOffer = async (targetId: string) => {
    try {
      setStatus('Securing P2P connection...');
      const pc = await createPeerConnection(true, targetId);
      const dc = pc.createDataChannel('secure_chat', { negotiated: false }); 
      setupDataChannel(dc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('signal', { roomId: targetId, signal: { type: 'offer', sdp: offer } });
    } catch (e) { console.error("[WebRTC] Negotiation offer failed", e); }
  };

  const handleIncomingOffer = async (sdp: any, targetId: string) => {
    try {
      setStatus('Securing P2P connection...');
      const pc = await createPeerConnection(false, targetId);
      pc.ondatachannel = (e) => setupDataChannel(e.channel);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const c of candidateQueueRef.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} }
      candidateQueueRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('signal', { roomId: targetId, signal: { type: 'answer', sdp: answer } });
    } catch (e) { console.error("[WebRTC] Negotiation answer failed", e); }
  };

  const setupSocket = (role: 'creator' | 'joiner', code: string) => {
    if (!socketRef.current) socketRef.current = io('https://chocoshare-chocoshare-signaling.hf.space');
    const socket = socketRef.current;
    
    socket.on('peer-joined', () => { if (activeRoleRef.current === 'creator' && activeCodeRef.current) initiateOffer(activeCodeRef.current); });
    socket.on('signal', async (signal) => {
      const targetId = activeCodeRef.current;
      if (!targetId) return;
      if (signal.type === 'offer') handleIncomingOffer(signal.sdp, targetId);
      else if (signal.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const c of candidateQueueRef.current) { try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} }
        candidateQueueRef.current = [];
      }
      else if (signal.type === 'candidate') {
        if (pcRef.current && pcRef.current.remoteDescription) { try { await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch(e){} } 
        else { candidateQueueRef.current.push(signal.candidate); }
      }
    });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const role = activeRoleRef.current;
        const targetId = activeCodeRef.current;
        if (targetId && socketRef.current) {
          if (!socketRef.current.connected) { 
            socketRef.current.connect(); 
            socketRef.current.emit('join-room', targetId); 
          }
          const state = pcRef.current?.iceConnectionState;
          if (role === 'creator' && (state === 'failed' || state === 'closed')) { 
            setConnState('reconnecting'); initiateOffer(targetId); 
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleCreateRoom = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code); activeRoleRef.current = 'creator'; activeCodeRef.current = code;
    setupSocket('creator', code);
    setStatus('Generating secure room...'); socketRef.current?.emit('create-room', code); setStatus('Waiting for partner...');
  };

  const handleJoinRoom = () => {
    if (joinId.length !== 6) return;
    setStatus('Connecting to room...'); activeRoleRef.current = 'joiner'; activeCodeRef.current = joinId;
    setupSocket('joiner', joinId); socketRef.current?.emit('join-room', joinId);
  };

  const sendMessage = async (type: 'text' | 'image', content: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open' || !content) return;
    
    const msgId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date();
    
    setMessages(prev => [...prev, { id: msgId, type, content, sender: 'me', timestamp }]);
    setInputText(''); setShowEmojiPicker(false); handleTyping(false);

    try {
      const CHUNK_SIZE = 16384; 
      const totalChunks = Math.ceil(content.length / CHUNK_SIZE);

      dcRef.current.send(JSON.stringify({ type: 'msg_start', id: msgId, msgType: type, total: totalChunks, timestamp: timestamp.toISOString() }));
      
      if (totalChunks > 0) {
        for (let i = 0; i < totalChunks; i++) {
          if (!dcRef.current || dcRef.current.readyState !== 'open') break;
          while (dcRef.current && dcRef.current.bufferedAmount > 65535) {
            await new Promise(resolve => setTimeout(resolve, 50));
            if (dcRef.current?.readyState !== 'open') throw new Error("Channel closed");
          }
          dcRef.current.send(JSON.stringify({ type: 'msg_chunk', id: msgId, index: i, chunk: content.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE) }));
          await new Promise(resolve => setTimeout(resolve, 2));
        }
      }
    } catch (e) { console.error(`[DataChannel] Transmission aborted`, e); }
  };

  const sendAudioBinary = async () => {
    if (!audioPreview || !dcRef.current || dcRef.current.readyState !== 'open') return;
    
    try {
      const blob = audioPreview.blob;
      const msgId = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date();

      const historyUrl = URL.createObjectURL(blob);
      activeBlobUrlsRef.current.add(historyUrl);

      setMessages(prev => [...prev, { id: msgId, type: 'audio', content: historyUrl, sender: 'me', timestamp }]);
      setAudioPreview(null);

      const CHUNK_SIZE = 8192; 
      const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);

      dcRef.current.send(JSON.stringify({
        type: 'msg_start_binary', id: msgId, msgType: 'audio', total: totalChunks, timestamp: timestamp.toISOString(), mimeType: blob.type
      }));

      for (let i = 0; i < totalChunks; i++) {
        if (!dcRef.current || dcRef.current.readyState !== 'open') break;
        while (dcRef.current && dcRef.current.bufferedAmount > 65535) {
           await new Promise(resolve => setTimeout(resolve, 20));
           if (dcRef.current?.readyState !== 'open') throw new Error("Channel closed");
        }
        
        const chunkBlob = blob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const arrayBuffer = await chunkBlob.arrayBuffer();
        dcRef.current.send(arrayBuffer);
        
        if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 2));
      }
    } catch (e) { console.error("[Audio] Binary transmission aborted.", e); }
  };

  const handleTyping = (status: boolean) => {
    setIsTyping(status);
    if (dcRef.current?.readyState === 'open') dcRef.current.send(JSON.stringify({ type: 'typing', status }));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping) handleTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500);
  };

  const addEmoji = (emoji: string) => { setInputText(prev => prev + emoji); if (!isTyping) handleTyping(true); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; const MAX_HEIGHT = 1200;
        let width = img.width; let height = img.height;
        if (width > height && width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } 
        else if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        sendMessage('image', canvas.toDataURL('image/jpeg', 0.8)); 
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 12000 } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        activeBlobUrlsRef.current.add(url);
        setAudioPreview({ blob: audioBlob, url });
        
        stream.getTracks().forEach(track => { track.stop(); track.enabled = false; });
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      };
      
      mediaRecorder.start();
      setIsRecording(true);

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
           mediaRecorderRef.current.stop();
           setIsRecording(false);
        }
      }, 10000);

    } catch (err) { 
      console.error('[Audio] Mic access denied', err); 
    }
  };

  const stopRecording = () => { 
    if (mediaRecorderRef.current && isRecording) { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
    } 
  };
  
  const cancelRecording = () => { 
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url); 
      activeBlobUrlsRef.current.delete(audioPreview.url);
    }
    setAudioPreview(null); 
  };
  
  const downloadImage = () => {
    if (!previewImage) return;
    const a = document.createElement('a');
    a.href = previewImage;
    a.download = `chocoshare-chat-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3C1F00]/40 dark:bg-black/60 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
          className="w-full max-w-md h-[85vh] glass-card-strong rounded-3xl flex flex-col overflow-hidden relative border border-[#7B3F00]/20 dark:border-[#d4a373]/20 shadow-2xl">
          
          <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415] text-white shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 opacity-80" />
              <h2 className="font-display font-bold text-lg">Secure Chat</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {view === 'lobby' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="w-16 h-16 text-[#C68E17] dark:text-[#e5b342] mb-4 opacity-50" />
              <p className="text-[#7B3F00] dark:text-[#d4a373] font-medium mb-8">Messages are ephemeral. Everything is destroyed when you leave.</p>
              
              <div className="w-full glass-card p-6 rounded-2xl space-y-6">
                {!roomId ? (
                  <button onClick={handleCreateRoom} className="w-full py-4 gradient-button text-white font-bold rounded-xl flex items-center justify-center gap-2">
                    Create Private Room
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#7B3F00] dark:text-[#d4a373] uppercase tracking-wider mb-2">Your Room Code</p>
                    <p className="text-4xl font-display font-black tracking-widest text-[#3C1F00] dark:text-white mb-4 drop-shadow-sm">{roomId}</p>
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#7B3F00]/70 dark:text-[#d4a373]/70">
                      <Loader2 className="w-4 h-4 animate-spin" /> {status || 'Waiting for partner...'}
                    </div>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-bold text-[#7B3F00]/50 dark:text-[#d4a373]/50">OR JOIN</span>
                  <div className="flex-grow border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10"></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input 
                    type="text" 
                    maxLength={6} 
                    placeholder="6-Digit Code" 
                    value={joinId} 
                    onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:flex-1 min-w-0 glass-input rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-[#3C1F00] dark:text-white focus:outline-none" 
                  />
                  <button 
                    onClick={handleJoinRoom} 
                    className="w-full sm:w-auto px-8 py-3 bg-[#7B3F00] dark:bg-[#d4a373] hover:bg-[#3C1F00] dark:hover:bg-[#e5b342] text-white dark:text-[#120601] font-bold rounded-xl transition-colors shrink-0"
                  >
                    Join
                  </button>
                </div>
                {status && !roomId && <p className="text-sm font-medium text-[#7B3F00] dark:text-[#d4a373] mt-2">{status}</p>}
              </div>
            </div>
          ) : (
            
            <div className="flex-1 flex flex-col bg-[#FFFDD0]/30 dark:bg-[#120601]/30 overflow-hidden relative">
              <div className={`text-center py-1.5 flex items-center justify-center gap-2 border-b transition-colors shadow-sm ${
                  connState === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                  connState === 'reconnecting' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
              }`}>
                 {connState === 'connected' && <><Lock className="w-3.5 h-3.5"/> <span className="text-xs font-bold tracking-wide">End-to-End Encrypted</span></>}
                 {connState === 'reconnecting' && <><Loader2 className="w-3.5 h-3.5 animate-spin"/> <span className="text-xs font-bold tracking-wide">Reconnecting...</span></>}
                 {connState === 'disconnected' && <><WifiOff className="w-3.5 h-3.5"/> <span className="text-xs font-bold tracking-wide">Partner Offline</span></>}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onClick={() => setShowEmojiPicker(false)}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.sender === 'me' ? 'bg-[#7B3F00] dark:bg-[#d4a373] text-white dark:text-[#120601] rounded-br-sm' : 'glass-card text-[#3C1F00] dark:text-white rounded-bl-sm'}`}>
                      {msg.type === 'text' && <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                      {msg.type === 'image' && (
                        <img 
                          src={msg.content} 
                          alt="shared" 
                          onClick={() => setPreviewImage(msg.content)}
                          className="rounded-lg max-h-48 object-contain mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
                        />
                      )}
                      {msg.type === 'audio' && <audio controls src={msg.content} className="max-w-full h-10" />}
                      <span className={`text-[10px] font-bold mt-1.5 block text-right opacity-60`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {partnerTyping && (
                  <div className="flex justify-start">
                    <div className="glass-card text-[#7B3F00] dark:text-[#d4a373] p-3 rounded-2xl rounded-bl-sm italic text-xs font-bold shadow-sm flex items-center gap-1">
                      Typing <span className="animate-pulse">...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* FIX: Add strict shrinking controls to the input bar so mobile buttons don't get pushed out */}
              <div className="p-3 glass-card border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 flex items-end gap-2 shrink-0 relative">
                
                <AnimatePresence>
                  {showEmojiPicker && !audioPreview && !isRecording && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-4 mb-2 p-3 glass-card-strong rounded-2xl shadow-xl border border-[#7B3F00]/20 dark:border-[#d4a373]/20 z-50 w-[260px]"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {BASIC_EMOJIS.map(emoji => (
                          <button key={emoji} onClick={() => addEmoji(emoji)} className="text-2xl hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10 p-2 rounded-xl transition-all hover:scale-110 active:scale-95">{emoji}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {audioPreview ? (
                  <div className="flex-1 min-w-0 flex items-center justify-between glass-input rounded-2xl p-2 mb-0.5 gap-2">
                    <button onClick={cancelRecording} className="p-2 shrink-0 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <audio controls src={audioPreview.url} className="h-10 min-w-0 w-full max-w-[200px]" />
                    <button onClick={sendAudioBinary} className="p-2.5 shrink-0 bg-[#C68E17] text-white rounded-full transition-colors shadow-md"><Send className="w-5 h-5" /></button>
                  </div>
                ) : isRecording ? (
                  <div className="flex-1 min-w-0 flex items-center justify-between glass-input rounded-2xl px-3 py-2 mb-0.5 border-red-400 gap-2">
                    <div className="flex items-center gap-1.5 text-red-500 font-bold animate-pulse text-sm truncate shrink">
                      <Mic className="w-5 h-5 shrink-0" /> <span className="truncate">Recording...</span>
                    </div>
                    <button onClick={stopRecording} className="p-2 shrink-0 bg-red-500 text-white rounded-full transition-colors shadow-md"><Square className="w-4 h-4 fill-current" /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2.5 shrink-0 rounded-full transition-colors mb-0.5 ${showEmojiPicker ? 'bg-[#7B3F00]/10 dark:bg-[#d4a373]/10 text-[#C68E17] dark:text-[#e5b342]' : 'text-[#7B3F00] dark:text-[#d4a373] hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10'}`}><Smile className="w-5 h-5" /></button>
                      <label className="cursor-pointer shrink-0 p-2.5 text-[#7B3F00] dark:text-[#d4a373] hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10 rounded-full transition-colors mb-0.5">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <ImageIcon className="w-5 h-5" />
                      </label>
                    </div>
                    <input type="text" value={inputText} onChange={onInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage('text', inputText)} onFocus={() => setShowEmojiPicker(false)}
                      placeholder="Message..." className="flex-1 min-w-0 glass-input rounded-2xl px-4 py-2.5 text-sm font-medium text-[#3C1F00] dark:text-white focus:outline-none mb-0.5" disabled={connState !== 'connected'}
                    />
                    {inputText ? (
                      <button onClick={() => sendMessage('text', inputText)} className="p-2.5 shrink-0 bg-[#C68E17] hover:bg-[#7B3F00] dark:bg-[#e5b342] text-white rounded-full transition-colors mb-0.5 shadow-md disabled:opacity-50" disabled={connState !== 'connected'}><Send className="w-5 h-5" /></button>
                    ) : (
                      <button onClick={startRecording} className="p-2.5 shrink-0 glass-button text-[#7B3F00] dark:text-[#d4a373] rounded-full transition-colors mb-0.5 shadow-sm disabled:opacity-50" disabled={connState !== 'connected'}><Mic className="w-5 h-5" /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-full max-h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-3 z-[70]">
                <button onClick={downloadImage} className="p-3 bg-white/10 hover:bg-[#C68E17] text-white rounded-full transition-all backdrop-blur-md shadow-lg" title="Download Image">
                  <Download className="w-6 h-6" />
                </button>
                <button onClick={() => setPreviewImage(null)} className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all backdrop-blur-md shadow-lg" title="Close Preview">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <motion.img
                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                src={previewImage} alt="Full Size Preview"
                className="max-w-[95vw] max-h-[85vh] md:max-w-[90vw] md:max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
