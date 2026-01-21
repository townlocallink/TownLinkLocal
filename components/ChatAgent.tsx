
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile, ChatMessage, ProductRequest } from '../types';
import { getAgentResponse, parseAgentSummary, SYSTEM_INSTRUCTION } from '../geminiService';

// --- Audio Encoding & Decoding Helpers ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface ChatAgentProps {
  user: UserProfile;
  onClose: () => void;
  onFinalized: (request: ProductRequest) => void;
}

const ChatAgent: React.FC<ChatAgentProps> = ({ user, onClose, onFinalized }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: `Namaste ${user.name}! I'm LocalLink Sahayak. Aapko market se kya chahiye?` }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => console.warn("Location permission denied")
      );
    }
  }, []);

  const stopLiveSession = useCallback(() => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch (e) {}
      liveSessionRef.current = null;
    }
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch (e) {}
    }
    sourcesRef.current.clear();
    setIsLiveActive(false);
    if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
  }, []);

  const completeFinalization = (finalizedData: any) => {
    const newRequest: ProductRequest = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: user.id,
      customerName: user.name,
      pinCode: user.pinCode,
      city: user.city,
      locality: user.locality,
      category: finalizedData.category || 'General',
      description: finalizedData.summary,
      status: 'broadcasted',
      createdAt: Date.now(),
      image: image || undefined
    };
    
    setMessages(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: `✅ Thik hai! Maine aapka order "${newRequest.category}" category mein shops ko bhej diya hai.` }] 
    }]);
    
    setTimeout(() => {
      stopLiveSession();
      onFinalized(newRequest);
    }, 1500);
  };

  const startLiveSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inCtx;
      outputAudioCtxRef.current = outCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLiveActive(true);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioCtxRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              const finalized = parseAgentSummary(text);
              if (finalized?.finalized) completeFinalization(finalized);
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => { 
            console.error("Live session error:", e);
            stopLiveSession(); 
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: SYSTEM_INSTRUCTION,
          outputAudioTranscription: {}
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      console.error("Live Audio Error:", e);
      setIsLiveActive(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !image) return;
    const userParts: ChatMessage['parts'] = [];
    if (input.trim()) userParts.push({ text: input });
    if (image) {
      const base64Data = image.split(',')[1];
      if (base64Data) userParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
    }

    const newMessages: ChatMessage[] = [...messages, { role: 'user', parts: userParts }];
    setMessages(newMessages);
    setInput('');
    setImage(null);
    setIsLoading(true);

    const result = await getAgentResponse(newMessages, location);
    setIsLoading(false);

    const finalizedData = parseAgentSummary(result.text);
    if (finalizedData && finalizedData.finalized) {
      completeFinalization(finalizedData);
    } else {
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: result.text }],
        groundingChunks: result.groundingChunks 
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white shadow-lg ${isLiveActive ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
            <span className="text-2xl">{isLiveActive ? '🎙️' : '🤖'}</span>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight tracking-tight">Sahayak Assistant</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {isLiveActive ? 'Voice Conversation Active' : 'Hyperlocal Shopping Expert'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-black/10 p-2 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-[20px] p-4 shadow-sm border transition-all ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-500' 
                : 'bg-white text-gray-800 rounded-tl-none border-gray-100'
            }`}>
              {m.parts.map((p, pi) => (
                <div key={pi}>
                  {p.text && <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{p.text}</p>}
                  {p.inlineData && (
                    <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="mt-3 rounded-xl max-h-56 w-full object-cover shadow-sm" alt="Reference" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border border-gray-100 rounded-[20px] rounded-tl-none p-4 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-3 items-center">
          <div className="flex gap-2">
            <label className="bg-gray-100 hover:bg-gray-200 w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-colors active:scale-95 text-xl">
              📷
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader();
                  r.onload = (ev) => setImage(ev.target?.result as string);
                  r.readAsDataURL(file);
                }
              }} />
            </label>
            <button 
              onClick={isLiveActive ? stopLiveSession : startLiveSession}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all active:scale-95 text-xl shadow-md ${isLiveActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
            >
              {isLiveActive ? '🛑' : '🎙️'}
            </button>
          </div>
          
          <div className="flex-1 relative">
            <input 
              className="w-full h-12 bg-gray-50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-xl px-5 py-2 transition-all outline-none text-sm font-medium shadow-inner"
              placeholder={isLiveActive ? "Sahayak is listening..." : "Message Sahayak..."}
              value={input}
              disabled={isLiveActive}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            {!isLiveActive && (
              <button 
                disabled={isLoading || (!input.trim() && !image)}
                onClick={handleSend}
                className="absolute right-1.5 top-1.5 h-9 w-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-20 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        </div>
        {image && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
            <img src={image} className="w-10 h-10 rounded border object-cover" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Image attached</span>
            <button onClick={() => setImage(null)} className="ml-auto text-indigo-400 p-1 hover:text-red-500">✕</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatAgent;
