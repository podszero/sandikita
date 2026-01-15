import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Download, Info, Package } from 'lucide-react';
import { FileDropZone } from '@/components/FileDropZone';
import { PasswordInput } from '@/components/PasswordInput';
import { AlgorithmSelector } from '@/components/AlgorithmSelector';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { BatchProgressIndicator, type FileProgress } from '@/components/BatchProgressIndicator';
import { SecurityBadges } from '@/components/SecurityBadges';
import { ModeToggle } from '@/components/ModeToggle';
import { Button } from '@/components/ui/button';
import { 
  encryptFile, 
  decryptFile,
  type EncryptResult,
  type DecryptResult,
} from '@/lib/crypto-worker';
import { formatFileSize, estimateTime, type Algorithm } from '@/lib/crypto-utils';

type Status = 'idle' | 'processing' | 'success' | 'error';

interface ProcessedFile {
  blob: Blob;
  filename: string;
  verified?: boolean;
  hash?: string;
}

const Index = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-GCM');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | undefined>();
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  
  // Batch progress state
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
    setStatus('idle');
    setError(undefined);
    
    // Auto-detect mode if first file
    if (selectedFiles.length === 0 && files.length > 0) {
      const hasSkitaFiles = files.some(f => f.name.endsWith('.skita'));
      if (hasSkitaFiles) {
        setMode('decrypt');
      }
    }
  }, [selectedFiles.length]);

  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setStatus('idle');
    setError(undefined);
    setProcessedFiles([]);
    setFileProgresses([]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = async () => {
    if (selectedFiles.length === 0 || !password) return;

    setStatus('processing');
    setError(undefined);
    setProcessedFiles([]);
    
    // Initialize file progresses
    const initialProgresses: FileProgress[] = selectedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      stage: '',
    }));
    setFileProgresses(initialProgresses);
    setCurrentFileIndex(0);
    setOverallProgress(0);

    const results: ProcessedFile[] = [];
    let hasError = false;

    for (let i = 0; i < selectedFiles.length; i++) {
      setCurrentFileIndex(i);
      
      // Update current file to processing
      setFileProgresses(prev => prev.map((fp, idx) => 
        idx === i ? { ...fp, status: 'processing' } : fp
      ));

      try {
        if (mode === 'encrypt') {
          const result = await encryptFile({
            file: selectedFiles[i],
            password,
            algorithm,
            onProgress: (p, s) => {
              setFileProgresses(prev => prev.map((fp, idx) => 
                idx === i ? { ...fp, progress: p, stage: s } : fp
              ));
              // Calculate overall progress
              const completedProgress = (i / selectedFiles.length) * 100;
              const currentProgress = (p / 100) * (100 / selectedFiles.length);
              setOverallProgress(completedProgress + currentProgress);
            },
          });
          
          results.push({
            blob: result.blob,
            filename: result.filename,
            hash: result.originalHash,
          });
          
          setFileProgresses(prev => prev.map((fp, idx) => 
            idx === i ? { 
              ...fp, 
              status: 'success', 
              progress: 100,
              resultFilename: result.filename,
              resultSize: result.blob.size,
              hash: result.originalHash,
            } : fp
          ));
        } else {
          const result = await decryptFile({
            file: selectedFiles[i],
            password,
            onProgress: (p, s) => {
              setFileProgresses(prev => prev.map((fp, idx) => 
                idx === i ? { ...fp, progress: p, stage: s } : fp
              ));
              const completedProgress = (i / selectedFiles.length) * 100;
              const currentProgress = (p / 100) * (100 / selectedFiles.length);
              setOverallProgress(completedProgress + currentProgress);
            },
          });
          
          results.push({
            blob: result.blob,
            filename: result.filename,
            verified: result.verified,
            hash: result.decryptedHash,
          });
          
          setFileProgresses(prev => prev.map((fp, idx) => 
            idx === i ? { 
              ...fp, 
              status: 'success', 
              progress: 100,
              resultFilename: result.filename,
              resultSize: result.blob.size,
              verified: result.verified,
              hash: result.decryptedHash,
            } : fp
          ));
        }
      } catch (err) {
        hasError = true;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        setFileProgresses(prev => prev.map((fp, idx) => 
          idx === i ? { 
            ...fp, 
            status: 'error', 
            error: errorMessage,
          } : fp
        ));
      }
    }

    setOverallProgress(100);
    setProcessedFiles(results);
    setStatus(results.length > 0 ? 'success' : 'error');
    
    if (results.length === 0 && hasError) {
      setError('Semua file gagal diproses');
    }
  };

  const handleDownload = (index: number) => {
    const file = processedFiles[index];
    if (!file) return;
    
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    processedFiles.forEach((file, index) => {
      setTimeout(() => handleDownload(index), index * 200);
    });
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setPassword('');
    setStatus('idle');
    setError(undefined);
    setProcessedFiles([]);
    setFileProgresses([]);
    setOverallProgress(0);
  };

  const canProcess = selectedFiles.length > 0 && password.length >= 4;
  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="min-h-screen bg-grid noise-overlay relative">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-glow-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6 animate-float">
            <Lock className="w-10 h-10 text-primary animate-lock-pulse" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-glow">
            SandiKita
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            Enkripsi file kelas profesional. 100% lokal, zero upload, 
            AES-256-GCM & ChaCha20-Poly1305 dengan Argon2id KDF.
          </p>
          
          {/* Security badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="security-badge">
              <Shield className="w-3.5 h-3.5" />
              End-to-End Encrypted
            </span>
            <span className="security-badge">
              <Lock className="w-3.5 h-3.5" />
              Client-Side Only
            </span>
            <span className="security-badge">
              <Package className="w-3.5 h-3.5" />
              Batch Support
            </span>
          </div>
          
          {/* Mode toggle */}
          <ModeToggle mode={mode} onChange={setMode} />
        </motion.header>

        {/* Main content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <AnimatePresence mode="wait">
            {status === 'idle' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* File drop zone */}
                <FileDropZone
                  onFileSelect={handleFileSelect}
                  selectedFiles={selectedFiles}
                  onClear={handleClearFiles}
                  onRemoveFile={handleRemoveFile}
                  mode={mode}
                  multiple={true}
                />

                {/* Password input */}
                <div className="card-glow rounded-2xl p-6">
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    showStrength={mode === 'encrypt'}
                    label={mode === 'encrypt' ? 'Password untuk enkripsi' : 'Password untuk dekripsi'}
                    placeholder={mode === 'encrypt' ? 'Masukkan password atau passphrase...' : 'Masukkan password...'}
                  />
                </div>

                {/* Algorithm selector (encrypt only) */}
                {mode === 'encrypt' && (
                  <div className="card-glow rounded-2xl p-6">
                    <AlgorithmSelector value={algorithm} onChange={setAlgorithm} />
                  </div>
                )}

                {/* File info and action */}
                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glow rounded-2xl p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {selectedFiles.length} file • Estimasi: <span className="text-foreground font-medium">{estimateTime(totalSize)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: <span className="font-mono text-foreground">{formatFileSize(totalSize)}</span>
                          {mode === 'encrypt' && ' + integritas SHA-256'}
                        </p>
                      </div>
                      
                      <Button
                        variant="glow"
                        size="lg"
                        onClick={handleProcess}
                        disabled={!canProcess}
                        className="w-full sm:w-auto"
                      >
                        {mode === 'encrypt' ? (
                          <>
                            <Lock className="w-5 h-5" />
                            Enkripsi {selectedFiles.length > 1 ? `${selectedFiles.length} File` : 'Sekarang'}
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            Dekripsi {selectedFiles.length > 1 ? `${selectedFiles.length} File` : 'Sekarang'}
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Use batch progress for multiple files, single progress for one file */}
                {selectedFiles.length > 1 ? (
                  <BatchProgressIndicator
                    files={fileProgresses}
                    mode={mode}
                    currentIndex={currentFileIndex}
                    overallProgress={overallProgress}
                  />
                ) : (
                  <ProgressIndicator
                    progress={fileProgresses[0]?.progress || 0}
                    stage={fileProgresses[0]?.stage || ''}
                    mode={mode}
                    status={status}
                    error={fileProgresses[0]?.error || error}
                  />
                )}

                {/* Results section */}
                {status === 'success' && processedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glow rounded-2xl p-6"
                  >
                    {processedFiles.length === 1 ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{processedFiles[0].filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(processedFiles[0].blob.size)}
                            {processedFiles[0].verified && (
                              <span className="ml-2 text-success">✓ Terverifikasi</span>
                            )}
                          </p>
                          {processedFiles[0].hash && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                              SHA-256: {processedFiles[0].hash.slice(0, 32)}...
                            </p>
                          )}
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                          <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-initial">
                            Proses Lagi
                          </Button>
                          <Button variant="success" onClick={() => handleDownload(0)} className="flex-1 sm:flex-initial">
                            <Download className="w-5 h-5" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">
                            {processedFiles.length} file siap didownload
                          </p>
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={handleReset}>
                              Proses Lagi
                            </Button>
                            <Button variant="success" onClick={handleDownloadAll}>
                              <Download className="w-5 h-5" />
                              Download Semua
                            </Button>
                          </div>
                        </div>
                        
                        {/* Individual download buttons */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {processedFiles.map((file, index) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm text-foreground truncate">{file.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.blob.size)}
                                  {file.verified && <span className="ml-2 text-success">✓ Terverifikasi</span>}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownload(index)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {status === 'error' && processedFiles.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button variant="outline" onClick={handleReset} className="w-full">
                      Coba Lagi
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>

        {/* Security info section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
            Keamanan Kelas Profesional
          </h2>
          <SecurityBadges />
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Semua proses enkripsi berjalan 100% di browser Anda. <br className="hidden sm:block" />
            File tidak pernah dikirim ke server manapun.
          </p>
          
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">Format: .skita v2</span>
            <span className="w-px h-3 bg-border" />
            <span>AES-256 / ChaCha20 + Argon2id</span>
            <span className="w-px h-3 bg-border" />
            <span>SHA-256 Integrity</span>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
