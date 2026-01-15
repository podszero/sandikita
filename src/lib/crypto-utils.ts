/**
 * SandiKita Crypto Utilities
 * AES-256-GCM encryption with Argon2id KDF
 */

// File format constants
export const MAGIC_BYTES = new Uint8Array([0x53, 0x4b, 0x54, 0x41]); // "SKTA"
export const FORMAT_VERSION = 0x0001;
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks

export type Algorithm = 'AES-GCM' | 'ChaCha20-Poly1305';
export type KDF = 'Argon2id';

export interface EncryptionParams {
  algorithm: Algorithm;
  kdf: KDF;
  kdfMemory: number; // KB
  kdfIterations: number;
  kdfParallelism: number;
  salt: Uint8Array;
  chunkSize: number;
}

export interface FileHeader {
  magic: Uint8Array;
  version: number;
  algorithm: Algorithm;
  kdf: KDF;
  kdfMemory: number;
  kdfIterations: number;
  kdfParallelism: number;
  salt: Uint8Array;
  chunkSize: number;
  originalFilename: string;
  originalSize: number;
  totalChunks: number;
}

// Generate cryptographically secure random bytes
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// Generate salt for KDF
export function generateSalt(): Uint8Array {
  return generateRandomBytes(32);
}

// Generate nonce/IV for AES-GCM (12 bytes)
export function generateNonce(): Uint8Array {
  return generateRandomBytes(12);
}

// Derive nonce from chunk index (deterministic, safe for HKDF-derived keys)
export function deriveChunkNonce(masterNonce: Uint8Array, chunkIndex: number): Uint8Array {
  const nonce = new Uint8Array(12);
  nonce.set(masterNonce.slice(0, 8));
  const view = new DataView(nonce.buffer);
  view.setUint32(8, chunkIndex, false); // Big-endian chunk index
  return nonce;
}

// Simple HKDF-like key derivation for chunk keys
export async function deriveChunkKey(
  masterKey: CryptoKey,
  chunkIndex: number
): Promise<CryptoKey> {
  // Export master key to raw bytes
  const masterKeyBytes = await crypto.subtle.exportKey('raw', masterKey);
  
  // Create info for this chunk
  const info = new TextEncoder().encode(`chunk-${chunkIndex}`);
  
  // Combine master key with chunk info
  const combined = new Uint8Array(
    (masterKeyBytes as ArrayBuffer).byteLength + info.byteLength
  );
  combined.set(new Uint8Array(masterKeyBytes as ArrayBuffer), 0);
  combined.set(info, (masterKeyBytes as ArrayBuffer).byteLength);
  
  // Hash to derive chunk key
  const chunkKeyBytes = await crypto.subtle.digest('SHA-256', combined);
  
  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    chunkKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Argon2id key derivation (using hash-wasm)
export async function deriveKeyArgon2(
  password: string,
  salt: Uint8Array,
  memory: number = 65536, // 64MB
  iterations: number = 3,
  parallelism: number = 4
): Promise<CryptoKey> {
  // Dynamic import of hash-wasm
  const { argon2id } = await import('hash-wasm');
  
  const hash = await argon2id({
    password: password,
    salt: salt,
    iterations: iterations,
    memorySize: memory,
    parallelism: parallelism,
    hashLength: 32,
    outputType: 'binary',
  });
  
  // Import the derived key for AES-GCM
  return crypto.subtle.importKey(
    'raw',
    hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength) as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for chunk key derivation
    ['encrypt', 'decrypt']
  );
}

// Encrypt a single chunk with AES-GCM
export async function encryptChunk(
  data: Uint8Array,
  key: CryptoKey,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as unknown as BufferSource, tagLength: 128 },
    key,
    data as unknown as BufferSource
  );
  return new Uint8Array(encrypted);
}

// Decrypt a single chunk with AES-GCM
export async function decryptChunk(
  data: Uint8Array,
  key: CryptoKey,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as unknown as BufferSource, tagLength: 128 },
    key,
    data as unknown as BufferSource
  );
  return new Uint8Array(decrypted);
}

// Serialize file header to bytes
export function serializeHeader(header: FileHeader): Uint8Array {
  const filenameBytes = new TextEncoder().encode(header.originalFilename);
  
  // Calculate header size
  const headerSize = 
    4 + // magic
    2 + // version
    1 + // algorithm (0 = AES-GCM, 1 = ChaCha20)
    1 + // kdf (0 = Argon2id)
    4 + // kdf memory
    4 + // kdf iterations
    1 + // kdf parallelism
    32 + // salt
    4 + // chunk size
    4 + // original size (up to 4GB)
    4 + // total chunks
    2 + // filename length
    filenameBytes.length; // filename
  
  const buffer = new ArrayBuffer(headerSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  let offset = 0;
  
  // Magic bytes
  bytes.set(header.magic, offset);
  offset += 4;
  
  // Version
  view.setUint16(offset, header.version, false);
  offset += 2;
  
  // Algorithm
  view.setUint8(offset, header.algorithm === 'AES-GCM' ? 0 : 1);
  offset += 1;
  
  // KDF
  view.setUint8(offset, 0); // Argon2id = 0
  offset += 1;
  
  // KDF params
  view.setUint32(offset, header.kdfMemory, false);
  offset += 4;
  view.setUint32(offset, header.kdfIterations, false);
  offset += 4;
  view.setUint8(offset, header.kdfParallelism);
  offset += 1;
  
  // Salt
  bytes.set(header.salt, offset);
  offset += 32;
  
  // Chunk size
  view.setUint32(offset, header.chunkSize, false);
  offset += 4;
  
  // Original size
  view.setUint32(offset, header.originalSize, false);
  offset += 4;
  
  // Total chunks
  view.setUint32(offset, header.totalChunks, false);
  offset += 4;
  
  // Filename length
  view.setUint16(offset, filenameBytes.length, false);
  offset += 2;
  
  // Filename
  bytes.set(filenameBytes, offset);
  
  return bytes;
}

// Deserialize header from bytes
export function deserializeHeader(data: Uint8Array): FileHeader {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  
  // Magic bytes
  const magic = data.slice(offset, offset + 4);
  offset += 4;
  
  // Verify magic
  if (!magic.every((b, i) => b === MAGIC_BYTES[i])) {
    throw new Error('Invalid file format: not a .skita file');
  }
  
  // Version
  const version = view.getUint16(offset, false);
  offset += 2;
  
  // Algorithm
  const algoId = view.getUint8(offset);
  const algorithm: Algorithm = algoId === 0 ? 'AES-GCM' : 'ChaCha20-Poly1305';
  offset += 1;
  
  // KDF
  const kdfId = view.getUint8(offset);
  const kdf: KDF = 'Argon2id'; // Only Argon2id for now
  offset += 1;
  
  // KDF params
  const kdfMemory = view.getUint32(offset, false);
  offset += 4;
  const kdfIterations = view.getUint32(offset, false);
  offset += 4;
  const kdfParallelism = view.getUint8(offset);
  offset += 1;
  
  // Salt
  const salt = data.slice(offset, offset + 32);
  offset += 32;
  
  // Chunk size
  const chunkSize = view.getUint32(offset, false);
  offset += 4;
  
  // Original size
  const originalSize = view.getUint32(offset, false);
  offset += 4;
  
  // Total chunks
  const totalChunks = view.getUint32(offset, false);
  offset += 4;
  
  // Filename length
  const filenameLength = view.getUint16(offset, false);
  offset += 2;
  
  // Filename
  const filenameBytes = data.slice(offset, offset + filenameLength);
  const originalFilename = new TextDecoder().decode(filenameBytes);
  
  return {
    magic,
    version,
    algorithm,
    kdf,
    kdfMemory,
    kdfIterations,
    kdfParallelism,
    salt,
    chunkSize,
    originalFilename,
    originalSize,
    totalChunks,
  };
}

// Get header size from data
export function getHeaderSize(data: Uint8Array): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  // Fixed header size up to filename length field
  const fixedSize = 4 + 2 + 1 + 1 + 4 + 4 + 1 + 32 + 4 + 4 + 4 + 2;
  
  // Filename length is at offset 56
  const filenameLength = view.getUint16(56, false);
  
  return fixedSize + filenameLength;
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number; // 0-100
  label: 'Sangat Lemah' | 'Lemah' | 'Sedang' | 'Kuat' | 'Sangat Kuat';
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];
  
  // Length score
  if (password.length >= 8) score += 20;
  else suggestions.push('Minimal 8 karakter');
  
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  else suggestions.push('Tambahkan huruf kecil');
  
  if (/[A-Z]/.test(password)) score += 10;
  else suggestions.push('Tambahkan huruf besar');
  
  if (/[0-9]/.test(password)) score += 10;
  else suggestions.push('Tambahkan angka');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;
  else suggestions.push('Tambahkan simbol (!@#$%...)');
  
  // Bonus for passphrase-like patterns (multiple words)
  if (password.includes(' ') && password.split(' ').length >= 3) {
    score += 10;
  } else if (password.length < 16) {
    suggestions.push('Coba passphrase: "kata acak satu dua tiga"');
  }
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Determine label
  let label: 'Sangat Lemah' | 'Lemah' | 'Sedang' | 'Kuat' | 'Sangat Kuat';
  if (score < 30) label = 'Sangat Lemah';
  else if (score < 50) label = 'Lemah';
  else if (score < 70) label = 'Sedang';
  else if (score < 90) label = 'Kuat';
  else label = 'Sangat Kuat';
  
  return { score, label, suggestions: suggestions.slice(0, 3) };
}

// Generate random passphrase
const WORD_LIST = [
  'apel', 'buku', 'cinta', 'daun', 'elang', 'foto', 'gitar', 'hujan',
  'ikan', 'jeruk', 'kopi', 'langit', 'malam', 'naga', 'ombak', 'pantai',
  'raja', 'sinar', 'taman', 'udara', 'violet', 'warna', 'yakin', 'zebra',
  'awan', 'bunga', 'cahaya', 'danau', 'embun', 'fajar', 'gunung', 'harum',
  'indah', 'jalan', 'kupu', 'laut', 'mentari', 'nyala', 'oasis', 'pelangi'
];

export function generatePassphrase(wordCount: number = 4): string {
  const words: string[] = [];
  const randomValues = generateRandomBytes(wordCount);
  
  for (let i = 0; i < wordCount; i++) {
    const index = randomValues[i] % WORD_LIST.length;
    words.push(WORD_LIST[index]);
  }
  
  return words.join(' ');
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Estimate encryption time based on file size
export function estimateTime(fileSize: number, throughputMBps: number = 50): string {
  const seconds = fileSize / (throughputMBps * 1024 * 1024);
  
  if (seconds < 1) return '< 1 detik';
  if (seconds < 60) return `~${Math.ceil(seconds)} detik`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} menit`;
  return `~${(seconds / 3600).toFixed(1)} jam`;
}
