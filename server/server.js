import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env FIRST before any other imports that use env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';
import { initializeFirebase } from './config/firebase.js';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import storyRoutes from './routes/stories.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import logRoutes from './routes/logs.js';
import dashboardRoutes from './routes/dashboard.js';
import firebaseRoutes from './routes/firebase.js';
import contentModerationRoutes from './routes/contentModeration.js';
import { errorHandler } from './middleware/errorHandler.js';
import { activityLogger } from './middleware/activityLogger.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database and Firebase
await connectDB();
await initializeFirebase();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Activity logging middleware
app.use(activityLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/content-moderation', contentModerationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});