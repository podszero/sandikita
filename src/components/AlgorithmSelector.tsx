import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Info } from 'lucide-react';
import type { Algorithm } from '@/lib/crypto-utils';

interface AlgorithmSelectorProps {
  value: Algorithm;
  onChange: (value: Algorithm) => void;
}

const algorithms: { id: Algorithm; name: string; description: string; icon: React.ReactNode; badge?: string }[] = [
  {
    id: 'AES-GCM',
    name: 'AES-256-GCM',
    description: 'Standar industri, hardware-accelerated',
    icon: <Shield className="w-5 h-5" />,
    badge: 'Recommended',
  },
  {
    id: 'ChaCha20-Poly1305',
    name: 'ChaCha20-Poly1305',
    description: 'Modern, excellent for mobile',
    icon: <Zap className="w-5 h-5" />,
    badge: 'Coming Soon',
  },
];

export function AlgorithmSelector({ value, onChange }: AlgorithmSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        Algoritma Enkripsi
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs cursor-help" title="Pilih algoritma enkripsi yang akan digunakan">
          <Info className="w-3 h-3" />
        </span>
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {algorithms.map((algo) => {
          const isSelected = value === algo.id;
          const isDisabled = algo.id === 'ChaCha20-Poly1305'; // Coming soon
          
          return (
            <button
              key={algo.id}
              type="button"
              onClick={() => !isDisabled && onChange(algo.id)}
              disabled={isDisabled}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-glow'
                  : isDisabled
                  ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="algorithm-selected"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Badge */}
              {algo.badge && (
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  algo.badge === 'Recommended'
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {algo.badge}
                </span>
              )}
              
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${
                isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {algo.icon}
              </div>
              
              <h3 className={`font-medium font-mono text-sm mb-1 ${
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {algo.name}
              </h3>
              
              <p className="text-xs text-muted-foreground">
                {algo.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
