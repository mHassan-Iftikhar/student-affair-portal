import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Story from '../models/Story.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeItems,
      totalStories,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      Item.countDocuments({ isActive: true }),
      Story.countDocuments(),
      ActivityLog.find()
        .populate('adminId', 'email displayName')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const stats = {
      totalUsers,
      activeItems,
      pendingReports: 0, // Placeholder - implement based on your report system
      totalStories,
      recentActivity
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;