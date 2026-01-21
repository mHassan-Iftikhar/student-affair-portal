'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { AuthContextType } from '../types';
import { logLogin, logLogout } from '../utils/auditLogger';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Development mode bypass
  const isDevelopment = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  useEffect(() => {
    // Development mode - auto login
    if (isDevelopment) {
      const mockUser = {
        uid: 'dev-admin-123',
        email: 'admin@dev.local',
        displayName: 'Dev Admin',
        photoURL: null
      } as User;
      
      setUser(mockUser);
      setToken('dev-token-123');
      localStorage.setItem('adminToken', 'dev-token-123');
      // Set cookie for middleware
      document.cookie = 'adminToken=dev-token-123; path=/; max-age=86400';
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setUser(user);
          setToken(idToken);
          localStorage.setItem('adminToken', idToken);
          
          // Optional: Try to verify admin status with backend (non-blocking)
          try {
            const response = await api.post('/auth/verify-admin', {
              idToken,
            }, {
              headers: {
                'X-Silent-Error': 'true'
              }
            });
            
            if (response.data.token) {
              setToken(response.data.token);
              localStorage.setItem('adminToken', response.data.token);
            }
          } catch (error) {
            // Backend verification failed, but continue with Firebase auth (silently)
            // This is expected when backend is not running
          }
        } catch (error) {
          console.error('Failed to get Firebase token:', error);
          setUser(null);
          setToken(null);
          localStorage.removeItem('adminToken');
          document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('adminToken');
        document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Development mode bypass
      if (isDevelopment) {
        if (email === 'admin@dev.local' && password === 'admin123') {
          toast.success('Development login successful');
          return;
        } else {
          toast.error('Use admin@dev.local / admin123 for development');
          throw new Error('Invalid development credentials');
        }
      }

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Log the login action to Firebase audit logs
        await logLogin(
          { uid: userCredential.user.uid, email: userCredential.user.email || email },
          { method: 'email_password', timestamp: new Date().toISOString() }
        );
        toast.success('Login successful! Redirecting...');
      }
    } catch (error: any) {
      // Handle Firebase auth errors with specific messages
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '❌ No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = '❌ Incorrect password. Please try again';
          break;
        case 'auth/invalid-email':
          errorMessage = '❌ Invalid email address format';
          break;
        case 'auth/user-disabled':
          errorMessage = '❌ This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = '⚠️ Too many failed login attempts. Please try again later';
          break;
        case 'auth/invalid-credential':
          errorMessage = '❌ Invalid email or password';
          break;
        case 'auth/network-request-failed':
          errorMessage = '🌐 Network error. Please check your connection';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = '❌ Email/password sign-in is not enabled';
          break;
        case 'auth/weak-password':
          errorMessage = '❌ Password is too weak';
          break;
        default:
          if (error.message) {
            errorMessage = `❌ ${error.message}`;
          }
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
      
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (isDevelopment) {
        // Log logout for dev mode
        await logLogout(
          { uid: 'dev-admin-123', email: 'admin@dev.local' },
          { method: 'dev_mode' }
        );
        setUser(null);
        setToken(null);
        localStorage.removeItem('adminToken');
        // Clear cookie
        document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        toast.success('Logged out successfully');
        window.location.href = '/login';
        return;
      }

      // Log the logout action before signing out
      if (user) {
        await logLogout(
          { uid: user.uid, email: user.email || 'unknown' },
          { timestamp: new Date().toISOString() }
        );
      }

      await signOut(auth);
      // Clear cookie
      document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};