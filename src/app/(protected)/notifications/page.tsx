"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Radio,
  RefreshCw,
  Image as ImageIcon,
  X,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { User } from "../../../types";
import Table from "../../../components/UI/Table";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import Modal from "../../../components/UI/Modal";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  addNotification,
  getNotifications,
  subscribeToNotifications,
  getDocuments,
  updateDocument,
  deleteDocument,
} from "../../../utils/firestore";
import { logCreate, logUpdate, logDelete } from "../../../utils/auditLogger";
import { useAuth } from "../../../context/AuthContext";

interface FirebaseNotification {
  id?: string;
  title: string;
  message: string;
  targetUsers: string[];
  deliveryCount: number;
  sentAt: string | Date;
  sentBy?: string;
  sentByEmail?: string;
  imageText?: string;
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FirebaseNotification[]>(
    [],
  );
  const [editingNotification, setEditingNotification] =
    useState<FirebaseNotification | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    title: string;
    message: string;
    targetType: "all" | "specific";
    userIds: string[];
    priority: "low" | "normal" | "high";
  }>();

  const targetType = watch("targetType", "all");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Subscribe to real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    unsubscribe = subscribeToNotifications((docs) => {
      const mappedNotifications = docs.map((doc) => ({
        ...doc,
        id: doc.id,
        targetUsers: doc.targetUsers || [],
        deliveryCount: doc.deliveryCount || 0,
        sentAt: doc.sentAt?.toDate?.() || doc.sentAt || new Date(),
      })) as FirebaseNotification[];
      setNotifications(mappedNotifications);
      setLoading(false);
    }, 100);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Fetch users from Firebase
  const fetchUsers = async () => {
    try {
      // Fetch users from Firebase
      const firestoreUsers = await getDocuments("users");
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers(
          firestoreUsers.map((u) => ({
            ...u,
            _id: u.id,
          })) as User[],
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch notifications from Firebase
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const docs = await getNotifications();
      const mappedNotifications = docs.map((doc) => ({
        ...doc,
        id: doc.id,
        targetUsers: doc.targetUsers || [],
        deliveryCount: doc.deliveryCount || 0,
        sentAt: doc.sentAt?.toDate?.() || doc.sentAt || new Date(),
      })) as FirebaseNotification[];
      setNotifications(mappedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
  }, []);

  const handleEdit = (notification: FirebaseNotification) => {
    setEditingNotification(notification);
    setValue("title", notification.title);
    setValue("message", notification.message);
    setValue(
      "targetType",
      notification.targetUsers?.length > 0 ? "specific" : "all",
    );
    setValue("userIds", notification.targetUsers || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    setNotificationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;

    try {
      await deleteDocument("notifications", notificationToDelete);
      if (user) {
        await logDelete(user, "notifications", notificationToDelete);
      }
      toast.success("Notification deleted successfully");
      setIsDeleteModalOpen(false);
      setNotificationToDelete(null);
      fetchNotifications(); // Always refresh after delete
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const targetUsers = data.targetType === "all" ? [] : data.userIds || [];

      if (editingNotification?.id) {
        const updateData: any = {
          title: data.title,
          message: data.message,
          targetUsers: targetUsers,
          priority: data.priority || "normal",
        };

        await updateDocument(
          "notifications",
          editingNotification.id,
          updateData,
        );
        if (user) {
          await logUpdate(user, "notifications", editingNotification.id, {
            title: data.title,
          });
        }
        toast.success("Notification updated successfully");
      } else {
        // Add notification to Firebase
        const notificationId = await addNotification({
          title: data.title,
          message: data.message,
          targetUsers: targetUsers,
          sentBy: user?.uid || "admin",
          sentByEmail: user?.email || "admin@example.com",
          priority: data.priority || "normal",
        });

        // Log the notification send action
        if (user) {
          await logCreate(user, "notifications", notificationId, {
            title: data.title,
            recipients:
              targetUsers.length === 0
                ? "All users"
                : `${targetUsers.length} specific users`,
          });
        }
        toast.success("Notification sent successfully");
      }

      reset();
      setEditingNotification(null);
      // Always refresh the list after save
      fetchNotifications();
    } catch (err) {
      const error = err as Error;
      console.error("Failed to save notification:", error);
      toast.error("Failed to save notification: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      sortable: true,
    },
    {
      key: "message",
      header: "Message",
      render: (notification: FirebaseNotification) => (
        <div className="max-w-xs truncate">{notification.message}</div>
      ),
    },
    {
      key: "targetUsers",
      header: "Recipients",
      render: (notification: FirebaseNotification) => (
        <span className="text-sm text-gray-600">
          {!notification.targetUsers || notification.targetUsers.length === 0
            ? "All users"
            : `${notification.targetUsers.length} users`}
        </span>
      ),
    },
    // Removed Delivered column
    {
      key: "sentAt",
      header: "Sent At",
      render: (notification: FirebaseNotification) => {
        const date =
          notification.sentAt instanceof Date
            ? notification.sentAt
            : new Date(notification.sentAt);
        return date.toLocaleString();
      },
      sortable: true,
    },
    {
      key: "sentBy",
      header: "Sent By",
      render: (notification: FirebaseNotification) => (
        <span className="text-sm text-gray-600">
          {notification.sentByEmail || notification.sentBy || "System"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (notification: FirebaseNotification) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(notification)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit Notification"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => notification.id && handleDelete(notification.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete Notification"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            {editingNotification
              ? "Edit Notification"
              : "Send New Notification"}
          </h2>
          {editingNotification && (
            <button
              onClick={() => {
                setEditingNotification(null);
                reset();
                setPreviewUrl("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register("title", { required: true })}
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
              {...register("message", { required: true })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification message"
            />
          </div>

          {/* Removed notification image preview UI */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  {...register("targetType")}
                  type="radio"
                  value="all"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All users</span>
              </label>
              <label className="flex items-center">
                <input
                  {...register("targetType")}
                  type="radio"
                  value="specific"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Specific users
                </span>
              </label>
            </div>
          </div>

          {targetType === "specific" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Users
              </label>

              {/* User Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-2">
                {users
                  .filter(
                    (u) =>
                      (u.displayName || "")
                        .toLowerCase()
                        .includes(userSearchTerm.toLowerCase()) ||
                      (u.email || "")
                        .toLowerCase()
                        .includes(userSearchTerm.toLowerCase()),
                  )
                  .map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer"
                    >
                      <input
                        {...register("userIds")}
                        type="checkbox"
                        value={user._id}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {user.displayName || "No Name"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.email}
                        </span>
                      </div>
                    </label>
                  ))}
                {users.filter(
                  (u) =>
                    (u.displayName || "")
                      .toLowerCase()
                      .includes(userSearchTerm.toLowerCase()) ||
                    (u.email || "")
                      .toLowerCase()
                      .includes(userSearchTerm.toLowerCase()),
                ).length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">
                    No users found matching "{userSearchTerm}"
                  </p>
                )}
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
                  <span>
                    {editingNotification
                      ? "Update Notification"
                      : "Send Notification"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            Notification History
          </h2>
          <div className="flex items-center space-x-4">

            <span className="text-sm text-gray-500">
              {notifications.length} notification
              {notifications.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <Table data={notifications} columns={columns} />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this notification? This action
            cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Notifications;
