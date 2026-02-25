# How to Download a PDF in the Admin Portal

This guide explains the exact code and steps to download a PDF file from Firestore (stored as Base64) in the Academic Resources section of your project.

---

## 1. Utility Function: downloadBase64File

Located in: `src/utils/base64Utils.ts`

```ts
export const downloadBase64File = (base64Data: Base64Data): void => {
  const dataURL = base64ToDataURL(base64Data);
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = base64Data.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

---

## 2. Download Handler Example

Located in: `src/app/(protected)/academic-resources/page.tsx`

```tsx
import { getDocumentWithBase64 } from '../../../utils/firestore';
import { downloadBase64File } from '../../../utils/base64Utils';

const handleDownload = async (resource: Resource) => {
  try {
    // Fetch the document and its files from Firestore
    const { files } = await getDocumentWithBase64(
      'academic_resources',
      resource.id || resource._id || ''
    );
    if (files?.resource) {
      downloadBase64File(files.resource);
      toast.success('Download started');
      return;
    }
    // Fallback for old format
    if (resource.fileBase64) {
      downloadBase64File({
        data: resource.fileBase64,
        fileName: resource.fileName,
        mimeType: resource.fileType,
        size: 0,
        timestamp: Date.now(),
      });
      toast.success('Download started');
      return;
    }
    // Fallback to URL
    if (resource.fileUrl) {
      window.open(resource.fileUrl, '_blank');
    } else {
      toast.error('File not available for download');
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.error('Failed to download file');
  }
};
```

---

## 3. Usage in Table Actions

```tsx
<button
  onClick={() => handleDownload(resource)}
  className="text-green-600 hover:text-green-900"
  title="Download"
>
  <Download className="h-4 w-4" />
</button>
```

---

## 4. Summary
- The PDF is fetched as Base64 from Firestore.
- The utility converts it to a downloadable file in the browser.
- Works for any file type stored as Base64.

---

**Files involved:**
- `src/app/(protected)/academic-resources/page.tsx`
- `src/utils/firestore.ts`
- `src/utils/base64Utils.ts`

---

**This is the exact code and flow for downloading a PDF in your portal.**
