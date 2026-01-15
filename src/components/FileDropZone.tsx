import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Lock, Unlock, FileArchive, Files, Trash2 } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto-utils';
import { Button } from './ui/button';

interface FileDropZoneProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onClear: () => void;
  onRemoveFile?: (index: number) => void;
  mode: 'encrypt' | 'decrypt';
  multiple?: boolean;
}

export function FileDropZone({ 
  onFileSelect, 
  selectedFiles, 
  onClear, 
  onRemoveFile,
  mode, 
  multiple = true 
}: FileDropZoneProps) {
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
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(multiple ? files : [files[0]]);
    }
  }, [onFileSelect, multiple]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(multiple ? Array.from(files) : [files[0]]);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [onFileSelect, multiple]);

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const hasSkitaFiles = selectedFiles.some(f => f.name.endsWith('.skita'));
  const hasNonSkitaFiles = selectedFiles.some(f => !f.name.endsWith('.skita'));

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {selectedFiles.length > 0 ? (
          <motion.div
            key="files-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card-glow rounded-2xl p-6"
          >
            {/* Header with file count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Files className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} dipilih
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Total: {formatFileSize(totalSize)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Hapus Semua
              </Button>
            </div>

            {/* File list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {selectedFiles.map((file, index) => {
                const isSkita = file.name.endsWith('.skita');
                return (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {isSkita ? (
                        <FileArchive className="w-4 h-4 text-primary" />
                      ) : (
                        <File className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {onRemoveFile && (
                      <button
                        onClick={() => onRemoveFile(index)}
                        className="flex-shrink-0 w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Warnings */}
            {hasSkitaFiles && mode === 'encrypt' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-warning bg-warning/10 rounded-lg px-4 py-2"
              >
                ⚠️ Beberapa file .skita terdeteksi. Gunakan mode Dekripsi untuk membuka file tersebut.
              </motion.p>
            )}
            
            {hasNonSkitaFiles && mode === 'decrypt' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm text-warning bg-warning/10 rounded-lg px-4 py-2"
              >
                ⚠️ Beberapa file bukan .skita. Gunakan mode Enkripsi untuk mengamankan file tersebut.
              </motion.p>
            )}

            {/* Add more files button */}
            {multiple && (
              <label className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 cursor-pointer transition-colors">
                <input
                  type="file"
                  onChange={handleFileInput}
                  className="hidden"
                  accept={mode === 'decrypt' ? '.skita' : '*'}
                  multiple={multiple}
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tambah file lagi</span>
              </label>
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
              multiple={multiple}
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
              {multiple && ' - bisa pilih banyak sekaligus'}
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Max 2GB per file
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5">
                <Files className="w-3.5 h-3.5" />
                Batch support
              </span>
              <span className="w-px h-3 bg-border" />
              <span>100% Lokal</span>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}
