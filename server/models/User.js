import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    default: ''
  },
  photoURL: {
    type: String,
    default: ''
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ uid: 1 });

export default mongoose.model('User', userSchema);