
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile, ChatMessage, ProductRequest } from '../types';
import { getAgentResponse, parseAgentSummary, SYSTEM_INSTRUCTION } from '../geminiService';

// --- Audio Encoding & Decoding Helpers (Manually Implemented) ---
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

// Fixed missing React namespace by importing React
const ChatAgent: React.FC<ChatAgentProps> = ({ user, onClose, onFinalized }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: `Namaste ${user.name}! I'm LocalLink Sahayak. Aapko market se kya chahiye?` }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => console.warn("Location permission denied")
      );
    }
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setNeedsApiKey(false);
        // We proceed assuming the key selection was successful
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

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
      parts: [{ text: `✅ Samjha! Maine aapka order "${newRequest.category}" category mein shops ko bhej diya hai.` }] 
    }]);
    
    setTimeout(() => {
      stopLiveSession();
      onFinalized(newRequest);
    }, 1500);
  };

  const startLiveSession = async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === "undefined") {
        setNeedsApiKey(true);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
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
              if (finalized?.finalized) {
                completeFinalization(finalized);
              }
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => { 
            console.error("Live session error:", e);
            if (e?.message?.includes("entity was not found") || e?.message?.includes("key")) {
              setNeedsApiKey(true);
            }
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

    if (result.text === "AI_KEY_MISSING" || result.text === "AI_KEY_INVALID") {
      setNeedsApiKey(true);
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: "Bhai, AI brain connect nahi ho raha. Neeche diye button se AI key select kijiye." }] 
      }]);
      return;
    }

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
    <>
      <div className="bg-indigo-700 p-5 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isLiveActive ? 'bg-white text-red-500 scale-110 shadow-xl' : 'bg-white/20 text-white'}`}>
            {isLiveActive ? <span className="animate-pulse">🎙️</span> : '🤖'}
          </div>
          <div>
            <h3 className="font-black text-lg">LocalLink Sahayak</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
              {isLiveActive ? 'Voice Mode Active' : 'AI Shopping Assistant'}
            </p>
          </div>
        </div>
        <button onClick={() => { stopLiveSession(); onClose(); }} className="hover:bg-indigo-800 p-2 rounded-full transition">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-[24px] p-5 shadow-sm border ${
              m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-500' : 'bg-white text-gray-800 rounded-tl-none border-gray-100'
            }`}>
              {m.parts.map((p, pi) => (
                <div key={pi}>
                  {p.text && <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{p.text}</p>}
                  {p.inlineData && (
                    <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="mt-3 rounded-2xl max-h-56 w-full object-cover" alt="Context" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {needsApiKey && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] text-center space-y-4 shadow-xl animate-bounce-in">
            <span className="text-3xl block">🔑</span>
            <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest leading-tight">AI Connection Required</h4>
            <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
              To use Sahayak, you need to connect your own AI key. 
              <br/><span className="italic">(Free keys from ai.google.dev work too!)</span>
            </p>
            <button 
              onClick={handleOpenKeySelector}
              className="w-full bg-amber-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-600 transition"
            >
              Connect My AI Brain
            </button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-[9px] font-black text-amber-400 uppercase tracking-widest underline">Billing Docs</a>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border border-gray-100 rounded-[24px] rounded-tl-none p-4 flex gap-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-white border-t-2 border-gray-100">
        <div className="flex gap-3">
          <label className="bg-gray-100 hover:bg-gray-200 w-14 h-14 flex items-center justify-center rounded-2xl cursor-pointer transition active:scale-95 text-xl">
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
            className={`w-14 h-14 flex items-center justify-center rounded-2xl transition active:scale-95 text-xl shadow-lg ${isLiveActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isLiveActive ? '🛑' : '🎙️'}
          </button>
          <div className="flex-1 relative">
            <input 
              className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl px-5 py-2 transition outline-none text-sm font-medium shadow-inner"
              placeholder={isLiveActive ? "Listening..." : "Tell me what you need..."}
              value={input}
              disabled={isLiveActive}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            {!isLiveActive && (
              <button 
                disabled={isLoading || (!input.trim() && !image)}
                onClick={handleSend}
                className="absolute right-2 top-2 h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-30 shadow-lg"
              >
                ➤
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatAgent;
