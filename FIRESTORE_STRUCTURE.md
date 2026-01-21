# Firestore Data Structure Examples

This document shows the actual structure of documents stored in Firestore with Base64 encoded files.

## Collection: `academic_resources`

```javascript
{
  // Document ID: auto-generated
  
  // Metadata
  "title": "Computer Science Study Guide",
  "description": "Comprehensive notes for CS101",
  "category": "Computer Science",
  "uploadedBy": "admin@example.com",
  
  // Base64 encoded file(s)
  "files": {
    "resource": {
      "data": "JVBERi0xLjQKJeLjz9MNCjEgMCBvYmoK...", // Truncated Base64 string
      "mimeType": "application/pdf",
      "fileName": "cs-study-guide.pdf",
      "size": 2458624,                    // 2.4 MB in bytes
      "timestamp": 1738281600000           // Unix timestamp
    }
  },
  
  // Timestamps (auto-generated)
  "createdAt": Timestamp(seconds=1738281600, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281600, nanoseconds=0)
}
```

## Collection: `lostNfound`

```javascript
{
  // Lost and Found Item
  
  "title": "Lost Laptop",
  "description": "Dell XPS 15 found in library",
  "category": "Electronics",
  "price": 0,
  "isActive": true,
  
  // Image stored as Base64
  "files": {
    "image": {
      "data": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAE...", // Base64 image data
      "mimeType": "image/jpeg",
      "fileName": "laptop-photo.jpg",
      "size": 1048576,                     // 1 MB
      "timestamp": 1738281650000
    }
  },
  
  "createdAt": Timestamp(seconds=1738281650, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281650, nanoseconds=0)
}
```

## Collection: `events`

```javascript
{
  // Event/Story with Image and Video
  
  "title": "Tech Conference 2026",
  "content": "Annual technology conference featuring AI innovations...",
  "isPublished": true,
  
  // Multiple files (image + video)
  "files": {
    "image": {
      "data": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      "mimeType": "image/png",
      "fileName": "conference-banner.png",
      "size": 524288,                      // 512 KB
      "timestamp": 1738281700000
    },
    "video": {
      "data": "AAAAIGZ0eXBpc29tAAACAGlzb21...",
      "mimeType": "video/mp4",
      "fileName": "conference-highlights.mp4",
      "size": 52428800,                    // 50 MB
      "timestamp": 1738281750000
    }
  },
  
  "createdAt": Timestamp(seconds=1738281700, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281750, nanoseconds=0)
}
```

## Collection: `groups`

```javascript
{
  // Group Information
  
  "name": "Computer Science Club",
  "description": "A community for CS enthusiasts",
  "memberCount": 45,
  "isActive": true,
  
  // Group image/logo
  "files": {
    "image": {
      "data": "iVBORw0KGgoAAAANSUhEUgAABAA...",
      "mimeType": "image/png",
      "fileName": "cs-club-logo.png",
      "size": 204800,                      // 200 KB
      "timestamp": 1738281800000
    }
  },
  
  "createdAt": Timestamp(seconds=1738281800, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281800, nanoseconds=0)
}
```

## Collection: `users`

```javascript
{
  // User Profile
  
  "uid": "firebase-uid-here",
  "email": "user@example.com",
  "displayName": "John Doe",
  "isBlocked": false,
  "isAdmin": false,
  "lastLoginAt": Timestamp(seconds=1738281850, nanoseconds=0),
  
  // Profile picture
  "files": {
    "profilePicture": {
      "data": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
      "mimeType": "image/jpeg",
      "fileName": "profile-pic.jpg",
      "size": 307200,                      // 300 KB
      "timestamp": 1738281900000
    }
  },
  
  "createdAt": Timestamp(seconds=1738280000, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281900, nanoseconds=0)
}
```

## Document Without Files

If no file is uploaded, the `files` field is simply omitted:

```javascript
{
  "title": "Text-only Resource",
  "description": "This resource has no files attached",
  "category": "Notes",
  
  // No files field
  
  "createdAt": Timestamp(seconds=1738281950, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738281950, nanoseconds=0)
}
```

## Multiple Files Pattern

For documents with multiple file types:

```javascript
{
  "title": "Multimedia Resource",
  
  "files": {
    // Main document
    "document": {
      "data": "JVBERi0xLjQKJeLjz9...",
      "mimeType": "application/pdf",
      "fileName": "main-doc.pdf",
      "size": 1048576,
      "timestamp": 1738282000000
    },
    
    // Cover image
    "coverImage": {
      "data": "iVBORw0KGgoAAAA...",
      "mimeType": "image/png",
      "fileName": "cover.png",
      "size": 204800,
      "timestamp": 1738282050000
    },
    
    // Thumbnail
    "thumbnail": {
      "data": "/9j/4AAQSkZJRg...",
      "mimeType": "image/jpeg",
      "fileName": "thumb.jpg",
      "size": 51200,                       // 50 KB
      "timestamp": 1738282100000
    }
  },
  
  "createdAt": Timestamp(seconds=1738282000, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1738282100, nanoseconds=0)
}
```

## Base64 String Format

The `data` field contains a pure Base64 string (without data URL prefix):

```javascript
// ✅ Correct format (stored in Firestore)
"data": "JVBERi0xLjQKJeLjz9MNCjEgMCBvYmoK..."

// ❌ Wrong format (includes data URL prefix)
"data": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9..."
```

To display in HTML, convert to data URL:

```typescript
import { base64ToDataURL } from '../utils/base64Utils';

const dataUrl = base64ToDataURL(base64Data);
// Returns: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9..."
```

## Size Considerations

### Firestore Document Limits

- **Maximum document size**: 1 MB (1,048,576 bytes)
- **Base64 overhead**: ~33% larger than original
- **Practical file size limit**: ~750 KB per file in document

### For Larger Files

Use chunking strategy:

```javascript
// Main document
{
  "id": "doc-123",
  "title": "Large Video",
  "totalChunks": 50,
  "chunkSize": 1048576,                  // 1 MB per chunk
  "totalSize": 52428800,                 // 50 MB total
  "mimeType": "video/mp4",
  "fileName": "large-video.mp4"
}

// Chunk documents
{
  "id": "doc-123-chunk-0",
  "parentId": "doc-123",
  "chunkIndex": 0,
  "data": "AAAAIGZ0eXBpc29tAAACAG..."
}
// ... more chunks
```

## Querying Examples

### Get all documents with files

```typescript
const docs = await getDocuments('academic_resources');
docs.forEach(doc => {
  if (doc.files?.resource) {
    console.log(`File: ${doc.files.resource.fileName}`);
    console.log(`Size: ${formatFileSize(doc.files.resource.size)}`);
  }
});
```

### Filter by file type

```typescript
const images = await getDocuments('lostNfound');
const itemsWithImages = images.filter(item => 
  item.files?.image?.mimeType.startsWith('image/')
);
```

### Get document with files

```typescript
const { document, files } = await getDocumentWithBase64('events', eventId);
if (files?.video) {
  // Play video
  const videoUrl = base64ToDataURL(files.video);
  videoElement.src = videoUrl;
}
```

## Storage Calculation

### Example: 100 Resources

```
Average file size: 2 MB
Base64 overhead: +33%
Storage per file: 2.66 MB

100 files = 266 MB in Firestore
Firestore pricing: ~$0.18/GB/month
Monthly cost: ~$0.05

Compare to Firebase Storage:
100 files = 200 MB
Storage pricing: ~$0.026/GB/month
Monthly cost: ~$0.005

Base64 is ~10x more expensive for storage,
but provides unified storage and better querying.
```

## Best Practices

1. **Use Base64 for**: Small files (<5 MB), profile pictures, thumbnails
2. **Avoid Base64 for**: Very large files (>10 MB), bulk uploads
3. **Compress images** before encoding
4. **Generate thumbnails** for display
5. **Cache decoded files** in memory when possible
6. **Use appropriate file size limits** per collection
7. **Monitor Firestore usage** and costs

---

## Data Migration Script

If you have existing URLs in Firestore, migrate to Base64:

```typescript
const migrateToBase64 = async (collectionName: string) => {
  const docs = await getDocuments(collectionName);
  
  for (const doc of docs) {
    if (doc.fileUrl) {
      // Download from URL
      const response = await fetch(doc.fileUrl);
      const blob = await response.blob();
      const file = new File([blob], doc.fileName, { type: doc.fileType });
      
      // Convert to Base64
      const base64Data = await fileToBase64(file);
      
      // Update document
      await updateDocumentWithBase64(collectionName, doc.id, {}, {
        resource: base64Data
      });
      
      console.log(`Migrated: ${doc.fileName}`);
    }
  }
};

// Run migration
await migrateToBase64('academic_resources');
```

---

This structure ensures efficient storage and retrieval of files in Firestore! 📦
