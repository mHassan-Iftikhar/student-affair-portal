import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.use(authenticateToken);

// Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, blocked, search } = req.query;
    const query = {};

    if (blocked !== undefined) {
      query.isBlocked = blocked === 'true';
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-uid -fcmToken') // Don't expose sensitive data
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-uid -fcmToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user block status
router.put('/:id/toggle-block', async (req, res) => {
  try {
    const { isBlocked } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow blocking admin users
    if (user.isAdmin && isBlocked) {
      return res.status(400).json({ message: 'Cannot block admin users' });
    }

    user.isBlocked = isBlocked;
    await user.save();

    res.json({ 
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;