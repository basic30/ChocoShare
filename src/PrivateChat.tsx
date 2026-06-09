import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { X, Send, Image as ImageIcon, Mic, Square, Loader2, MessageSquare, Lock, Trash2, Smile } from 'lucide-react';
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<{ blob: Blob, url: string } | null>(null);

  // WebRTC & Socket Refs
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkBufferRef = useRef<Record<string, string[]>>({});

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping, audioPreview]);

  // Total cleanup on close (Zero Data Storage)
  useEffect(() => {
    return () => {
      if (dcRef.current) dcRef.current.close();
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
      if (audioPreview) URL.revokeObjectURL(audioPreview.url);
    };
  }, [audioPreview]);

  const getIceServers = async () => {
    try {
      const res = await fetch('https://chocoshare-turn-auth.snahasishdey141.workers.dev/');
      const data = await res.json();
      return [{ urls: "stun:stun.l.google.com:19302" }, ...data.iceServers];
    } catch {
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStatus('');
      setView('chat');
    };

    channel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle Chunking Protocol for large files
      if (data.type === 'chunk') {
        if (!chunkBufferRef.current[data.id]) {
          chunkBufferRef.current[data.id] = new Array(data.total);
        }
        chunkBufferRef.current[data.id][data.index] = data.chunk;
        
        // Check if message is complete
        if (chunkBufferRef.current[data.id].filter(Boolean).length === data.total) {
          const fullString = chunkBufferRef.current[data.id].join('');
          const parsedMsg = JSON.parse(fullString);
          setMessages(prev => [...prev, { ...parsedMsg, sender: 'partner', timestamp: new Date() }]);
          setPartnerTyping(false);
          delete chunkBufferRef.current[data.id];
        }
        return;
      }

      // Standard Messages
      if (data.type === 'typing') {
        setPartnerTyping(data.status);
      } else {
        setMessages(prev => [...prev, { ...data, sender: 'partner', timestamp: new Date() }]);
        setPartnerTyping(false);
      }
    };

    channel.onclose = () => {
      setStatus('Partner disconnected.');
      setPartnerTyping(false);
    };
    
    dcRef.current = channel;
  };

  const handleCreateRoom = async () => {
    setStatus('Generating secure room...');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code);

    const socket = io('https://chocoshare-chocoshare-signaling.hf.space');
    socketRef.current = socket;

    socket.emit('create-room', code);

    socket.on('peer-joined', async () => {
      setStatus('Partner joined! Securing P2P connection...');
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      const dc = pc.createDataChannel('secure_chat');
      setupDataChannel(dc);

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { roomId: code, signal: { type: 'candidate', candidate: e.candidate } });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { roomId: code, signal: { type: 'offer', sdp: offer } });
    });

    let candidateQueue: RTCIceCandidateInit[] = [];
    socket.on('signal', async (signal) => {
      if (signal.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const c of candidateQueue) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
        }
        candidateQueue = [];
      } else if (signal.type === 'candidate' && pcRef.current) {
        if (pcRef.current.remoteDescription) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) {}
        } else {
          candidateQueue.push(signal.candidate);
        }
      }
    });
  };

  const handleJoinRoom = async () => {
    if (joinId.length !== 6) return;
    setStatus('Connecting to room...');

    const socket = io('https://chocoshare-chocoshare-signaling.hf.space');
    socketRef.current = socket;

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.ondatachannel = (e) => setupDataChannel(e.channel);

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('signal', { roomId: joinId, signal: { type: 'candidate', candidate: e.candidate } });
    };

    socket.emit('join-room', joinId);

    let candidateQueue: RTCIceCandidateInit[] = [];
    socket.on('signal', async (signal) => {
      if (signal.type === 'offer') {
        setStatus('Securing P2P connection...');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const c of candidateQueue) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
        }
        candidateQueue = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { roomId: joinId, signal: { type: 'answer', sdp: answer } });
      } else if (signal.type === 'candidate') {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) {}
        } else {
          candidateQueue.push(signal.candidate);
        }
      }
    });
  };

  // Advanced Sending Logic with Chunking to prevent WebRTC crashes
  const sendMessage = (type: 'text' | 'image' | 'audio', content: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open' || !content) return;

    const msgObj = { id: Math.random().toString(36).substr(2, 9), type, content };
    const msgString = JSON.stringify(msgObj);
    
    // Chunking logic for large Base64 strings (Images/Audio)
    const CHUNK_SIZE = 16384; // 16KB per chunk
    const totalChunks = Math.ceil(msgString.length / CHUNK_SIZE);

    if (totalChunks > 1) {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = msgString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        dcRef.current.send(JSON.stringify({ 
          type: 'chunk', id: msgObj.id, chunk, index: i, total: totalChunks 
        }));
      }
    } else {
      dcRef.current.send(msgString);
    }

    setMessages(prev => [...prev, { ...msgObj, sender: 'me', timestamp: new Date() }]);
    setInputText('');
    setShowEmojiPicker(false);
    handleTyping(false);
  };

  const handleTyping = (status: boolean) => {
    setIsTyping(status);
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify({ type: 'typing', status }));
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping) handleTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500);
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    if (!isTyping) handleTyping(true);
  };

  // Image Compression logic before sending
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width; width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height; height = MAX_HEIGHT;
        }

        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG format to save huge amounts of WebRTC data
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        sendMessage('image', compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioPreview({ blob: audioBlob, url });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview.url);
    setAudioPreview(null);
  };

  const sendAudio = () => {
    if (!audioPreview) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage('audio', reader.result as string);
      cancelRecording();
    };
    reader.readAsDataURL(audioPreview.blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3C1F00]/40 dark:bg-black/60 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
        className="w-full max-w-md h-[85vh] glass-card-strong rounded-3xl flex flex-col overflow-hidden relative border border-[#7B3F00]/20 dark:border-[#d4a373]/20 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#C68E17] to-[#7B3F00] dark:from-[#e5b342] dark:to-[#c28415] text-white shadow-md z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 opacity-80" />
            <h2 className="font-display font-bold text-lg">Secure Chat</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOBBY VIEW */}
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
                  className="w-full sm:flex-1 glass-input rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-[#3C1F00] dark:text-white focus:outline-none min-w-0" 
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
          
          /* CHAT VIEW */
          <div className="flex-1 flex flex-col bg-[#FFFDD0]/30 dark:bg-[#120601]/30 overflow-hidden relative">
            <div className="text-center py-2 bg-[#7B3F00]/5 dark:bg-[#d4a373]/5 border-b border-[#7B3F00]/10 dark:border-[#d4a373]/10">
               <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3"/> End-to-End Encrypted</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onClick={() => setShowEmojiPicker(false)}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.sender === 'me' ? 'bg-[#7B3F00] dark:bg-[#d4a373] text-white dark:text-[#120601] rounded-br-sm' : 'glass-card text-[#3C1F00] dark:text-white rounded-bl-sm'}`}>
                    {msg.type === 'text' && <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                    {msg.type === 'image' && <img src={msg.content} alt="shared" className="rounded-lg max-h-48 object-contain mb-1" />}
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

            {/* Input Bar */}
            <div className="p-3 glass-card border-t border-[#7B3F00]/10 dark:border-[#d4a373]/10 flex items-end gap-2 shrink-0 relative">
              
              {/* Emoji Picker Popup */}
              <AnimatePresence>
                {showEmojiPicker && !audioPreview && !isRecording && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 mb-2 p-3 glass-card-strong rounded-2xl shadow-xl border border-[#7B3F00]/20 dark:border-[#d4a373]/20 z-50 w-[260px]"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {BASIC_EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => addEmoji(emoji)}
                          className="text-2xl hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10 p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conditional rendering for Audio Review vs Text Input */}
              {audioPreview ? (
                <div className="flex-1 flex items-center justify-between glass-input rounded-2xl p-2 mb-0.5">
                  <button onClick={cancelRecording} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <audio controls src={audioPreview.url} className="h-10 max-w-[200px]" />
                  <button onClick={sendAudio} className="p-2.5 bg-[#C68E17] text-white rounded-full transition-colors shadow-md">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : isRecording ? (
                <div className="flex-1 flex items-center justify-between glass-input rounded-2xl px-4 py-2 mb-0.5 border-red-400">
                  <div className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                    <Mic className="w-5 h-5" /> Recording...
                  </div>
                  <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full transition-colors shadow-md">
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2.5 rounded-full transition-colors mb-0.5 ${showEmojiPicker ? 'bg-[#7B3F00]/10 dark:bg-[#d4a373]/10 text-[#C68E17] dark:text-[#e5b342]' : 'text-[#7B3F00] dark:text-[#d4a373] hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10'}`}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    <label className="cursor-pointer p-2.5 text-[#7B3F00] dark:text-[#d4a373] hover:bg-[#7B3F00]/10 dark:hover:bg-[#d4a373]/10 rounded-full transition-colors mb-0.5">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <ImageIcon className="w-5 h-5" />
                    </label>
                  </div>

                  <input type="text" value={inputText} onChange={onInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage('text', inputText)}
                    onFocus={() => setShowEmojiPicker(false)}
                    placeholder="Message..."
                    className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-sm font-medium text-[#3C1F00] dark:text-white focus:outline-none mb-0.5"
                  />

                  {inputText ? (
                    <button onClick={() => sendMessage('text', inputText)} className="p-2.5 bg-[#C68E17] hover:bg-[#7B3F00] dark:bg-[#e5b342] dark:hover:bg-[#c28415] text-white dark:text-[#120601] rounded-full transition-colors mb-0.5 shadow-md">
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={startRecording} className="p-2.5 glass-button text-[#7B3F00] dark:text-[#d4a373] rounded-full transition-colors mb-0.5 shadow-sm">
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}