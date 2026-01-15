/**
 * SandiKita Crypto Worker
 * Handles encryption/decryption for both AES-GCM and ChaCha20-Poly1305
 * With integrity verification using SHA-256
 */

import {
  deriveKeyArgon2Bytes,
  deriveChunkKeyBytes,
  deriveChunkNonce,
  encryptChunk,
  decryptChunk,
  generateSalt,
  generateNonce,
  serializeHeader,
  deserializeHeader,
  getHeaderSize,
  calculateHash,
  MAGIC_BYTES,
  FORMAT_VERSION,
  CHUNK_SIZE,
  type FileHeaderV2,
  type Algorithm,
} from './crypto-utils';

export interface EncryptOptions {
  file: File;
  password: string;
  algorithm: Algorithm;
  kdfMemory?: number;
  kdfIterations?: number;
  kdfParallelism?: number;
  onProgress?: (progress: number, stage: string) => void;
}

export interface DecryptOptions {
  file: File;
  password: string;
  onProgress?: (progress: number, stage: string) => void;
}

export interface EncryptResult {
  blob: Blob;
  filename: string;
  originalHash: string;
}

export interface DecryptResult {
  blob: Blob;
  filename: string;
  verified: boolean;
  originalHash?: string;
  decryptedHash?: string;
}

// Calculate hash of file data for integrity
async function hashFileData(file: File, onProgress?: (p: number) => void): Promise<{ hash: string; data: Uint8Array[] }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunks: Uint8Array[] = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const slice = file.slice(start, end);
    const chunkData = new Uint8Array(await slice.arrayBuffer());
    chunks.push(chunkData);
    onProgress?.((i + 1) / totalChunks * 100);
  }
  
  // Combine all chunks for hashing
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  const hash = await calculateHash(combined);
  return { hash, data: chunks };
}

// Encrypt file with integrity verification
export async function encryptFile(options: EncryptOptions): Promise<EncryptResult> {
  const {
    file,
    password,
    algorithm,
    kdfMemory = 65536,
    kdfIterations = 3,
    kdfParallelism = 4,
    onProgress,
  } = options;

  onProgress?.(0, 'Menghitung hash file asli...');
  
  // First pass: read file and calculate hash
  const { hash: originalHash, data: fileChunks } = await hashFileData(file, (p) => {
    onProgress?.(p * 0.1, 'Menghitung hash file asli...');
  });
  
  onProgress?.(10, 'Generating salt...');
  
  // Generate salt and master nonce
  const salt = generateSalt();
  const masterNonce = generateNonce();
  
  onProgress?.(12, 'Deriving key with Argon2id...');
  
  // Derive master key as raw bytes
  const masterKeyBytes = await deriveKeyArgon2Bytes(
    password,
    salt,
    kdfMemory,
    kdfIterations,
    kdfParallelism
  );
  
  onProgress?.(20, 'Preparing encryption...');
  
  // Calculate total chunks
  const totalChunks = fileChunks.length;
  
  // Create header with hash
  const header: FileHeaderV2 = {
    magic: MAGIC_BYTES,
    version: FORMAT_VERSION,
    algorithm,
    kdf: 'Argon2id',
    kdfMemory,
    kdfIterations,
    kdfParallelism,
    salt,
    chunkSize: CHUNK_SIZE,
    originalFilename: file.name,
    originalSize: file.size,
    totalChunks,
    originalHash,
  };
  
  const headerBytes = serializeHeader(header);
  
  // Collect encrypted chunks
  const chunks: Uint8Array[] = [headerBytes];
  
  // Encrypt each chunk
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = fileChunks[i];
    
    // Derive chunk-specific key and nonce
    const chunkKeyBytes = await deriveChunkKeyBytes(masterKeyBytes, i);
    const chunkNonce = deriveChunkNonce(masterNonce, i);
    
    // Encrypt chunk with selected algorithm
    const encryptedChunk = await encryptChunk(chunkData, chunkKeyBytes, chunkNonce, algorithm);
    
    // Create chunk record: [4 bytes length][12 bytes nonce][encrypted data with tag]
    const chunkRecord = new Uint8Array(4 + 12 + encryptedChunk.length);
    const recordView = new DataView(chunkRecord.buffer);
    recordView.setUint32(0, encryptedChunk.length, false);
    chunkRecord.set(chunkNonce, 4);
    chunkRecord.set(encryptedChunk, 16);
    
    chunks.push(chunkRecord);
    
    // Update progress
    const progress = 20 + (80 * (i + 1)) / totalChunks;
    onProgress?.(progress, `Encrypting chunk ${i + 1}/${totalChunks}...`);
  }
  
  onProgress?.(100, 'Complete!');
  
  // Combine all chunks into final blob
  const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
  const filename = `${file.name}.skita`;
  
  return { blob, filename, originalHash };
}

// Decrypt file with integrity verification
export async function decryptFile(options: DecryptOptions): Promise<DecryptResult> {
  const { file, password, onProgress } = options;
  
  onProgress?.(0, 'Reading file header...');
  
  // Read enough bytes for header (max 2KB for v2 with hash)
  const headerSlice = file.slice(0, 2048);
  const headerData = new Uint8Array(await headerSlice.arrayBuffer());
  
  // Parse header
  const header = deserializeHeader(headerData);
  const headerSize = getHeaderSize(headerData);
  
  onProgress?.(5, `Detected: ${header.algorithm}`);
  
  await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show algorithm
  
  onProgress?.(6, 'Deriving key with Argon2id...');
  
  // Derive master key as raw bytes
  const masterKeyBytes = await deriveKeyArgon2Bytes(
    password,
    header.salt,
    header.kdfMemory,
    header.kdfIterations,
    header.kdfParallelism
  );
  
  onProgress?.(15, 'Preparing decryption...');
  
  // Collect decrypted chunks
  const decryptedChunks: Uint8Array[] = [];
  
  // Read and decrypt chunks
  let offset = headerSize;
  
  for (let i = 0; i < header.totalChunks; i++) {
    // Read chunk record header (4 bytes length + 12 bytes nonce)
    const chunkHeaderSlice = file.slice(offset, offset + 16);
    const chunkHeaderData = new Uint8Array(await chunkHeaderSlice.arrayBuffer());
    const chunkHeaderView = new DataView(chunkHeaderData.buffer);
    
    const encryptedLength = chunkHeaderView.getUint32(0, false);
    const chunkNonce = chunkHeaderData.slice(4, 16);
    
    // Read encrypted chunk data
    const encryptedSlice = file.slice(offset + 16, offset + 16 + encryptedLength);
    const encryptedData = new Uint8Array(await encryptedSlice.arrayBuffer());
    
    // Derive chunk key
    const chunkKeyBytes = await deriveChunkKeyBytes(masterKeyBytes, i);
    
    try {
      // Decrypt chunk with algorithm from header
      const decryptedChunk = await decryptChunk(encryptedData, chunkKeyBytes, chunkNonce, header.algorithm);
      decryptedChunks.push(decryptedChunk);
    } catch (error) {
      throw new Error('Dekripsi gagal: Password salah atau file rusak');
    }
    
    // Move to next chunk
    offset += 16 + encryptedLength;
    
    // Update progress (leave 10% for integrity check)
    const progress = 15 + (75 * (i + 1)) / header.totalChunks;
    onProgress?.(progress, `Decrypting chunk ${i + 1}/${header.totalChunks}...`);
  }
  
  // Verify integrity if hash is available
  let verified = false;
  let decryptedHash: string | undefined;
  
  if (header.originalHash) {
    onProgress?.(92, 'Verifikasi integritas file...');
    
    // Combine all decrypted chunks for hashing
    const totalSize = decryptedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalSize);
    let hashOffset = 0;
    for (const chunk of decryptedChunks) {
      combined.set(chunk, hashOffset);
      hashOffset += chunk.length;
    }
    
    decryptedHash = await calculateHash(combined);
    verified = decryptedHash === header.originalHash;
    
    if (!verified) {
      throw new Error('Verifikasi gagal: File mungkin rusak atau telah dimodifikasi');
    }
    
    onProgress?.(98, 'Integritas terverifikasi ✓');
  }
  
  onProgress?.(100, 'Complete!');
  
  // Combine all chunks into final blob
  const blob = new Blob(decryptedChunks as BlobPart[], { type: 'application/octet-stream' });
  
  return { 
    blob, 
    filename: header.originalFilename,
    verified,
    originalHash: header.originalHash,
    decryptedHash,
  };
}

// Batch encrypt multiple files
export interface BatchEncryptOptions {
  files: File[];
  password: string;
  algorithm: Algorithm;
  kdfMemory?: number;
  kdfIterations?: number;
  kdfParallelism?: number;
  onFileProgress?: (fileIndex: number, progress: number, stage: string) => void;
  onFileComplete?: (fileIndex: number, result: EncryptResult) => void;
  onFileError?: (fileIndex: number, error: Error) => void;
}

export interface BatchEncryptResult {
  results: (EncryptResult | null)[];
  errors: (Error | null)[];
  totalSuccess: number;
  totalFailed: number;
}

export async function batchEncryptFiles(options: BatchEncryptOptions): Promise<BatchEncryptResult> {
  const { 
    files, 
    password, 
    algorithm,
    kdfMemory,
    kdfIterations,
    kdfParallelism,
    onFileProgress,
    onFileComplete,
    onFileError,
  } = options;
  
  const results: (EncryptResult | null)[] = [];
  const errors: (Error | null)[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await encryptFile({
        file: files[i],
        password,
        algorithm,
        kdfMemory,
        kdfIterations,
        kdfParallelism,
        onProgress: (progress, stage) => {
          onFileProgress?.(i, progress, stage);
        },
      });
      
      results.push(result);
      errors.push(null);
      totalSuccess++;
      onFileComplete?.(i, result);
    } catch (error) {
      results.push(null);
      errors.push(error instanceof Error ? error : new Error(String(error)));
      totalFailed++;
      onFileError?.(i, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  return { results, errors, totalSuccess, totalFailed };
}

// Batch decrypt multiple files
export interface BatchDecryptOptions {
  files: File[];
  password: string;
  onFileProgress?: (fileIndex: number, progress: number, stage: string) => void;
  onFileComplete?: (fileIndex: number, result: DecryptResult) => void;
  onFileError?: (fileIndex: number, error: Error) => void;
}

export interface BatchDecryptResult {
  results: (DecryptResult | null)[];
  errors: (Error | null)[];
  totalSuccess: number;
  totalFailed: number;
}

export async function batchDecryptFiles(options: BatchDecryptOptions): Promise<BatchDecryptResult> {
  const { 
    files, 
    password, 
    onFileProgress,
    onFileComplete,
    onFileError,
  } = options;
  
  const results: (DecryptResult | null)[] = [];
  const errors: (Error | null)[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await decryptFile({
        file: files[i],
        password,
        onProgress: (progress, stage) => {
          onFileProgress?.(i, progress, stage);
        },
      });
      
      results.push(result);
      errors.push(null);
      totalSuccess++;
      onFileComplete?.(i, result);
    } catch (error) {
      results.push(null);
      errors.push(error instanceof Error ? error : new Error(String(error)));
      totalFailed++;
      onFileError?.(i, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  return { results, errors, totalSuccess, totalFailed };
}
