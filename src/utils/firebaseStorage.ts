import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { fileToBase64, base64ToBlob, Base64Data } from './base64Utils';

/**
 * Upload a file to Firebase Storage
 */
export const uploadFile = async (
  path: string,
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);

  if (onProgress) {
    // Use resumable upload for progress tracking
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } else {
    // Simple upload without progress
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
  files: Array<{ path: string; file: File | Blob }>,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map((item, index) =>
    uploadFile(item.path, item.file, (progress) => {
      if (onProgress) {
        onProgress(index, progress);
      }
    })
  );

  return await Promise.all(uploadPromises);
};

/**
 * Get download URL for a file
 */
export const getFileURL = async (path: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

/**
 * Delete a file from Firebase Storage
 */
export const deleteFile = async (path: string): Promise<void> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

/**
 * Delete multiple files
 */
export const deleteMultipleFiles = async (paths: string[]): Promise<void> => {
  const deletePromises = paths.map(path => deleteFile(path));
  await Promise.all(deletePromises);
};

/**
 * List all files in a directory
 */
export const listFiles = async (path: string): Promise<Array<{ name: string; fullPath: string }>> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);

  return result.items.map(item => ({
    name: item.name,
    fullPath: item.fullPath
  }));
};

/**
 * Generate a unique filename with timestamp
 */
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  return `${nameWithoutExt}_${timestamp}.${extension}`;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || '';
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size (in MB)
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB <= maxSizeMB;
};

/**
 * Upload image with automatic path generation
 */
export const uploadImage = async (
  file: File,
  folder: string = 'images',
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Validate image type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validateFileType(file, allowedTypes)) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  // Validate size (max 5MB)
  if (!validateFileSize(file, 5)) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const path = `${folder}/${uniqueFileName}`;

  return await uploadFile(path, file, onProgress);
};

/**
 * Upload avatar/profile picture
 */
export const uploadAvatar = async (
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return await uploadImage(file, `avatars/${userId}`, onProgress);
};

/**
 * Storage path helpers
 */
export const storagePaths = {
  avatars: (userId: string) => `avatars/${userId}`,
  images: (filename: string) => `images/${filename}`,
  documents: (filename: string) => `documents/${filename}`,
  videos: (filename: string) => `videos/${filename}`,
  userUploads: (userId: string, filename: string) => `users/${userId}/uploads/${filename}`,
};

/**
 * Convert file to Base64 and return encoded data (no upload to Firebase Storage)
 * This is the recommended approach for storing files directly in Firestore
 */
export const encodeFileToBase64 = async (file: File): Promise<Base64Data> => {
  return await fileToBase64(file);
};

/**
 * Upload file as Base64 to Firebase Storage
 * Note: For Firestore storage, use Firestore methods instead
 */
export const uploadFileAsBase64 = async (
  path: string,
  base64Data: Base64Data,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  // Convert Base64 back to Blob for upload
  const blob = base64ToBlob(base64Data.data, base64Data.mimeType);
  return await uploadFile(path, blob, onProgress);
};

/**
 * Helper to encode and prepare file for Firestore storage
 */
export const prepareFileForFirestore = async (
  file: File,
  options?: {
    compress?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<Base64Data> => {
  // For images, optionally compress before encoding
  if (options?.compress && file.type.startsWith('image/')) {
    const { compressImage } = await import('./base64Utils');
    const compressedFile = await compressImage(
      file,
      options.maxWidth,
      options.maxHeight,
      options.quality
    );
    return await fileToBase64(compressedFile);
  }

  return await fileToBase64(file);
};

