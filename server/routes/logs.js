import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

router.use(authenticateToken);

// Get all activity logs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, resource, adminId } = req.query;
    const query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (adminId) query.adminId = adminId;

    const logs = await ActivityLog.find(query)
      .populate('adminId', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments(query);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get logs for specific resource
router.get('/resource/:resource/:resourceId', async (req, res) => {
  try {
    const { resource, resourceId } = req.params;
    
    const logs = await ActivityLog.find({
      resource: resource.toUpperCase(),
      resourceId
    })
      .populate('adminId', 'email displayName')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;