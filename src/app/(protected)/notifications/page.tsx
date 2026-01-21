'use client';

import React, { useState, useEffect } from 'react';
import { Send, Radio, RefreshCw } from 'lucide-react';
import { User } from '../../../types';
import Table from '../../../components/UI/Table';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  addNotification, 
  getNotifications, 
  subscribeToNotifications,
  getDocuments 
} from '../../../utils/firestore';
import { logCreate } from '../../../utils/auditLogger';
import { useAuth } from '../../../context/AuthContext';

interface FirebaseNotification {
  id?: string;
  title: string;
  message: string;
  targetUsers: string[];
  deliveryCount: number;
  sentAt: string | Date;
  sentBy?: string;
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FirebaseNotification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);

  const { register, handleSubmit, reset, watch } = useForm<{
    title: string;
    message: string;
    targetType: 'all' | 'specific';
    userIds: string[];
  }>();

  const targetType = watch('targetType', 'all');

  // Subscribe to real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (isLiveMode) {
      unsubscribe = subscribeToNotifications((docs) => {
        const mappedNotifications = docs.map(doc => ({
          ...doc,
          id: doc.id,
          targetUsers: doc.targetUsers || [],
          deliveryCount: doc.deliveryCount || 0,
          sentAt: doc.sentAt?.toDate?.() || doc.sentAt || new Date(),
        })) as FirebaseNotification[];
        setNotifications(mappedNotifications);
        setLoading(false);
      }, 100);
    } else {
      fetchNotifications();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isLiveMode]);

  // Fetch users from Firebase
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const docs = await getNotifications();
      const mappedNotifications = docs.map(doc => ({
        ...doc,
        id: doc.id,
        targetUsers: doc.targetUsers || [],
        deliveryCount: doc.deliveryCount || 0,
        sentAt: doc.sentAt?.toDate?.() || doc.sentAt || new Date(),
      })) as FirebaseNotification[];
      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users from Firebase
      const firestoreUsers = await getDocuments('users');
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers(firestoreUsers.map(u => ({
          ...u,
          _id: u.id,
        })) as User[]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const targetUsers = data.targetType === 'all' ? [] : (data.userIds || []);
      
      // Add notification to Firebase
      const notificationId = await addNotification({
        title: data.title,
        message: data.message,
        targetUsers: targetUsers,
        sentBy: user?.uid || 'admin',
        sentByEmail: user?.email || 'admin@example.com',
      });

      // Log the notification send action
      if (user) {
        await logCreate(user, 'notifications', notificationId, {
          title: data.title,
          recipients: targetUsers.length === 0 ? 'All users' : `${targetUsers.length} specific users`,
        });
      }

      toast.success('Notification sent successfully');
      reset();
      
      // If not in live mode, refresh the list
      if (!isLiveMode) {
        fetchNotifications();
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
    },
    {
      key: 'message',
      header: 'Message',
      render: (notification: FirebaseNotification) => (
        <div className="max-w-xs truncate">
          {notification.message}
        </div>
      ),
    },
    {
      key: 'targetUsers',
      header: 'Recipients',
      render: (notification: FirebaseNotification) => (
        <span className="text-sm text-gray-600">
          {!notification.targetUsers || notification.targetUsers.length === 0 
            ? 'All users' 
            : `${notification.targetUsers.length} users`}
        </span>
      ),
    },
    {
      key: 'deliveryCount',
      header: 'Delivered',
      render: (notification: FirebaseNotification) => (
        <span className="text-sm font-medium">
          {notification.deliveryCount || 0}
        </span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent At',
      render: (notification: FirebaseNotification) => {
        const date = notification.sentAt instanceof Date 
          ? notification.sentAt 
          : new Date(notification.sentAt);
        return date.toLocaleString();
      },
      sortable: true,
    },
    {
      key: 'sentBy',
      header: 'Sent By',
      render: (notification: FirebaseNotification) => (
        <span className="text-sm text-gray-600">
          {notification.sentBy || 'System'}
        </span>
      ),
    },
  ];

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>

      {/* Send New Notification */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Send New Notification</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register('title', { required: true })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              {...register('message', { required: true })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification message"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  {...register('targetType')}
                  type="radio"
                  value="all"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All users</span>
              </label>
              <label className="flex items-center">
                <input
                  {...register('targetType')}
                  type="radio"
                  value="specific"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Specific users</span>
              </label>
            </div>
          </div>

          {targetType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Users
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-2">
                {users.map((user) => (
                  <label key={user._id} className="flex items-center">
                    <input
                      {...register('userIds')}
                      type="checkbox"
                      value={user._id}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {user.displayName || user.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Notification History</h2>
          <div className="flex items-center space-x-4">
            {/* Live/Static Toggle */}
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isLiveMode
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Radio className={`h-4 w-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
              <span>{isLiveMode ? 'Live' : 'Static'}</span>
            </button>
            
            {/* Refresh Button */}
            {!isLiveMode && (
              <button
                onClick={fetchNotifications}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            )}
            
            <span className="text-sm text-gray-500">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Table data={notifications} columns={columns} />
      </div>
    </div>
  );
};

export default Notifications;