import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Lock, Unlock, FileArchive } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto-utils';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  mode: 'encrypt' | 'decrypt';
}

export function FileDropZone({ onFileSelect, selectedFile, onClear, mode }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const isSkitaFile = selectedFile?.name.endsWith('.skita');

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card-glow rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                {isSkitaFile ? (
                  <FileArchive className="w-7 h-7 text-primary animate-lock-pulse" />
                ) : (
                  <File className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={onClear}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted hover:bg-destructive/20 transition-colors flex items-center justify-center group"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
              </button>
            </div>
            
            {isSkitaFile && mode === 'encrypt' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-warning bg-warning/10 rounded-lg px-4 py-2"
              >
                ⚠️ File .skita terdeteksi. Gunakan mode Dekripsi untuk membuka file ini.
              </motion.p>
            )}
            
            {!isSkitaFile && mode === 'decrypt' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-warning bg-warning/10 rounded-lg px-4 py-2"
              >
                ⚠️ Bukan file .skita. Gunakan mode Enkripsi untuk mengamankan file ini.
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.label
            key="drop-zone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`drop-zone cursor-pointer block p-12 text-center transition-all duration-300 ${
              isDragging ? 'active' : ''
            }`}
          >
            <input
              type="file"
              onChange={handleFileInput}
              className="hidden"
              accept={mode === 'decrypt' ? '.skita' : '*'}
            />
            
            <motion.div
              animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6"
            >
              {mode === 'encrypt' ? (
                <Lock className="w-10 h-10 text-primary animate-lock-pulse" />
              ) : (
                <Unlock className="w-10 h-10 text-primary animate-lock-pulse" />
              )}
            </motion.div>
            
            <p className="text-lg font-medium text-foreground mb-2">
              {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file di sini'}
            </p>
            <p className="text-muted-foreground text-sm">
              atau <span className="text-primary hover:underline">pilih file</span>
              {mode === 'decrypt' && ' (*.skita)'}
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Max 2GB
              </span>
              <span className="w-px h-3 bg-border" />
              <span>AES-256-GCM</span>
              <span className="w-px h-3 bg-border" />
              <span>100% Lokal</span>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}
