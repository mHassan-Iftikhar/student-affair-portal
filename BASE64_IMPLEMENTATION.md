# Base64 File Encoding Implementation Guide

## Overview

This project now supports **Base64 encoding** for all file types (images, videos, documents, etc.) and stores them directly in **Firebase Firestore collections**. This eliminates the need for Firebase Storage and provides a unified data storage approach.

## Architecture

### Collections with Base64 Support

1. **`academic_resources`** - Educational materials (PDFs, DOCX, images, videos)
2. **`lostNfound`** - Lost and found items with images
3. **`events`** - Events/stories with images and videos
4. **`groups`** - Group data with images
5. **`users`** - User profiles with profile pictures

## Key Features

✅ **Universal File Support**: Images (JPG, PNG, WEBP, GIF), Videos (MP4, WEBM, OGG), Documents (PDF, DOCX)  
✅ **Base64 Encoding**: All files converted to Base64 strings for Firestore storage  
✅ **File Validation**: Type and size validation before upload  
✅ **Image Compression**: Optional compression for images before encoding  
✅ **Thumbnail Generation**: Automatic thumbnail creation for images  
✅ **Preview Support**: Real-time preview before upload  
✅ **Download Support**: Convert Base64 back to downloadable files  
✅ **Optimized Performance**: Chunking support for very large files  

## File Structure

```
src/
├── utils/
│   ├── base64Utils.ts          # Core Base64 utilities
│   ├── firebaseStorage.ts      # Storage helpers with Base64 support
│   └── firestore.ts            # Firestore operations with Base64
├── pages/
│   ├── AcademicResources.tsx   # Academic resources with file upload
│   ├── Items.tsx               # Lost & Found with image upload
│   ├── Stories.tsx             # Events with image/video upload
│   └── Users.tsx               # User profiles with photo upload
```

## Implementation Details

### 1. Base64 Utilities (`base64Utils.ts`)

**Core Functions:**

- `fileToBase64(file: File)` - Convert any file to Base64
- `blobToBase64(blob: Blob)` - Convert Blob to Base64
- `base64ToBlob(base64Data)` - Convert Base64 back to Blob
- `base64ToFile(base64Data)` - Convert Base64 back to File
- `base64ToDataURL(base64Data)` - Get data URL for display
- `downloadBase64File(base64Data)` - Download Base64 as file

**Validation Functions:**

- `validateFileType(file, allowedTypes)` - Check file type
- `validateFileSize(file, maxSizeMB)` - Check file size
- `compressImage(file, maxWidth, maxHeight, quality)` - Compress images

**Utility Functions:**

- `formatFileSize(bytes)` - Human-readable file size
- `isImageFile(mimeType)` - Check if file is image
- `isVideoFile(mimeType)` - Check if file is video
- `isDocumentFile(mimeType)` - Check if file is document
- `createThumbnail(file, maxWidth, maxHeight)` - Generate thumbnail

### 2. Firestore Operations (`firestore.ts`)

**Generic Functions:**

```typescript
// Add document with Base64 files
addDocumentWithBase64(collectionName, data, base64Files)

// Update document with Base64 files
updateDocumentWithBase64(collectionName, documentId, data, base64Files)

// Get document with Base64 files
getDocumentWithBase64(collectionName, documentId)
```

**Collection-Specific Functions:**

```typescript
// Academic Resources
addAcademicResource({ title, description, category, fileData, uploadedBy })

// Lost and Found Items
addLostAndFoundItem({ title, description, category, imageData })

// Events
addEvent({ title, content, imageData, videoData })

// Groups
addGroup({ name, description, imageData })

// Users
addUserWithProfilePicture({ uid, email, displayName, photoData })
updateUserProfilePicture(userId, photoData)
```

### 3. Data Structure

**Base64Data Interface:**

```typescript
interface Base64Data {
  data: string;        // Base64 encoded string
  mimeType: string;    // MIME type (e.g., 'image/jpeg')
  fileName: string;    // Original filename
  size: number;        // File size in bytes
  timestamp: number;   // Encoding timestamp
}
```

**Firestore Document Structure:**

```javascript
{
  // Regular fields
  title: "Example Resource",
  description: "Description text",
  category: "Computer Science",
  
  // Base64 files stored in 'files' object
  files: {
    resource: {
      data: "base64EncodedString...",
      mimeType: "application/pdf",
      fileName: "document.pdf",
      size: 1024000,
      timestamp: 1738281600000
    },
    image: { /* Base64Data */ },
    video: { /* Base64Data */ }
  },
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Usage Examples

### Academic Resources (PDF, DOCX, Images, Videos)

```typescript
// Upload a resource
const file = event.target.files[0];
const base64Data = await fileToBase64(file);

await addAcademicResource({
  title: "Computer Science Notes",
  description: "CS101 comprehensive notes",
  category: "Computer Science",
  fileData: base64Data,
  uploadedBy: "admin@example.com"
});

// Download a resource
const { files } = await getDocumentWithBase64('academic_resources', resourceId);
if (files?.resource) {
  downloadBase64File(files.resource);
}
```

### Lost and Found Items (Images)

```typescript
// Upload an item with image
const imageFile = event.target.files[0];
const imageData = await fileToBase64(imageFile);

await addLostAndFoundItem({
  title: "Lost Laptop",
  description: "Dell XPS 15 found in library",
  category: "Electronics",
  imageData: imageData
});
```

### Events (Images + Videos)

```typescript
// Upload an event with image and video
const imageData = selectedImageFile ? await fileToBase64(selectedImageFile) : undefined;
const videoData = selectedVideoFile ? await fileToBase64(selectedVideoFile) : undefined;

await addEvent({
  title: "Tech Conference 2026",
  content: "Annual technology conference",
  imageData: imageData,
  videoData: videoData,
  isPublished: true
});
```

### User Profile Pictures

```typescript
// Upload profile picture
const photoFile = event.target.files[0];
const photoData = await fileToBase64(photoFile);

await updateUserProfilePicture(userId, photoData);
```

## File Size Recommendations

| File Type | Max Size | Compression | Collection |
|-----------|----------|-------------|------------|
| Images | 10 MB | Recommended | All |
| Videos | 50 MB | Optional | Events |
| Documents | 25 MB | N/A | Academic Resources |
| Profile Photos | 5 MB | Recommended | Users |

## Performance Optimization

### 1. Image Compression

```typescript
// Compress before encoding
const compressedFile = await compressImage(
  originalFile,
  1920,  // maxWidth
  1080,  // maxHeight
  0.8    // quality (0-1)
);
const base64Data = await fileToBase64(compressedFile);
```

### 2. Thumbnail Generation

```typescript
// Create thumbnail for preview
const thumbnail = await createThumbnail(
  imageFile,
  200,  // maxWidth
  200   // maxHeight
);
```

### 3. Chunking Large Files

```typescript
// For very large files (>10MB)
const chunks = chunkBase64(base64String, 1024 * 1024); // 1MB chunks
// Store chunks separately and reassemble when needed
const reassembled = reassembleBase64Chunks(chunks);
```

## Advantages of Base64 Storage

1. **Unified Storage**: All data in Firestore, no separate storage bucket needed
2. **Simplified Queries**: Query files along with metadata in single operation
3. **Offline Support**: Better offline functionality with Firestore
4. **Real-time Sync**: Automatic real-time updates with Firestore listeners
5. **Security**: Firestore security rules apply to all data
6. **Cost Efficiency**: No additional storage costs (within Firestore limits)

## Limitations & Considerations

1. **Document Size**: Firestore documents limited to 1MB (use chunking for larger files)
2. **Read/Write Costs**: Each document read/write has associated costs
3. **Bandwidth**: Base64 strings are ~33% larger than binary
4. **Best For**: Small to medium files (<10MB)

## Migration from Firebase Storage

If you have existing files in Firebase Storage, migrate them:

```typescript
// 1. Download from Storage
const url = await getFileURL(storagePath);
const response = await fetch(url);
const blob = await response.blob();

// 2. Convert to Base64
const file = new File([blob], fileName, { type: mimeType });
const base64Data = await fileToBase64(file);

// 3. Store in Firestore
await addDocumentWithBase64(collectionName, data, { file: base64Data });
```

## Error Handling

```typescript
try {
  const base64Data = await fileToBase64(file);
  await addAcademicResource({ ...data, fileData: base64Data });
  toast.success('File uploaded successfully');
} catch (error) {
  console.error('Upload failed:', error);
  toast.error('Failed to upload: ' + error.message);
}
```

## Testing

Test the implementation:

1. Upload different file types (images, videos, PDFs)
2. Verify file size validation
3. Test download functionality
4. Check compression quality
5. Verify Firestore document structure
6. Test real-time updates

## Support & Maintenance

- Base64 utilities are fully typed with TypeScript
- All functions include JSDoc comments
- Error handling included in all operations
- Toast notifications for user feedback
- Loading states during upload/download

---

## Quick Start Checklist

- [x] Base64 utility functions created
- [x] Firestore helpers with Base64 support
- [x] Academic Resources with file upload
- [x] Lost & Found with image upload
- [x] Events with image/video upload
- [x] Users with profile picture upload
- [x] File validation and compression
- [x] Download functionality
- [x] Error handling and user feedback

Your application now has a complete, optimized Base64 file storage system! 🚀
