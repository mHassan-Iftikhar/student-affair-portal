# Utils Folder Overview

This document describes the purpose and role of each file in the `src/utils` directory of your project.

---

## File Descriptions

### 1. `api.ts`
- Handles HTTP requests to external APIs or backend services.
- Centralizes API call logic for the frontend, making it easier to manage and reuse.

### 2. `auditLogger.ts`
- Provides functions to log user actions or system events.
- Useful for tracking activity, auditing, and debugging.

### 3. `base64Utils.ts`
- Contains utilities for encoding and decoding data in Base64 format.
- Often used for file uploads or secure data transfer.

### 4. `firebaseAuth.ts`
- Manages authentication logic using Firebase.
- Handles sign-in, sign-out, and user state management.

### 5. `firebaseStorage.ts`
- Handles file uploads, downloads, and storage operations with Firebase Storage.

### 6. `firestore.ts`
- Provides functions to interact with Firestore (Firebase’s NoSQL database).
- Includes reading, writing, and updating documents.

---

## How These Files Help
- **Encapsulation:** Common logic is separated into utilities, making code cleaner and easier to maintain.
- **Reusability:** Functions can be reused across different parts of the application.
- **Maintainability:** Centralized logic means updates or bug fixes are easier to implement.

---

This structure helps keep your codebase organized and efficient.
