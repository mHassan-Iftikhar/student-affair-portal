import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ adminId: 1 });
activityLogSchema.index({ action: 1, resource: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);