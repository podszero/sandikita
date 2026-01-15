import React from 'react';
import { 
  File, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText, 
  FileArchive, 
  FileCode, 
  FileSpreadsheet,
  Presentation,
  FileJson,
  Shield
} from 'lucide-react';

interface FileTypeIconProps {
  filename: string;
  className?: string;
}

const getFileExtension = (filename: string): string => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const getFileTypeInfo = (filename: string): { icon: React.ElementType; color: string } => {
  const ext = getFileExtension(filename);
  
  // Encrypted files
  if (ext === 'skita') {
    return { icon: Shield, color: 'text-emerald-500' };
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'heic', 'heif'].includes(ext)) {
    return { icon: FileImage, color: 'text-pink-500' };
  }
  
  // Videos
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', '3gp'].includes(ext)) {
    return { icon: FileVideo, color: 'text-purple-500' };
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'].includes(ext)) {
    return { icon: FileAudio, color: 'text-orange-500' };
  }
  
  // Documents
  if (['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) {
    return { icon: FileText, color: 'text-blue-500' };
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return { icon: FileSpreadsheet, color: 'text-green-500' };
  }
  
  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { icon: Presentation, color: 'text-red-500' };
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return { icon: FileArchive, color: 'text-yellow-500' };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 'h', 'rb', 'go', 'rs', 'php', 'swift', 'kt'].includes(ext)) {
    return { icon: FileCode, color: 'text-cyan-500' };
  }
  
  // JSON/Config
  if (['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext)) {
    return { icon: FileJson, color: 'text-amber-500' };
  }
  
  // Default
  return { icon: File, color: 'text-muted-foreground' };
};

export function FileTypeIcon({ filename, className = 'w-4 h-4' }: FileTypeIconProps) {
  const { icon: Icon, color } = getFileTypeInfo(filename);
  
  return <Icon className={`${className} ${color}`} />;
}

export { getFileTypeInfo, getFileExtension };
