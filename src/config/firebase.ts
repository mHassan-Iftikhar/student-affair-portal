import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Check if we're in development mode without Firebase config
const isDevelopmentMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let messaging: Messaging | undefined;

// Initialize Firebase only on client side
// Always try to initialize if config exists, even in development mode
if (typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    // Check if Firebase app already exists to avoid re-initialization
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      // If app already exists, get the existing app
      if (error.code === 'app/duplicate-app') {
        const { getApps } = require('firebase/app');
        const apps = getApps();
        app = apps[0];
      } else {
        throw error;
      }
    }

    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      
      // Initialize messaging only if supported (not available in all browsers)
      isSupported().then((supported) => {
        if (supported && app) {
          messaging = getMessaging(app);
          console.log('✅ Firebase Messaging initialized');
        }
      }).catch((error) => {
        console.warn('⚠️  Firebase Messaging not supported:', error);
      });

      console.log('✅ Firebase initialized successfully');
      console.log(`   Project: ${firebaseConfig.projectId}`);
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    if (!isDevelopmentMode) {
      console.warn('Firebase initialization failed. Some features may not work.');
    }
  }
} else {
  if (typeof window === 'undefined') {
    // Server-side rendering - Firebase will initialize on client side
    // Do nothing here
  } else if (isDevelopmentMode) {
    console.info('ℹ️  Running in development mode without Firebase configuration.');
    console.info('   To enable Firebase, add your credentials to the .env.local file.');
  } else {
    console.warn('⚠️  Firebase configuration is missing. Please check your environment variables.');
  }
}

// Export Firebase services
export { app, auth, db, storage, messaging };

// Export convenience functions
export const isFirebaseConfigured = () => !!app;

/**
 * Initialize Firebase if not already initialized (lazy initialization)
 * This is useful for client-side components that need to ensure Firebase is ready
 */
export const ensureFirebaseInitialized = (): boolean => {
  // Only run on client side
  if (typeof window === 'undefined') {
    return false;
  }

  // If already initialized, return true
  if (app && db) {
    return true;
  }

  // Try to initialize if config exists
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
      // Check if Firebase app already exists to avoid re-initialization
      try {
        app = initializeApp(firebaseConfig);
      } catch (error: any) {
        // If app already exists, get the existing app
        if (error.code === 'app/duplicate-app') {
          const { getApps } = require('firebase/app');
          const apps = getApps();
          app = apps[0];
        } else {
          throw error;
        }
      }

      if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log('✅ Firebase initialized (lazy)');
        return true;
      }
    } catch (error) {
      console.error('❌ Firebase lazy initialization failed:', error);
      return false;
    }
  }

  return false;
};

export default app;