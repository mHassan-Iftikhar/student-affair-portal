import admin from 'firebase-admin';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const initializeFirebase = async () => {
  try {
    let serviceAccount;

    // Try to load from file path first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
        console.log('✓ Loaded Firebase service account from file');
      }
    }

    // Fall back to environment variable JSON string
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✓ Loaded Firebase service account from environment variable');
    }

    // Check if we have valid credentials
    if (!serviceAccount || !serviceAccount.project_id) {
      console.warn('⚠️  Firebase service account not configured. Firebase features will be disabled.');
      return null;
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    return admin;

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return null;
  }
};

// Export admin for use in other modules
export { admin };

// Export helper functions for common Firebase operations
export const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
};

export const getFirestore = () => {
  return admin.firestore();
};

export const getAuth = () => {
  return admin.auth();
};

export const getStorage = () => {
  return admin.storage();
};