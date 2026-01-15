import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  stage: string;
  mode: 'encrypt' | 'decrypt';
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
}

export function ProgressIndicator({ progress, stage, mode, status, error }: ProgressIndicatorProps) {
  const Icon = mode === 'encrypt' ? Lock : Unlock;
  
  return (
    <div className="card-glow rounded-2xl p-8">
      <div className="text-center space-y-6">
        {/* Icon */}
        <div className="relative inline-flex">
          <motion.div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              status === 'success'
                ? 'bg-success/20'
                : status === 'error'
                ? 'bg-destructive/20'
                : 'bg-primary/20'
            }`}
            animate={status === 'processing' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {status === 'processing' ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle className="w-10 h-10 text-success" />
            ) : status === 'error' ? (
              <AlertCircle className="w-10 h-10 text-destructive" />
            ) : (
              <Icon className="w-10 h-10 text-primary" />
            )}
          </motion.div>
          
          {/* Progress ring */}
          {status === 'processing' && (
            <svg className="absolute inset-0 w-20 h-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={226}
                initial={{ strokeDashoffset: 226 }}
                animate={{ strokeDashoffset: 226 - (226 * progress) / 100 }}
                transition={{ duration: 0.3 }}
              />
            </svg>
          )}
        </div>
        
        {/* Status text */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {status === 'success'
              ? mode === 'encrypt'
                ? 'Enkripsi Berhasil!'
                : 'Dekripsi Berhasil!'
              : status === 'error'
              ? 'Gagal'
              : mode === 'encrypt'
              ? 'Mengenkripsi...'
              : 'Mendekripsi...'}
          </h3>
          
          {status === 'processing' && (
            <p className="text-sm text-muted-foreground">
              {stage}
            </p>
          )}
          
          {status === 'error' && error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        
        {/* Progress bar */}
        {status === 'processing' && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-glow-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  boxShadow: '0 0 20px hsl(var(--primary) / 0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
