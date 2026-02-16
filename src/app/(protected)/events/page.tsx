"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Upload, Video } from "lucide-react";
import { Story as Event } from "../../../types";
import Table from "../../../components/UI/Table";
import Modal from "../../../components/UI/Modal";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { where } from "firebase/firestore";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  fileToBase64,
  base64ToDataURL,
  validateFileType,
  validateFileSize,
  formatFileSize,
  Base64Data,
  isImageFile,
  isVideoFile,
} from "../../../utils/base64Utils";
import {
  addEvent,
  getDocuments,
  updateDocumentWithBase64,
  deleteDocument,
} from "../../../utils/firestore";
import { logCreate, logUpdate, logDelete } from "../../../utils/auditLogger";
import { useAuth } from "../../../context/AuthContext";

const Stories: React.FC = () => {
  const { user, department } = useAuth();
  const [stories, setStories] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingevent, setEditingevent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; eventId: string | null }>({ open: false, eventId: null });
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(undefined);

  const { register, handleSubmit, reset, setValue, watch } = useForm<Partial<Event>>();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const constraints = [];
      if (department && department !== "General") {
        constraints.push(where("department", "==", department));
      }
      const firestoreStories = await getDocuments("events", constraints);
      setStories(
        firestoreStories.map((event: any) => {
          let imageUrl = undefined;
          if (event.files?.image?.dataURL) {
            imageUrl = event.files.image.dataURL;
          } else if (event.imageUrl) {
            imageUrl = event.imageUrl;
          }
          return {
            _id: event.id || event._id || "",
            title: event.title || "",
            content: event.content || "",
            imageUrl,
            videoUrl: event.videoUrl || event.files?.video?.dataURL || undefined,
            isPublished: event.isPublished !== false,
            createdAt:
              event.createdAt?.toDate?.()?.toISOString() ||
              event.createdAt ||
              new Date().toISOString(),
            updatedAt:
              event.updatedAt?.toDate?.()?.toISOString() ||
              event.updatedAt ||
              new Date().toISOString(),
            category: event.category || "General",
          };
        })
      );
    } catch (error) {
      console.error("Failed to fetch stories:", error);
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingevent(null);
    reset();
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingevent(event);
    setValue("title", event.title);
    setValue("content", event.content);
    setValue("imageUrl", event.imageUrl);
    setValue("videoUrl", event.videoUrl);
    setValue("isPublished", event.isPublished);
    setValue("category", event.category);
    // Date
    let dateValue = "";
    if (event.date) {
      // Accepts both ISO and yyyy-mm-dd
      dateValue = event.date.length > 10 ? event.date.split("T")[0] : event.date;
    } else if (event.createdAt) {
      dateValue = event.createdAt.split("T")[0];
    }
    setValue("date", dateValue);
    // Time
    let timeValue = "";
    if (event.time) {
      // Accepts both HH:mm:ss and HH:mm
      const t = event.time;
      timeValue = t.length > 5 ? t.slice(0, 5) : t;
    }
    setValue("time", timeValue);
    setSelectedImageFile(null);
    setImagePreviewUrl(event.imageUrl || "");
    setIsModalOpen(true);
  };

  const [imageTooLarge, setImageTooLarge] = useState(false);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      const typeValidation = validateFileType(file, allowedTypes);

      if (!typeValidation.valid) {
        toast.error(typeValidation.error || "Invalid file type");
        e.target.value = "";
        setImageTooLarge(false);
        return;
      }

      const maxSize = 10; // 10MB
      if (file.size > maxSize * 1024 * 1024) {
        setImageTooLarge(true);
        // Try to compress the image
        const img = new window.Image();
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            // Resize logic: scale down to max 1280px width or height, keep aspect ratio
            const MAX_DIM = 1280;
            let { width, height } = img;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            // Compress to 70% quality
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, { type: file.type });
                  setSelectedImageFile(compressedFile);
                  const previewReader = new FileReader();
                  previewReader.onloadend = () => {
                    setImagePreviewUrl(previewReader.result as string);
                  };
                  previewReader.readAsDataURL(compressedFile);
                  toast.success(`Image compressed and selected (${formatFileSize(compressedFile.size)})`);
                }
              },
              file.type,
              0.7
            );
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
        return;
      } else {
        setImageTooLarge(false);
      }

      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.success(`Image selected (${formatFileSize(file.size)})`);
    }
  };

  const handleDelete = async (eventId: string) => {
    setDeleteConfirm({ open: true, eventId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.eventId) return;
    try {
      await deleteDocument("events", deleteConfirm.eventId);
      // Log the delete action
      if (user) {
        await logDelete(
          { uid: user.uid, email: user.email || "unknown" },
          "STORIES",
          deleteConfirm.eventId,
          { action: "deleted_event_event" },
        );
      }
      toast.success("event deleted successfully");
      fetchStories();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    } finally {
      setDeleteConfirm({ open: false, eventId: null });
    }
  };

  const onSubmit = async (data: Partial<Event>) => {
    setIsSubmitting(true);
    try {
      let imageData: Base64Data | undefined;
      let videoData: Base64Data | undefined;

      if (selectedImageFile) {
        imageData = await fileToBase64(selectedImageFile);
      }

      // --- AI Content Moderation Block ---
      // 1. Check for abusive words as whole words
      const abusiveWords = [
        "abuse1", "abuse2", "abuse3" // Replace with your actual list
      ];
      const wordBoundaryRegex = (word: string) => new RegExp(`\\b${word}\\b`, "i");
      const textToCheck = `${data.title || ""} ${data.content || ""}`;
      for (const word of abusiveWords) {
        if (wordBoundaryRegex(word).test(textToCheck)) {
          toast.error(`Content contains prohibited word: ${word}`);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Check content matches image using AI moderation endpoint
      const imageUrlToMod = imageData && imageData.mimeType.startsWith("image/") ? base64ToDataURL(imageData) : undefined;
      if (imageUrlToMod || data.content || data.title) {
        const moderationToastId = toast.loading("AI is verifying content...");
        try {
          const modResponse = await fetch("/api/content-moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: "events",
              content: data.content,
              title: data.title,
              imageUrl: imageUrlToMod,
            }),
          });
          if (!modResponse.ok) {
            throw new Error("AI Moderation service unavailable");
          }
          const modResult = await modResponse.json();
          toast.dismiss(moderationToastId);
          if (!modResult.isAuthentic) {
            toast.error(`Content Flagged: ${modResult.reason}`, { duration: 6000 });
            setIsSubmitting(false);
            return;
          }
        } catch (modError) {
          console.error("Moderation error:", modError);
          toast.dismiss(moderationToastId);
          toast.error("AI check failed, proceeding with caution...");
        }
      }
      // --- End AI Content Moderation Block ---

      if (editingevent) {
        // Update existing event
        const updateData: any = {
          title: data.title,
          content: data.content,
          isPublished: data.isPublished !== undefined ? data.isPublished : false,
          date: (data as any).date,
          time: (data as any).time,
          category: (data as any).category,
        };
        const files: any = {};
        if (imageData) files.image = imageData;
        if (videoData) files.video = videoData;
        await updateDocumentWithBase64(
          "events",
          editingevent._id || "",
          updateData,
          Object.keys(files).length > 0 ? files : undefined,
        );
        // Log the update action
        if (user) {
          await logUpdate(
            { uid: user.uid, email: user.email || "unknown" },
            "STORIES",
            editingevent._id || "",
            { title: data.title, isPublished: data.isPublished },
          );
        }
        toast.success("event updated successfully");
        await fetchStories();
      } else {
        // Create new event
        const neweventId: any = await addEvent(
          {
            title: data.title || "",
            content: data.content || "",
            date: (data as any).date || new Date().toISOString().split("T")[0],
            time: (data as any).time || new Date().toLocaleTimeString(),
            location: (data as any).location || "Main Campus",
            category: (data as any).category || "General",
            department: department || "General",
            isPublished: data.isPublished !== undefined ? data.isPublished : false,
          },
          imageData ? imageData : undefined,
        );
        // Log the create action
        if (user) {
          await logCreate(
            { uid: user.uid, email: user.email || "unknown" },
            "EVENTS",
            neweventId,
            { title: data.title, isPublished: data.isPublished },
          );
        }
        toast.success("Event created successfully");
        await fetchStories();
      }

      setIsModalOpen(false);
      reset();
      setSelectedImageFile(null);
      setImagePreviewUrl("");
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event: " + (error as Error).message);
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
      key: "content",
      header: "Content",
      render: (event: Event) => {
        const isLong = event.content && event.content.length > 60;
        return (
          <div className="max-w-xs">
            <span className={isLong ? "truncate inline-block w-40 align-top" : ""}>
              {isLong ? event.content.slice(0, 60) + "..." : event.content}
            </span>
            {isLong && (
              <button
                className="ml-2 text-blue-600 underline hover:text-blue-900"
                type="button"
                onClick={() => {
                  setSelectedContent(event.content);
                  setShowContentModal(true);
                }}
              >
                More
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "imageUrl",
      header: "Image",
      render: (event: Event) => (
        event.imageUrl ? (
          <button
            className="text-blue-600 hover:text-blue-900 underline"
            onClick={() => {
              setSelectedImageUrl(event.imageUrl);
              setShowImageModal(true);
            }}
            type="button"
          >
            Show Image
          </button>
        ) : (
          <span className="text-gray-400">No Image</span>
        )
      ),
    },
    {
      key: "isPublished",
      header: "Status",
      render: (event: Event) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            event.isPublished
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {event.isPublished ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (event: Event) => new Date(event.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (event: Event) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(event)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(event._id);
            }}
            className="text-red-600 hover:text-red-900"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Event</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table data={stories} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingevent ? "Edit Event" : "Add New Event"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          {/* Delete Confirmation Modal (not nested) */}
                          <Modal
                            isOpen={deleteConfirm.open}
                            onClose={() => setDeleteConfirm({ open: false, eventId: null })}
                            title="Confirm Deletion"
                            size="sm"
                          >
                            <div className="space-y-4">
                              <p className="text-lg text-gray-800">Are you sure you want to delete this event?</p>
                              <div className="flex justify-end space-x-3">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm({ open: false, eventId: null })}
                                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={confirmDelete}
                                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </Modal>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        {...register("category", { required: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="deadlines">Deadlines</option>
                        <option value="events">Events</option>
                        <option value="workshops">Workshops</option>
                      </select>
                    </div>

                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          {...register("date", { required: true })}
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          defaultValue={editingevent ? (editingevent.date ? (editingevent.date.length > 10 ? editingevent.date.split("T")[0] : editingevent.date) : (editingevent.createdAt ? editingevent.createdAt.split("T")[0] : "")) : ""}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time
                        </label>
                        <input
                          {...register("time", { required: true })}
                          type="time"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={watch("time") || ""}
                          onChange={e => setValue("time", e.target.value)}
                        />
                      </div>
                    </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register("title", { required: true })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              {...register("content", { required: true })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Image (Optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Max size: 1MB. Supported: JPG, PNG, WEBP, GIF
            </p>
            {imageTooLarge && (
              <p className="mt-1 text-xs text-red-600 font-semibold">Image size is too large. Resolution will be reduced automatically.</p>
            )}
            {(selectedImageFile && imagePreviewUrl) ? (
              <div className="mt-2">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="h-32 w-auto object-cover rounded-lg border"
                />
                <p className="text-xs text-green-600 mt-1">
                  {selectedImageFile.name} (
                  {formatFileSize(selectedImageFile.size)})
                </p>
              </div>
            ) : (editingevent && editingevent.imageUrl) ? (
              <div className="mt-2">
                <img
                  src={editingevent.imageUrl}
                  alt="Current"
                  className="h-32 w-auto object-cover rounded-lg border"
                />
                <p className="text-xs text-blue-600 mt-1">Current Image</p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center">
            <input
              {...register("isPublished")}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Published
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : editingevent ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Modal */}
      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)} title="Event Image" size="md">
        <div className="flex flex-col items-center justify-center p-4">
          {selectedImageUrl ? (
            <img
              src={selectedImageUrl}
              alt="Event"
              className="max-w-full max-h-[60vh] rounded shadow"
            />
          ) : (
            <span className="text-gray-400">No Image Available</span>
          )}
          <button
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setShowImageModal(false)}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Content Modal */}
      <Modal isOpen={showContentModal} onClose={() => setShowContentModal(false)} title="Full Content" size="md">
        <div className="p-4">
          <div className="whitespace-pre-line break-words text-gray-800">
            {selectedContent}
          </div>
          <button
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setShowContentModal(false)}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal (not nested) */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, eventId: null })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-lg text-gray-800">Are you sure you want to delete this event?</p>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setDeleteConfirm({ open: false, eventId: null })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
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

export default Stories;
