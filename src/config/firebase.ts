import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Check if we're in development mode without Firebase config
const isDevelopmentMode = import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let messaging: Messaging | undefined;

// Only initialize Firebase if we have the required config
if (!isDevelopmentMode) {
  try {
    // Validate required config
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase configuration is incomplete. Please check your .env file.');
    }

    app = initializeApp(firebaseConfig);
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
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.warn('Running in development mode without Firebase.');
  }
} else {
  console.info('ℹ️  Running in development mode without Firebase configuration.');
  console.info('   To enable Firebase, add your credentials to the .env file.');
}

// Export Firebase services
export { app, auth, db, storage, messaging };

// Export convenience functions
export const isFirebaseConfigured = () => !!app;

export default app;