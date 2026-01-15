import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';

interface ModeToggleProps {
  mode: 'encrypt' | 'decrypt';
  onChange: (mode: 'encrypt' | 'decrypt') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-muted">
      <button
        onClick={() => onChange('encrypt')}
        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          mode === 'encrypt' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {mode === 'encrypt' && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 rounded-lg bg-primary shadow-glow"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Lock className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Enkripsi</span>
      </button>
      
      <button
        onClick={() => onChange('decrypt')}
        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          mode === 'decrypt' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {mode === 'decrypt' && (
          <motion.div
            layoutId="mode-toggle-bg"
            className="absolute inset-0 rounded-lg bg-primary shadow-glow"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Unlock className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Dekripsi</span>
      </button>
    </div>
  );
}
