
import React, { useState, useRef, useEffect } from 'react';
import { DirectMessage, UserProfile, ShopProfile } from '../types';

interface DirectChatProps {
  currentUser: UserProfile | ShopProfile;
  otherPartyName: string;
  history: DirectMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

const DirectChat: React.FC<DirectChatProps> = ({ currentUser, otherPartyName, history, onSendMessage, onClose }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100">
      <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
        <div>
          <h3 className="font-black tracking-tight text-lg">{otherPartyName}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Direct Connection</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-[10px] font-black uppercase tracking-tighter">Start the conversation</p>
          </div>
        ) : (
          history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium ${
                msg.senderId === currentUser.id 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100' 
                  : 'bg-white text-gray-800 border rounded-tl-none shadow-sm'
              }`}>
                {msg.text}
                <div className={`text-[8px] mt-1 font-bold ${msg.senderId === currentUser.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-xl px-4 py-2 transition outline-none text-sm"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="bg-indigo-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">
             ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectChat;
