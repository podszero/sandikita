import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Wand2, Copy, Check } from 'lucide-react';
import { checkPasswordStrength, generatePassphrase } from '@/lib/crypto-utils';
import { Button } from '@/components/ui/button';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  placeholder?: string;
  label?: string;
}

export function PasswordInput({ 
  value, 
  onChange, 
  showStrength = true,
  placeholder = 'Masukkan password atau passphrase...',
  label = 'Password'
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const strength = useMemo(() => checkPasswordStrength(value), [value]);

  const handleGeneratePassphrase = () => {
    const passphrase = generatePassphrase(4);
    onChange(passphrase);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrengthColor = (score: number) => {
    if (score < 30) return 'bg-destructive';
    if (score < 50) return 'bg-warning';
    if (score < 70) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthTextColor = (score: number) => {
    if (score < 30) return 'text-destructive';
    if (score < 50) return 'text-warning';
    if (score < 70) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 px-4 pr-28 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Copy password"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleGeneratePassphrase}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Generate passphrase"
          >
            <Wand2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Strength meter */}
      <AnimatePresence>
        {showStrength && value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${strength.score}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${getStrengthColor(strength.score)}`}
              />
            </div>
            
            {/* Label and suggestions */}
            <div className="flex items-start justify-between gap-4">
              <span className={`text-xs font-medium ${getStrengthTextColor(strength.score)}`}>
                {strength.label}
              </span>
              {strength.suggestions.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {strength.suggestions[0]}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
