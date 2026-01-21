import { admin } from '../config/firebase.js';

/**
 * Middleware to verify Firebase ID tokens
 * Use this to protect routes that require authentication
 */
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be in format: Bearer <token>'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Verify the token with Firebase Admin
    if (!admin) {
      console.warn('Firebase Admin not initialized. Skipping token verification.');
      return res.status(503).json({
        success: false,
        message: 'Authentication service unavailable'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebaseUser: decodedToken
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Middleware to optionally verify token (doesn't fail if no token)
 * Use this for routes that work for both authenticated and unauthenticated users
 */
export const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      req.user = null;
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!admin) {
      req.user = null;
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebaseUser: decodedToken
    };

    next();
  } catch (error) {
    // Token verification failed, but that's okay for optional auth
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user has specific custom claims/roles
 */
export const checkUserRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!admin) {
        console.warn('Firebase Admin not initialized. Cannot check roles.');
        return next();
      }

      // Get user's custom claims
      const userRecord = await admin.auth().getUser(req.user.uid);
      const customClaims = userRecord.customClaims || {};

      // Check if user has required role
      const hasRole = allowedRoles.some(role => customClaims[role] === true);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: allowedRoles
        });
      }

      req.user.roles = customClaims;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user permissions',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

export default {
  verifyFirebaseToken,
  optionalFirebaseAuth,
  checkUserRole,
  requireEmailVerified
};
