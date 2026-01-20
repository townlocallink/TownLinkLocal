
import React, { useEffect, useState } from 'react';

const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number }[]>([]);

  useEffect(() => {
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#ffffff'];
    const newParticles = Array.from({ length: 150 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 15 + 5;
      return {
        id: i,
        x: 50, // center x %
        y: 50, // center y %
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
      };
    });
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `burst-${p.id} 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
            opacity: 0.8,
            boxShadow: '0 0 10px rgba(255,255,255,0.5)'
          }}
        />
      ))}
      <style>{`
        ${particles.map(p => `
          @keyframes burst-${p.id} {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate(${p.vx * 10}vw, ${p.vy * 10}vh) rotate(${Math.random() * 1000}deg); opacity: 0; }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
};

export default Confetti;
