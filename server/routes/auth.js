import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/verify-admin', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.firebaseUser;

    // Find or create user
    let user = await User.findOne({ uid });
    
    if (!user) {
      user = new User({
        uid,
        email,
        displayName: name || '',
        photoURL: picture || '',
        isAdmin: false // Default to false, must be manually set to true
      });
      await user.save();
    } else {
      // Update user info
      user.displayName = name || user.displayName;
      user.photoURL = picture || user.photoURL;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
        isAdmin: false
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      isAdmin: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
});

export default router;