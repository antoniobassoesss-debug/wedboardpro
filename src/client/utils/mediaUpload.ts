/**
 * Media Upload Utilities for Chat
 * Handles file validation, upload, and processing
 */

import { browserSupabaseClient } from '../browserSupabaseClient';

export type MediaType = 'image' | 'video' | 'document' | 'audio';

export interface MediaFile {
  file: File;
  type: MediaType;
  preview?: string;
  caption?: string;
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  error?: string;
}

// File type configurations
const FILE_CONFIGS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    extensions: ['.mp4', '.mov', '.avi', '.webm'],
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.rar'],
  },
  audio: {
    maxSize: 20 * 1024 * 1024, // 20MB
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm'],
    extensions: ['.mp3', '.wav', '.m4a', '.ogg'],
  },
};

/**
 * Detect media type from file
 */
export function getMediaType(file: File): MediaType | null {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  // Check by extension for documents
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  if (FILE_CONFIGS.document.extensions.includes(ext)) return 'document';

  return null;
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const mediaType = getMediaType(file);

  if (!mediaType) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload images, videos, documents, or audio files.',
    };
  }

  const config = FILE_CONFIGS[mediaType];

  // Check MIME type
  if (!config.mimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `This ${mediaType} format is not supported. Supported formats: ${config.extensions.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${fileSizeMB}MB). Maximum size for ${mediaType}s is ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generate preview URL for file
 */
export function generatePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const mediaType = getMediaType(file);

    if (mediaType === 'image') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (mediaType === 'video') {
      // Generate video thumbnail
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    } else {
      // For documents and audio, return null (will show icon instead)
      resolve('');
    }
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get video duration and dimensions
 */
export function getVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Get audio duration
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = reject;
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Get storage bucket name based on media type
 */
function getBucketName(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image':
      return 'chat-images';
    case 'video':
      return 'chat-videos';
    case 'audio':
      return 'chat-audio';
    case 'document':
      return 'chat-documents';
    default:
      return 'chat-documents';
  }
}

/**
 * Upload media file to Supabase Storage
 */
export async function uploadMediaFile(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<MediaUploadResult> {
  const mediaType = getMediaType(file);
  if (!mediaType) {
    return { success: false, error: 'Invalid file type' };
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (!browserSupabaseClient) {
    return { success: false, error: 'Storage client not available' };
  }

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const filename = `${timestamp}-${randomStr}${ext}`;
    const storagePath = `${userId}/${filename}`;
    const bucket = getBucketName(mediaType);

    // Upload file
    const { error: uploadError, data } = await browserSupabaseClient.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = browserSupabaseClient.storage.from(bucket).getPublicUrl(storagePath);

    const result: MediaUploadResult = {
      success: true,
      url: urlData.publicUrl,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };

    // Get metadata based on type
    try {
      if (mediaType === 'image') {
        const dimensions = await getImageDimensions(file);
        result.width = dimensions.width;
        result.height = dimensions.height;
      } else if (mediaType === 'video') {
        const metadata = await getVideoMetadata(file);
        result.width = metadata.width;
        result.height = metadata.height;
        result.duration = metadata.duration;

        // Generate thumbnail
        const thumbnailBlob = await generateVideoThumbnail(file);
        if (thumbnailBlob) {
          const thumbPath = `${userId}/thumb-${filename.replace(ext, '.jpg')}`;
          const { data: thumbData } = await browserSupabaseClient.storage
            .from(bucket)
            .upload(thumbPath, thumbnailBlob, { cacheControl: '3600', upsert: false });
          if (thumbData) {
            const { data: thumbUrlData } = browserSupabaseClient.storage
              .from(bucket)
              .getPublicUrl(thumbPath);
            result.thumbnailUrl = thumbUrlData.publicUrl;
          }
        }
      } else if (mediaType === 'audio') {
        const duration = await getAudioDuration(file);
        result.duration = duration;
      }
    } catch (metaError) {
      console.warn('Failed to extract metadata:', metaError);
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error?.message || 'Upload failed' };
  }
}

/**
 * Generate video thumbnail as blob
 */
async function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.currentTime = 1;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        },
        'image/jpeg',
        0.8
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

/**
 * Format duration for display (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get file extension icon/emoji
 */
export function getFileIcon(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📊',
    pptx: '📊',
    txt: '📝',
    csv: '📊',
    zip: '📁',
    rar: '📁',
    mp3: '🎵',
    wav: '🎵',
    m4a: '🎵',
    ogg: '🎵',
  };
  return icons[ext] || '📎';
}
