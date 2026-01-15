/**
 * SandiKita Crypto Worker
 * Handles encryption/decryption for both AES-GCM and ChaCha20-Poly1305
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
  MAGIC_BYTES,
  FORMAT_VERSION,
  CHUNK_SIZE,
  type FileHeader,
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
}

export interface DecryptResult {
  blob: Blob;
  filename: string;
}

// Encrypt file
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

  onProgress?.(0, 'Generating salt...');
  
  // Generate salt and master nonce
  const salt = generateSalt();
  const masterNonce = generateNonce();
  
  onProgress?.(5, 'Deriving key with Argon2id...');
  
  // Derive master key as raw bytes
  const masterKeyBytes = await deriveKeyArgon2Bytes(
    password,
    salt,
    kdfMemory,
    kdfIterations,
    kdfParallelism
  );
  
  onProgress?.(15, 'Preparing encryption...');
  
  // Calculate total chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Create header
  const header: FileHeader = {
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
  };
  
  const headerBytes = serializeHeader(header);
  
  // Collect encrypted chunks
  const chunks: Uint8Array[] = [headerBytes];
  
  // Read and encrypt file in chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const slice = file.slice(start, end);
    const chunkData = new Uint8Array(await slice.arrayBuffer());
    
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
    const progress = 15 + (85 * (i + 1)) / totalChunks;
    onProgress?.(progress, `Encrypting chunk ${i + 1}/${totalChunks}...`);
  }
  
  onProgress?.(100, 'Complete!');
  
  // Combine all chunks into final blob
  const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
  const filename = `${file.name}.skita`;
  
  return { blob, filename };
}

// Decrypt file
export async function decryptFile(options: DecryptOptions): Promise<DecryptResult> {
  const { file, password, onProgress } = options;
  
  onProgress?.(0, 'Reading file header...');
  
  // Read enough bytes for header (max 1KB should be enough)
  const headerSlice = file.slice(0, 1024);
  const headerData = new Uint8Array(await headerSlice.arrayBuffer());
  
  // Parse header
  const header = deserializeHeader(headerData);
  const headerSize = getHeaderSize(headerData);
  
  onProgress?.(5, 'Deriving key with Argon2id...');
  
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
    
    // Update progress
    const progress = 15 + (85 * (i + 1)) / header.totalChunks;
    onProgress?.(progress, `Decrypting chunk ${i + 1}/${header.totalChunks}...`);
  }
  
  onProgress?.(100, 'Complete!');
  
  // Combine all chunks into final blob
  const blob = new Blob(decryptedChunks as BlobPart[], { type: 'application/octet-stream' });
  
  return { blob, filename: header.originalFilename };
}