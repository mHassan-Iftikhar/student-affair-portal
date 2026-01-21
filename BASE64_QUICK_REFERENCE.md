# Base64 Encoding - Quick Reference Guide

## Import Statements

```typescript
// Base64 utilities
import {
  fileToBase64,
  base64ToDataURL,
  downloadBase64File,
  validateFileType,
  validateFileSize,
  formatFileSize,
  compressImage,
  Base64Data
} from '../utils/base64Utils';

// Firestore operations
import {
  addDocumentWithBase64,
  updateDocumentWithBase64,
  getDocumentWithBase64,
  addAcademicResource,
  addLostAndFoundItem,
  addEvent,
  updateUserProfilePicture
} from '../utils/firestore';
```

## Common Patterns

### Pattern 1: Upload File to Firestore

```typescript
const handleUpload = async (file: File) => {
  // 1. Validate
  const typeCheck = validateFileType(file, ['image/jpeg', 'image/png']);
  if (!typeCheck.valid) {
    toast.error(typeCheck.error);
    return;
  }

  const sizeCheck = validateFileSize(file, 10); // 10MB
  if (!sizeCheck.valid) {
    toast.error(sizeCheck.error);
    return;
  }

  // 2. Convert to Base64
  const base64Data = await fileToBase64(file);

  // 3. Store in Firestore
  await addDocumentWithBase64('collection_name', {
    title: 'My Document',
    description: 'Description'
  }, {
    mainFile: base64Data
  });

  toast.success('Uploaded successfully!');
};
```

### Pattern 2: Display Base64 Image

```typescript
// In your component
const [imageData, setImageData] = useState<Base64Data | null>(null);

// Fetch from Firestore
const { files } = await getDocumentWithBase64('collection', docId);
if (files?.image) {
  setImageData(files.image);
}

// Display
{imageData && (
  <img 
    src={base64ToDataURL(imageData)} 
    alt="Preview"
    className="h-32 w-32 object-cover rounded"
  />
)}
```

### Pattern 3: Download File

```typescript
const handleDownload = async (docId: string) => {
  const { files } = await getDocumentWithBase64('collection', docId);
  if (files?.document) {
    downloadBase64File(files.document);
    toast.success('Download started');
  }
};
```

### Pattern 4: File Input with Preview

```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string>('');

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate
  if (!validateFileType(file, ['image/*']).valid) {
    toast.error('Invalid file type');
    return;
  }

  // Set file and create preview
  setSelectedFile(file);
  const reader = new FileReader();
  reader.onloadend = () => {
    setPreviewUrl(reader.result as string);
  };
  reader.readAsDataURL(file);
};

// JSX
<input
  type="file"
  accept="image/*"
  onChange={handleFileChange}
  className="..."
/>
{previewUrl && <img src={previewUrl} alt="Preview" />}
```

### Pattern 5: Image Compression

```typescript
const handleImageUpload = async (file: File) => {
  // Compress large images before encoding
  const compressedFile = await compressImage(
    file,
    1920,  // maxWidth
    1080,  // maxHeight
    0.8    // quality
  );

  const base64Data = await fileToBase64(compressedFile);
  
  // Upload to Firestore
  await addDocumentWithBase64('images', data, { image: base64Data });
};
```

## File Type Configurations

### Images

```typescript
const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const maxSize = 10; // MB
```

### Videos

```typescript
const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
const maxSize = 50; // MB
```

### Documents

```typescript
const docTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const maxSize = 25; // MB
```

## Collection-Specific Examples

### Academic Resources

```typescript
await addAcademicResource({
  title: "Study Guide",
  description: "Comprehensive notes",
  category: "Computer Science",
  fileData: base64Data,
  uploadedBy: "admin@example.com"
});
```

### Lost and Found

```typescript
await addLostAndFoundItem({
  title: "Lost Wallet",
  description: "Black leather wallet",
  category: "Personal Items",
  imageData: base64Data,
  price: 0,
  isActive: true
});
```

### Events

```typescript
await addEvent({
  title: "Tech Conference",
  content: "Annual event",
  imageData: imageBase64,
  videoData: videoBase64,
  isPublished: true
});
```

### Users

```typescript
await updateUserProfilePicture(userId, photoBase64Data);
```

## Error Handling Template

```typescript
const uploadFile = async (file: File) => {
  try {
    // Validation
    const typeValidation = validateFileType(file, allowedTypes);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const sizeValidation = validateFileSize(file, maxSizeMB);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    // Encoding
    const base64Data = await fileToBase64(file);
    
    // Upload
    await addDocumentWithBase64(collection, data, { file: base64Data });
    
    toast.success('Upload successful');
  } catch (error) {
    console.error('Upload failed:', error);
    toast.error('Upload failed: ' + (error as Error).message);
  }
};
```

## State Management Template

```typescript
// Component state
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string>('');
const [uploading, setUploading] = useState(false);

// Reset function
const resetFileState = () => {
  setSelectedFile(null);
  setPreviewUrl('');
  setUploading(false);
};

// Submit function
const handleSubmit = async () => {
  if (!selectedFile) {
    toast.error('Please select a file');
    return;
  }

  setUploading(true);
  try {
    const base64Data = await fileToBase64(selectedFile);
    await addDocumentWithBase64(collection, data, { file: base64Data });
    toast.success('Success!');
    resetFileState();
  } catch (error) {
    toast.error('Failed: ' + (error as Error).message);
  } finally {
    setUploading(false);
  }
};
```

## Form Input Template

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Upload File
  </label>
  <input
    type="file"
    accept="image/jpeg,image/png"
    onChange={handleFileChange}
    className="block w-full text-sm text-gray-500 
      file:mr-4 file:py-2 file:px-4 
      file:rounded-lg file:border-0 
      file:text-sm file:font-semibold 
      file:bg-blue-50 file:text-blue-700 
      hover:file:bg-blue-100"
  />
  <p className="mt-1 text-xs text-gray-500">
    Max size: 10MB. Supported: JPG, PNG
  </p>
  {selectedFile && (
    <div className="mt-2">
      <img 
        src={previewUrl} 
        alt="Preview" 
        className="h-32 w-32 object-cover rounded border"
      />
      <p className="text-xs text-green-600 mt-1">
        {selectedFile.name} ({formatFileSize(selectedFile.size)})
      </p>
    </div>
  )}
</div>
```

## Firestore Query Examples

```typescript
// Get all documents with files
const resources = await getDocuments('academic_resources');

// Filter by category
const filtered = await getDocuments('academic_resources', [
  queryHelpers.where('category', '==', 'Computer Science'),
  queryHelpers.orderBy('createdAt', 'desc')
]);

// Get single document with files
const { document, files } = await getDocumentWithBase64('academic_resources', docId);
```

## Tips & Best Practices

1. **Always validate** before encoding
2. **Compress images** > 1MB
3. **Use thumbnails** for listings
4. **Show file size** to users
5. **Provide loading states** during upload
6. **Handle errors gracefully** with toast notifications
7. **Reset form state** after successful upload
8. **Preview files** before upload
9. **Limit file sizes** appropriately
10. **Use appropriate MIME types** for validation

---

Copy and paste these patterns into your components! 🚀
