import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto-utils';
import { FileTypeIcon } from './FileTypeIcon';
export interface FileProgress {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  stage: string;
  error?: string;
  resultFilename?: string;
  resultSize?: number;
  verified?: boolean;
  hash?: string;
}

interface BatchProgressIndicatorProps {
  files: FileProgress[];
  mode: 'encrypt' | 'decrypt';
  currentIndex: number;
  overallProgress: number;
}

export function BatchProgressIndicator({ 
  files, 
  mode, 
  currentIndex,
  overallProgress 
}: BatchProgressIndicatorProps) {
  const Icon = mode === 'encrypt' ? Lock : Unlock;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const isComplete = files.every(f => f.status === 'success' || f.status === 'error');
  
  return (
    <div className="space-y-6">
      {/* Overall progress card */}
      <div className="card-glow rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isComplete
              ? errorCount > 0 
                ? 'bg-warning/20'
                : 'bg-success/20'
              : 'bg-primary/20'
          }`}>
            {isComplete ? (
              errorCount > 0 ? (
                <AlertCircle className="w-7 h-7 text-warning" />
              ) : (
                <CheckCircle className="w-7 h-7 text-success" />
              )
            ) : (
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-foreground">
              {isComplete 
                ? `${mode === 'encrypt' ? 'Enkripsi' : 'Dekripsi'} Selesai`
                : `${mode === 'encrypt' ? 'Mengenkripsi' : 'Mendekripsi'}...`
              }
            </h3>
            <p className="text-sm text-muted-foreground">
              {successCount} berhasil{errorCount > 0 ? `, ${errorCount} gagal` : ''} dari {files.length} file
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress keseluruhan</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-glow-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.3 }}
              style={{
                boxShadow: '0 0 20px hsl(var(--primary) / 0.5)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Individual file progress */}
      <div className="card-glow rounded-2xl p-4 max-h-80 overflow-y-auto">
        <div className="space-y-3">
          {files.map((fileProgress, index) => {
            return (
              <motion.div
                key={`${fileProgress.file.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border transition-colors ${
                  fileProgress.status === 'processing'
                    ? 'border-primary/50 bg-primary/5'
                    : fileProgress.status === 'success'
                    ? 'border-success/30 bg-success/5'
                    : fileProgress.status === 'error'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-muted bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    fileProgress.status === 'processing'
                      ? 'bg-primary/20'
                      : fileProgress.status === 'success'
                      ? 'bg-success/20'
                      : fileProgress.status === 'error'
                      ? 'bg-destructive/20'
                      : 'bg-muted'
                  }`}>
                    {fileProgress.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : fileProgress.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : fileProgress.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <FileTypeIcon filename={fileProgress.file.name} className="w-4 h-4" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {fileProgress.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fileProgress.status === 'processing' && fileProgress.stage}
                      {fileProgress.status === 'success' && (
                        <span className="flex items-center gap-2">
                          <span>{formatFileSize(fileProgress.resultSize || fileProgress.file.size)}</span>
                          {fileProgress.verified && (
                            <span className="flex items-center gap-1 text-success">
                              <Shield className="w-3 h-3" />
                              Terverifikasi
                            </span>
                          )}
                        </span>
                      )}
                      {fileProgress.status === 'error' && (
                        <span className="text-destructive">{fileProgress.error}</span>
                      )}
                      {fileProgress.status === 'pending' && 'Menunggu...'}
                    </p>
                  </div>

                  {/* Progress percentage */}
                  {fileProgress.status === 'processing' && (
                    <span className="text-xs font-mono text-primary">
                      {Math.round(fileProgress.progress)}%
                    </span>
                  )}
                </div>

                {/* Individual progress bar */}
                {fileProgress.status === 'processing' && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${fileProgress.progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                {/* Hash display for successful encryption/decryption */}
                {fileProgress.status === 'success' && fileProgress.hash && (
                  <div className="mt-2 p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                      SHA-256: <span className="font-mono text-foreground/70 break-all">{fileProgress.hash}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
