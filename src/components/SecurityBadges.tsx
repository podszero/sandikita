import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Wifi, WifiOff, HardDrive, Lock, Eye, EyeOff } from 'lucide-react';

const badges = [
  {
    icon: WifiOff,
    label: 'Zero Upload',
    description: 'Semua proses di perangkat Anda',
  },
  {
    icon: Lock,
    label: 'AES-256-GCM',
    description: 'Enkripsi kelas militer',
  },
  {
    icon: Shield,
    label: 'Argon2id KDF',
    description: 'Derivasi kunci aman',
  },
  {
    icon: EyeOff,
    label: 'Zero Knowledge',
    description: 'Kami tidak bisa akses file Anda',
  },
];

export function SecurityBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <badge.icon className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {badge.label}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {badge.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
