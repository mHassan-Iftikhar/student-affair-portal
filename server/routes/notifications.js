import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { admin } from '../config/firebase.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const router = express.Router();

router.use(authenticateToken);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('sentBy', 'email displayName')
      .populate('targetUsers', 'email displayName')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send notification
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  body('targetUsers').optional().isArray().withMessage('Target users must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, targetUsers = [] } = req.body;

    // Create notification record
    const notification = new Notification({
      title,
      message,
      targetUsers: targetUsers.length > 0 ? targetUsers : [],
      sentBy: req.user._id
    });

    await notification.save();

    // Send push notifications
    try {
      let tokens = [];
      
      if (targetUsers.length === 0) {
        // Send to all users with FCM tokens
        const users = await User.find({ fcmToken: { $exists: true, $ne: null } });
        tokens = users.map(user => user.fcmToken).filter(Boolean);
      } else {
        // Send to specific users
        const users = await User.find({ _id: { $in: targetUsers }, fcmToken: { $exists: true, $ne: null } });
        tokens = users.map(user => user.fcmToken).filter(Boolean);
      }

      if (tokens.length > 0) {
        const payload = {
          notification: {
            title,
            body: message,
          },
          data: {
            type: 'admin_notification',
            timestamp: new Date().toISOString()
          }
        };

        const response = await admin.messaging().sendMulticast({
          tokens,
          ...payload
        });

        notification.deliveryCount = response.successCount;
        notification.failureCount = response.failureCount;
        await notification.save();
      }
    } catch (fcmError) {
      console.error('FCM Error:', fcmError);
      // Continue even if push notification fails
    }

    await notification.populate('sentBy', 'email displayName');
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;