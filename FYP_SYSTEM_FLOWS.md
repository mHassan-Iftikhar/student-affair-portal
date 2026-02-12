# System Flow Documentation: Student Affair Portal

This document explains the core technical flows of the application, designed for FYP viva preparation.

## 1. Authentication & Authorization Flow

The system uses a hybrid approach: **Firebase Auth** for identity and a **Custom Admin Node.js Backend** for role verification.

```mermaid
sequenceDiagram
    participant User as Admin User (Frontend)
    participant Firebase as Firebase Auth
    participant API as Node.js Backend
    participant DB as MongoDB

    User->>Firebase: Login with Email/Password
    Firebase-->>User: ID Token (JWT)
    User->>API: POST /api/auth/verify-admin (Authorization: Bearer <token>)
    API->>Firebase: firebaseAdmin.auth().verifyIdToken(token)
    Firebase-->>API: Decoded Token (UID, Email)
    API->>DB: Find User by UID/Email (Check isAdmin: true)
    DB-->>API: User Record
    API-->>User: 200 OK + Session Established
```

## 2. Push Notification Flow (FCM)

Administrators can send notifications to specific users or broadcast to everyone.

```mermaid
sequenceDiagram
    participant Admin as Admin Portal
    participant API as Node.js Backend
    participant DB as MongoDB
    participant FCM as Firebase Cloud Messaging
    participant Student as Student Mobile App

    Admin->>API: POST /api/notifications (Title, Body, Target)
    API->>DB: Get Target User Device Tokens
    DB-->>API: Tokens List
    API->>FCM: messaging().sendMulticast(message)
    FCM->>Student: Push Notification Received
    API->>DB: Save Notification Log
    API-->>Admin: Success Response
```

## 3. Base64 File Storage Flow (Firestore)

A unique feature of this project is storing files directly in Firestore as Base64 strings, bypassing traditional "Storage Buckets" for university-scale assets.

```mermaid
graph TD
    A[Select File] --> B{Check Size}
    B -- "> 50MB" --> C[Reject: File too large]
    B -- "< 50MB" --> D[FileReader.readAsDataURL]
    D --> E[Base64 Encoded String]
    E --> F[POST Request to API]
    F --> G[Firestore Collection]
    G --> H[Stored as Field: 'fileData']
```

## 4. Activity Logging Flow

To ensure accountability, every administrative action (Create, Update, Delete) is logged.

```mermaid
graph LR
    A[Admin Action] --> B[API Middleware: activityLogger]
    B --> C[Execute Request]
    C --> D[Log Action to MongoDB]
    D --> E[(Logs Collection)]
    E --> F[Dashboard: View Activity History]
```

## 5. CRUD Operation Flow (Example: Educational Resources)

1. **Frontend**: Admin fills form (Resource name, category, file).
2. **Preprocessing**: File is converted to Base64.
3. **Backend**: Validator checks input schema.
4. **Processing**: `activityLogger` records the "Create Resource" action.
5. **Storage**: Data is saved to the `academic_resources` collection in Firestore.
6. **Confirmation**: Reached user via Toast notification.
7. Firestore Collection Schemas

The following schemas define the data structure for each collection in Firestore:

### `users` Collection

```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "degree": "string",
  "semester": "string",
  "gender": "string",
  "profileImageBase64": "string",
  "fcmToken": "string",
  "isProfileCompleted": "boolean",
  "createdAt": "serverTimestamp"
}
```

### `lostNfound` Collection

```json
{
  "title": "string",
  "reportType": "string",
  "description": "string",
  "date": "string",
  "time": "string",
  "imageUrl": "string",
  "isClaimed": "boolean",
  "createdBy": "string",
  "createdAt": "string",
  "claimedBy": "string",
  "claimedAt": "string"
}
```

### `Events` Collection

```json
{
  "title": "string",
  "date": "string",
  "time": "string",
  "location": "string",
  "image": "string",
  "category": "string",
  "createdAt": "string"
}
```

### `academic_resources` Collection

```json
{
  "title": "string",
  "semester": "string",
  "subject": "string",
  "resourceType": "string",
  "fileName": "string",
  "fileType": "string",
  "fileSize": "string",
  "fileBase64": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### `groups` Collection (Group Chat only)

```json
{
  "name": "string",
  "description": "string",
  "coverImage": "string",
  "category": "string",
  "icon": "IconData",
  "iconColor": "Color",
  "createdAt": "serverTimestamp",
  "membersCount": "int"
}
```
