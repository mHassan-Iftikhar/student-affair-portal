/**
 * Base64 Encoding/Decoding Utilities
 * Optimized for handling files, images, videos, and all data types
 */

export interface Base64Data {
  data: string; // Base64 string
  mimeType: string; // MIME type (e.g., 'image/jpeg', 'video/mp4')
  fileName: string;
  size: number; // Original file size in bytes
  timestamp: number;
}

/**
 * Convert File to Base64 string with metadata
 */
export const fileToBase64 = (file: File): Promise<Base64Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Extract just the base64 data (remove data:mime;base64, prefix)
      const base64Data = result.split(',')[1] || result;

      resolve({
        data: base64Data,
        mimeType: file.type,
        fileName: file.name,
        size: file.size,
        timestamp: Date.now(),
      });
    };

    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${error}`));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Convert Blob to Base64 string
 */
export const blobToBase64 = (blob: Blob, fileName: string = 'file'): Promise<Base64Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;

      resolve({
        data: base64Data,
        mimeType: blob.type,
        fileName,
        size: blob.size,
        timestamp: Date.now(),
      });
    };

    reader.onerror = (error) => {
      reject(new Error(`Failed to read blob: ${error}`));
    };

    reader.readAsDataURL(blob);
  });
};

/**
 * Convert multiple files to Base64
 */
export const filesToBase64 = async (files: File[]): Promise<Base64Data[]> => {
  const promises = files.map(file => fileToBase64(file));
  return await Promise.all(promises);
};

/**
 * Convert Base64 string back to Blob
 */
export const base64ToBlob = (base64Data: Base64Data): Blob => {
  const byteCharacters = atob(base64Data.data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: base64Data.mimeType });
};

/**
 * Convert Base64 string back to File
 */
export const base64ToFile = (base64Data: Base64Data): File => {
  const blob = base64ToBlob(base64Data);
  return new File([blob], base64Data.fileName, { type: base64Data.mimeType });
};

/**
 * Get data URL from Base64Data (for displaying images/videos)
 */
export const base64ToDataURL = (base64Data: Base64Data): string => {
  return `data:${base64Data.mimeType};base64,${base64Data.data}`;
};

/**
 * Download Base64 data as a file
 */
export const downloadBase64File = (base64Data: Base64Data): void => {
  const dataURL = base64ToDataURL(base64Data);
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = base64Data.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Validate file type
 */
export const validateFileType = (
  file: File,
  allowedTypes: string[]
): { valid: boolean; error?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  return { valid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (
  file: File,
  maxSizeInMB: number
): { valid: boolean; error?: string } => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeInMB}MB limit`,
    };
  }
  return { valid: true };
};

/**
 * Compress image before converting to Base64 (for optimization)
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Check if file is a video
 */
export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

/**
 * Check if file is a document
 */
export const isDocumentFile = (mimeType: string): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];
  return documentTypes.includes(mimeType);
};

/**
 * Chunk large Base64 strings for storage (if needed for very large files)
 */
export const chunkBase64 = (
  base64String: string,
  chunkSize: number = 1024 * 1024 // 1MB chunks
): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < base64String.length; i += chunkSize) {
    chunks.push(base64String.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Reassemble chunked Base64 strings
 */
export const reassembleBase64Chunks = (chunks: string[]): string => {
  return chunks.join('');
};

/**
 * Create thumbnail from image file
 */
export const createThumbnail = (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<Base64Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate thumbnail dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create thumbnail'));
              return;
            }
            const thumbnailData = await blobToBase64(
              blob,
              `thumb_${file.name}`
            );
            resolve(thumbnailData);
          },
          file.type,
          0.7
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default {
  fileToBase64,
  blobToBase64,
  filesToBase64,
  base64ToBlob,
  base64ToFile,
  base64ToDataURL,
  downloadBase64File,
  validateFileType,
  validateFileSize,
  compressImage,
  getFileExtension,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isDocumentFile,
  chunkBase64,
  reassembleBase64Chunks,
  createThumbnail,
};
