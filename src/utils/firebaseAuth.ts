import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with display name if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
};

/**
 * Sign in an existing user with email and password
 */
export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

/**
 * Sign out the current user
 */
export const logout = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  await signOut(auth);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  await sendPasswordResetEmail(auth, email);
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (user: User): Promise<void> => {
  await sendEmailVerification(user);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (user: User, profile: { displayName?: string; photoURL?: string }): Promise<void> => {
  await updateProfile(user, profile);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
};

/**
 * Get Firebase ID token for API requests
 */
export const getIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) {
    return null;
  }

  return await auth.currentUser.getIdToken();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!auth?.currentUser;
};
