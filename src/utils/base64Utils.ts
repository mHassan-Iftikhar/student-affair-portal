/**
 * Base64 Utilities
 * Stores RAW base64 only (no "data:image/xxx;base64," prefix)
 */

export interface Base64Data {
  data: string;      // Raw base64 string (NO prefix)
  mimeType: string;  // e.g., "image/png", "image/jpeg"
  fileName: string;
  size: number;
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Remove "data:image/xxx;base64," prefix from string
 * Always returns ONLY the raw base64 string
 * 
 * Input:  "data:image/png;base64,iVBORw0KGgo..."
 * Output: "iVBORw0KGgo..."
 */
export const removeBase64Prefix = (str: string): string => {
  if (!str || typeof str !== "string") return "";
  
  if (str.includes(",")) {
    return str.split(",")[1];
  }
  
  return str;
};

/**
 * Extract mime type from data URL
 * 
 * Input:  "data:image/png;base64,..."
 * Output: "image/png"
 */
export const extractMimeType = (dataURL: string): string => {
  if (!dataURL || typeof dataURL !== "string") return "image/png";
  const match = dataURL.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/png";
};

/**
 * Check if string has data URL prefix
 */
export const hasPrefix = (str: string): boolean => {
  if (!str || typeof str !== "string") return false;
  return str.startsWith("data:") && str.includes(";base64,");
};

/**
 * Build displayable image URL from raw base64
 * Use ONLY for displaying in <img> tags, NOT for storing
 * 
 * Input:  "iVBORw0KGgo...", "image/png"
 * Output: "data:image/png;base64,iVBORw0KGgo..."
 */
export const buildImageUrl = (rawBase64: string, mimeType: string = "image/png"): string => {
  if (!rawBase64) return "";
  const clean = removeBase64Prefix(rawBase64);
  return `data:${mimeType};base64,${clean}`;
};

// =====================================================
// FILE TO BASE64 CONVERSION
// =====================================================

/**
 * Convert File to Base64Data (raw base64, NO prefix)
 */
export const fileToBase64 = (file: File): Promise<Base64Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = file.type || extractMimeType(result);
      const rawBase64 = removeBase64Prefix(result);

      resolve({
        data: rawBase64,
        mimeType,
        fileName: file.name,
        size: file.size,
      });
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert Blob to Base64Data (raw base64, NO prefix)
 */
export const blobToBase64 = (blob: Blob, fileName: string = "file"): Promise<Base64Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = blob.type || extractMimeType(result);
      const rawBase64 = removeBase64Prefix(result);

      resolve({
        data: rawBase64,
        mimeType,
        fileName,
        size: blob.size,
      });
    };

    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert multiple files to Base64
 */
export const filesToBase64 = async (files: File[]): Promise<Base64Data[]> => {
  return Promise.all(files.map(file => fileToBase64(file)));
};

// =====================================================
// BASE64 TO FILE/BLOB CONVERSION
// =====================================================

/**
 * Convert raw base64 to Blob
 */
export const base64ToBlob = (rawBase64: string, mimeType: string = "image/png"): Blob => {
  const clean = removeBase64Prefix(rawBase64);
  const byteCharacters = atob(clean);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Convert raw base64 to File
 */
export const base64ToFile = (
  rawBase64: string,
  fileName: string,
  mimeType: string = "image/png"
): File => {
  const blob = base64ToBlob(rawBase64, mimeType);
  return new File([blob], fileName, { type: mimeType });
};

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate file size
 */
export const validateFileSize = (
  file: File,
  maxSizeInMB: number
): { valid: boolean; error?: string } => {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeInMB}MB limit`,
    };
  }
  return { valid: true };
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
      error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }
  return { valid: true };
};

/**
 * Validate image file (size and type)
 */
export const validateImageFile = (
  file: File,
  maxSizeInMB: number = 5
): { valid: boolean; error?: string } => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  const typeCheck = validateFileType(file, allowedTypes);
  if (!typeCheck.valid) return typeCheck;
  
  const sizeCheck = validateFileSize(file, maxSizeInMB);
  if (!sizeCheck.valid) return sizeCheck;
  
  return { valid: true };
};

// =====================================================
// IMAGE OPERATIONS
// =====================================================

/**
 * Compress image before converting to Base64
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
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }
            resolve(
              new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
            );
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Failed to create thumbnail"));
              return;
            }
            resolve(await blobToBase64(blob, `thumb_${file.name}`));
          },
          file.type,
          0.7
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

// =====================================================
// UTILITY HELPERS
// =====================================================

/**
 * Download raw base64 as file
 */
export const downloadBase64 = (
  rawBase64: string,
  fileName: string,
  mimeType: string = "image/png"
): void => {
  const dataURL = buildImageUrl(rawBase64, mimeType);
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot !== -1 ? fileName.slice(lastDot + 1) : "";
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Check if mime type is image
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType?.startsWith("image/") || false;
};

/**
 * Check if mime type is video
 */
export const isVideoFile = (mimeType: string): boolean => {
  return mimeType?.startsWith("video/") || false;
};

/**
 * Check if mime type is document
 */
export const isDocumentFile = (mimeType: string): boolean => {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];
  return docTypes.includes(mimeType);
};

// =====================================================
// BACKWARD COMPATIBILITY ALIASES & ENFORCED RAW BASE64 STORAGE
// =====================================================

export const stripBase64Prefix = removeBase64Prefix;
export const ensureRawBase64 = removeBase64Prefix;
export const getBase64ForStorage = removeBase64Prefix;
export const buildDataURL = buildImageUrl;
export const getImageUrl = buildImageUrl;
export const getImageSrcFromFirebase = buildImageUrl;

// Always return only raw base64 for storage
export const base64ToDataURL = (base64Data: Base64Data): string => {
  return buildImageUrl(base64Data.data);
  // return buildImageUrl(removeBase64Prefix(base64Data.data), base64Data.mimeType);
};

// Always store only raw base64 in DB
export const prepareForFirebase = (base64Data: Base64Data): string => {
  return removeBase64Prefix(base64Data.data);
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

const base64Utils = {
  // Core
  removeBase64Prefix,
  extractMimeType,
  hasPrefix,
  buildImageUrl,

  // Conversion
  fileToBase64,
  blobToBase64,
  filesToBase64,
  base64ToBlob,
  base64ToFile,

  // Validation
  validateFileSize,
  validateFileType,
  validateImageFile,

  // Image operations
  compressImage,
  createThumbnail,

  // Utilities
  downloadBase64,
  getFileExtension,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isDocumentFile,

  // Backward compatibility
  stripBase64Prefix,
  ensureRawBase64,
  getBase64ForStorage,
  buildDataURL,
  getImageUrl,
  getImageSrcFromFirebase,
  base64ToDataURL,
  prepareForFirebase,
};

export default base64Utils;