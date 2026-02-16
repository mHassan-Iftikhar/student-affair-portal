export interface User {
  _id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Item {
  imageLink: string | undefined;
  _id: string;
  id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  reportType?: string;
}

export interface Story {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  category?: string;
  date?: string;
  time?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  targetUsers: string[];
  sentAt: string;
  deliveryCount: number;
}

export interface ActivityLog {
  _id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeItems: number;
  pendingReports: number;
  totalStories: number;
  recentActivity: ActivityLog[];
}

export interface AuthContextType {
  user: any;
  token: string | null;
  department: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
