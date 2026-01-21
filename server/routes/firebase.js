import express from 'express';
import { verifyFirebaseToken, checkUserRole } from '../middleware/firebaseAuth.js';
import { admin } from '../config/firebase.js';

const router = express.Router();

/**
 * @route   GET /api/firebase/test
 * @desc    Test Firebase integration (no auth required)
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase backend is configured and running',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/firebase/profile
 * @desc    Get current user's Firebase profile
 * @access  Protected
 */
router.get('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime,
        customClaims: userRecord.customClaims || {}
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/firebase/set-role
 * @desc    Set custom claims/roles for a user (admin only)
 * @access  Protected (Admin)
 */
router.post('/set-role', verifyFirebaseToken, checkUserRole(['admin']), async (req, res) => {
  try {
    const { uid, role } = req.body;

    if (!uid || !role) {
      return res.status(400).json({
        success: false,
        message: 'uid and role are required'
      });
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { [role]: true });

    res.json({
      success: true,
      message: `Role '${role}' assigned to user ${uid}`
    });
  } catch (error) {
    console.error('Error setting user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set user role',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/firebase/users
 * @desc    List all users (admin only)
 * @access  Protected (Admin)
 */
router.get('/users', verifyFirebaseToken, checkUserRole(['admin']), async (req, res) => {
  try {
    const { maxResults = 100 } = req.query;
    const listUsersResult = await admin.auth().listUsers(Number(maxResults));

    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime
    }));

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list users',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/firebase/user/:uid
 * @desc    Delete a user (admin only)
 * @access  Protected (Admin)
 */
router.delete('/user/:uid', verifyFirebaseToken, checkUserRole(['admin']), async (req, res) => {
  try {
    const { uid } = req.params;

    await admin.auth().deleteUser(uid);

    res.json({
      success: true,
      message: `User ${uid} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/firebase/send-verification
 * @desc    Send email verification link
 * @access  Protected
 */
router.post('/send-verification', verifyFirebaseToken, async (req, res) => {
  try {
    const actionCodeSettings = {
      url: process.env.EMAIL_VERIFICATION_REDIRECT_URL || 'http://localhost:5173/verify-email',
    };

    const link = await admin.auth().generateEmailVerificationLink(
      req.user.email,
      actionCodeSettings
    );

    res.json({
      success: true,
      message: 'Verification email sent',
      link // In production, send this via email service
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
});

export default router;
