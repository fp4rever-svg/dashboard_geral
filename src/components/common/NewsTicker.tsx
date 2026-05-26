import React from 'react';
import { motion } from 'motion/react';

interface NewsTickerProps {
  messages: string[];
}

export function NewsTicker({ messages }: NewsTickerProps) {
  return (
    <div className="w-full bg-slate-900 text-white py-2 px-4 rounded-xl overflow-hidden flex items-center">
      <div className="mr-4 font-black text-blue-400 text-sm whitespace-nowrap uppercase tracking-widest">
        Destaques
      </div>
      <div className="relative w-full overflow-hidden h-6">
        <motion.div
          className="absolute whitespace-nowrap flex gap-12"
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 80, ease: 'linear', repeat: Infinity }}
        >
          {messages.map((message, i) => (
            <span key={i} className="text-sm font-medium">
              {message}
            </span>
          ))}
          {/* Duplicate to ensure seamless looping */}
          {messages.map((message, i) => (
            <span key={`duplicate-${i}`} className="text-sm font-medium">
              {message}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
