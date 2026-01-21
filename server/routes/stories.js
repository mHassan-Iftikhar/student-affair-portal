import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import Story from '../models/Story.js';

const router = express.Router();

router.use(authenticateToken);

// Get all stories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, published } = req.query;
    const query = {};

    if (published !== undefined) {
      query.isPublished = published === 'true';
    }

    const stories = await Story.find(query)
      .populate('createdBy', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Story.countDocuments(query);

    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single story
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('createdBy', 'email displayName');
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    res.json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create story
router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const story = new Story({
      ...req.body,
      createdBy: req.user._id,
      publishedAt: req.body.isPublished ? new Date() : null
    });

    await story.save();
    await story.populate('createdBy', 'email displayName');
    
    res.status(201).json(story);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update story
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
  body('content').optional().trim().isLength({ min: 1 }).withMessage('Content cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };
    
    // Handle publish status change
    if (req.body.isPublished !== undefined) {
      updateData.publishedAt = req.body.isPublished ? new Date() : null;
    }

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'email displayName');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    res.json(story);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete story
router.delete('/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;