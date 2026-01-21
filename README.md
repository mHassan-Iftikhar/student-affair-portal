# Admin Portal - Complete Full Stack Application

A comprehensive admin portal built with React.js frontend and Node.js backend, featuring authentication, CRUD operations, notifications, user management, and activity logging.

## 🚀 Features

### Frontend (React.js)
- **Authentication**: Firebase Auth + JWT token management
- **Dashboard**: Analytics with user, item, and activity statistics
- **Item Management**: Full CRUD operations with file upload support
- **Story Management**: Create, edit, and publish stories
- **Push Notifications**: Send targeted or broadcast notifications via FCM
- **User Management**: Block/unblock users, view user details
- **Activity Logs**: Comprehensive audit trail of admin actions
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **🆕 Base64 File Encoding**: Store files directly in Firestore (images, videos, documents)

### Backend (Node.js + Express)
- **RESTful API**: Well-structured routes and controllers
- **MongoDB Integration**: Using Mongoose ODM
- **Authentication Middleware**: JWT + Firebase Admin SDK
- **Activity Logging**: Automatic logging of all admin actions
- **Push Notifications**: Firebase Cloud Messaging integration
- **Error Handling**: Comprehensive error handling and validation
- **Security**: Helmet, CORS, rate limiting

## ⭐ New: Base64 File Storage

This project now includes a comprehensive Base64 encoding system for storing files in Firestore:

### Supported Collections
- **`academic_resources`** - PDFs, DOCX, images, videos (max 25MB)
- **`lostNfound`** - Images for lost & found items (max 10MB)
- **`events`** - Images and videos for events (max 50MB)
- **`users`** - Profile pictures (max 5MB)
- **`groups`** - Group images (max 10MB)

### Key Features
✅ Universal file support (images, videos, documents)  
✅ Automatic file validation (type & size)  
✅ Image compression and thumbnail generation  
✅ Real-time preview before upload  
✅ Download functionality  
✅ Unified Firestore storage  

### Documentation
- 📖 [Complete Implementation Guide](./BASE64_IMPLEMENTATION.md)
- 🚀 [Quick Reference Guide](./BASE64_QUICK_REFERENCE.md)
- 📊 [Firestore Structure Examples](./FIRESTORE_STRUCTURE.md)
- 📋 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

## 📦 Tech Stack

### Frontend
- React.js 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- React Hook Form for form handling
- React Hot Toast for notifications
- Firebase SDK for authentication
- Chart.js for dashboard analytics
- **🆕 Custom Base64 utilities**

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- Firebase Admin SDK
- JWT for authentication
- Express Validator for input validation
- Helmet for security
- Morgan for logging
- Multer for file uploads

## 🛠 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Firebase project with Authentication and Cloud Messaging enabled

### Backend Setup

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   - Copy `.env.example` to `.env`
   - Fill in your MongoDB URI, JWT secret, and Firebase service account

4. **Firebase Setup**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key and copy the JSON content
   - Paste the entire JSON as a string in `FIREBASE_SERVICE_ACCOUNT`

5. **Start the server**:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   - Copy `.env.example` to `.env.local`
   - Add your Firebase configuration from Firebase Console

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## 🔧 Configuration

### MongoDB Atlas Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Add your IP address to whitelist
4. Create a database user
5. Get the connection string and update `MONGODB_URI`

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Enable Cloud Messaging
4. Get your config and service account key
5. Update environment variables

### Admin User Setup
Since this is an admin portal, you need to manually set users as admins:

1. Sign up a user through Firebase Authentication
2. Connect to your MongoDB database
3. Update the user document to set `isAdmin: true`

```javascript
// In MongoDB shell or compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isAdmin: true } }
)
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/verify-admin` - Verify Firebase token and check admin status

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Stories
- `GET /api/stories` - Get all stories
- `POST /api/stories` - Create new story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story

### Users
- `GET /api/users` - Get all users
- `PUT /api/users/:id/toggle-block` - Block/unblock user

### Notifications
- `GET /api/notifications` - Get notification history
- `POST /api/notifications` - Send new notification

### Logs
- `GET /api/logs` - Get activity logs

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Firebase Integration**: Leverages Firebase Auth for user management
- **Rate Limiting**: Prevents abuse with request limiting
- **Input Validation**: Server-side validation using express-validator
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet.js**: Security headers for Express
- **Activity Logging**: Complete audit trail of admin actions

## 📊 Key Components

### Frontend Components
- `AuthContext`: Global authentication state management
- `Layout`: Consistent layout with sidebar and header
- `Table`: Reusable data table with sorting and pagination
- `Modal`: Flexible modal component for forms and confirmations
- `LoadingSpinner`: Loading states throughout the app

### Backend Middleware
- `authenticateToken`: JWT token verification
- `activityLogger`: Automatic logging of admin actions
- `errorHandler`: Centralized error handling

## 🚀 Deployment

### Backend Deployment
1. Set environment variables on your hosting platform
2. Ensure MongoDB Atlas is accessible
3. Deploy using platforms like Heroku, Railway, or DigitalOcean

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy the `dist` folder to platforms like Netlify, Vercel, or Cloudflare Pages
3. Update API URL in environment variables

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please create an issue in the repository.