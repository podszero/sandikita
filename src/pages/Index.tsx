import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Download, Github, Info, ExternalLink } from 'lucide-react';
import { FileDropZone } from '@/components/FileDropZone';
import { PasswordInput } from '@/components/PasswordInput';
import { AlgorithmSelector } from '@/components/AlgorithmSelector';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { SecurityBadges } from '@/components/SecurityBadges';
import { ModeToggle } from '@/components/ModeToggle';
import { Button } from '@/components/ui/button';
import { encryptFile, decryptFile } from '@/lib/crypto-worker';
import { formatFileSize, estimateTime, type Algorithm } from '@/lib/crypto-utils';

type Status = 'idle' | 'processing' | 'success' | 'error';

const Index = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-GCM');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFilename, setResultFilename] = useState('');

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setStatus('idle');
    setError(undefined);
    
    // Auto-detect mode based on file extension
    if (file.name.endsWith('.skita')) {
      setMode('decrypt');
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setStatus('idle');
    setError(undefined);
    setResultBlob(null);
    setResultFilename('');
  }, []);

  const handleProcess = async () => {
    if (!selectedFile || !password) return;

    setStatus('processing');
    setProgress(0);
    setStage('Initializing...');
    setError(undefined);

    try {
      if (mode === 'encrypt') {
        const result = await encryptFile({
          file: selectedFile,
          password,
          algorithm,
          onProgress: (p, s) => {
            setProgress(p);
            setStage(s);
          },
        });
        setResultBlob(result.blob);
        setResultFilename(result.filename);
      } else {
        const result = await decryptFile({
          file: selectedFile,
          password,
          onProgress: (p, s) => {
            setProgress(p);
            setStage(s);
          },
        });
        setResultBlob(result.blob);
        setResultFilename(result.filename);
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPassword('');
    setStatus('idle');
    setProgress(0);
    setError(undefined);
    setResultBlob(null);
    setResultFilename('');
  };

  const canProcess = selectedFile && password.length >= 4;

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
                  selectedFile={selectedFile}
                  onClear={handleClearFile}
                  mode={mode}
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
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glow rounded-2xl p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Estimasi waktu: <span className="text-foreground font-medium">{estimateTime(selectedFile.size)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Output: <span className="font-mono text-foreground">{mode === 'encrypt' ? `${selectedFile.name}.skita` : 'file asli'}</span>
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
                            Enkripsi Sekarang
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            Dekripsi Sekarang
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
                <ProgressIndicator
                  progress={progress}
                  stage={stage}
                  mode={mode}
                  status={status}
                  error={error}
                />

                {status === 'success' && resultBlob && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glow rounded-2xl p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">{resultFilename}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(resultBlob.size)}</p>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-initial">
                          Proses Lagi
                        </Button>
                        <Button variant="success" onClick={handleDownload} className="flex-1 sm:flex-initial">
                          <Download className="w-5 h-5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {status === 'error' && (
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
            <span className="font-mono">Format: .skita v1</span>
            <span className="w-px h-3 bg-border" />
            <span>AES-256 / ChaCha20 + Argon2id</span>
            <span className="w-px h-3 bg-border" />
            <span>Open Spec</span>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
