"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Event } from "../../../types";
import Table from "../../../components/UI/Table";
import Modal from "../../../components/UI/Modal";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { where } from "firebase/firestore";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  fileToBase64,
  base64ToDataURL,
  buildImageUrl,
  removeBase64Prefix,
  validateFileType,
  validateFileSize,
  formatFileSize,
  Base64Data,
} from "../../../utils/base64Utils";
import {
  addEvent,
  updateEvent,
  getDocuments,
  deleteDocument,
} from "../../../utils/firestore";
import { logCreate, logUpdate, logDelete } from "../../../utils/auditLogger";
import { useAuth } from "../../../context/AuthContext";

const Stories: React.FC = () => {
  const { user, department } = useAuth();
  const [stories, setStories] = useState<Event[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    eventId: string | null;
  }>({ open: false, eventId: null });
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [imageTooLarge, setImageTooLarge] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<
    Partial<Event>
  >();

  useEffect(() => {
    fetchStories();
  }, [department]);

  // =====================================================
  // FETCH EVENTS FROM FIREBASE
  // =====================================================
  const fetchStories = async () => {
    setLoading(true);
    try {
      const constraints = [];
      if (department && department !== "General") {
        constraints.push(where("department", "==", department));
      }

      const firestoreStories = await getDocuments("events", constraints);

      const mappedStories = firestoreStories.map((event: any) => {
        // Only build displayable image URL if image exists
        let displayImageUrl: string | undefined = undefined;
        if (event.image) {
          const mimeType = event.imageMimeType || "image/jpeg";
          displayImageUrl = buildImageUrl(event.image, mimeType);
        }
        return {
          id: event.id || "",
          _id: event.id || "",
          title: event.title || "",
          content: event.content || "",
          image: displayImageUrl, // Will be undefined if no image
          rawImageBase64: event.image, // Keep raw base64 for editing
          imageMimeType: event.imageMimeType,
          videoUrl: event.videoUrl || undefined,
          isPublished: event.isPublished !== false,
          date: event.date || "",
          time: event.time || "",
          location: event.location || "",
          category: event.category || "General",
          department: event.department || "General",
          createdAt:
            event.createdAt?.toDate?.()?.toISOString() ||
            event.createdAt ||
            new Date().toISOString(),
          updatedAt:
            event.updatedAt?.toDate?.()?.toISOString() ||
            event.updatedAt ||
            new Date().toISOString(),
        };
      });

      // Sort by createdAt descending (newest first)
      const sortedStories = mappedStories.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setStories(sortedStories);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleAdd = () => {
    setEditingEvent(null);
    reset({
      title: "",
      content: "",
      category: "events",
      date: new Date().toISOString().split("T")[0],
      time: "",
      isPublished: true,
    });
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setImageTooLarge(false);
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setValue("title", event.title);
    setValue("content", event.content);
    setValue("category", event.category || "events");
    setValue("isPublished", event.isPublished);

    // Date
    let dateValue = "";
    if (event.date) {
      dateValue =
        event.date.length > 10 ? event.date.split("T")[0] : event.date;
    } else if (event.createdAt) {
      dateValue = event.createdAt.split("T")[0];
    }
    setValue("date", dateValue);

    // Time
    let timeValue = "";
    if (event.time) {
      timeValue = event.time.length > 5 ? event.time.slice(0, 5) : event.time;
    }
    setValue("time", timeValue);

    setSelectedImageFile(null);
    setImagePreviewUrl((event as any).image || "");
    setImageTooLarge(false);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      // Compress the image
      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = (ev) => {
        img.onload = () => {
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

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                });
                setSelectedImageFile(compressedFile);

                const previewReader = new FileReader();
                previewReader.onloadend = () => {
                  setImagePreviewUrl(previewReader.result as string);
                };
                previewReader.readAsDataURL(compressedFile);

                toast.success(
                  `Image compressed (${formatFileSize(compressedFile.size)})`
                );
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
    }

    setImageTooLarge(false);
    setSelectedImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    toast.success(`Image selected (${formatFileSize(file.size)})`);
  };

  const handleDelete = (eventId: string) => {
    setDeleteConfirm({ open: true, eventId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.eventId) return;

    try {
      await deleteDocument("events", deleteConfirm.eventId);

      if (user) {
        await logDelete(
          { uid: user.uid, email: user.email || "unknown" },
          "EVENTS",
          deleteConfirm.eventId,
          { action: "deleted_event" }
        );
      }

      toast.success("Event deleted successfully");
      await fetchStories();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    } finally {
      setDeleteConfirm({ open: false, eventId: null });
    }
  };

  // =====================================================
  // FORM SUBMIT
  // =====================================================
  const onSubmit = async (data: Partial<Event>) => {
    setIsSubmitting(true);

    try {
      let imageData: Base64Data | undefined = undefined;

      // Only convert to base64 if a real image is selected
      if (selectedImageFile) {
        imageData = await fileToBase64(selectedImageFile);
        // Defensive: If conversion fails, do not store image
        if (!imageData || !imageData.data) {
          imageData = undefined;
        }
      }

      // --- AI Content Moderation Block ---
      const abusiveWords = ["abuse1", "abuse2", "abuse3"]; // Replace with actual list
      const wordBoundaryRegex = (word: string) =>
        new RegExp(`\\b${word}\\b`, "i");
      const textToCheck = `${data.title || ""} ${data.content || ""}`;

      for (const word of abusiveWords) {
        if (wordBoundaryRegex(word).test(textToCheck)) {
          toast.error(`Content contains prohibited word: ${word}`);
          setIsSubmitting(false);
          return;
        }
      }

      // AI moderation (if needed)
      const imageUrlForModeration = imageData
        ? base64ToDataURL(imageData)
        : undefined;

      if (imageData?.data || data.content || data.title) {
        const moderationToastId = toast.loading("AI is verifying content...");
        try {
          const modResponse = await fetch("/api/content-moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: "events",
              content: data.content,
              title: data.title,
              imageUrl: imageUrlForModeration,
            }),
          });

          if (modResponse.ok) {
            const modResult = await modResponse.json();
            toast.dismiss(moderationToastId);

            if (!modResult.isAuthentic) {
              toast.error(`Content Flagged: ${modResult.reason}`, {
                duration: 6000,
              });
              setIsSubmitting(false);
              return;
            }
          } else {
            toast.dismiss(moderationToastId);
          }
        } catch (modError) {
          console.error("Moderation error:", modError);
          toast.dismiss(moderationToastId);
        }
      }
      // --- End AI Content Moderation Block ---

      const eventData = {
        title: data.title || "",
        content: data.content || "",
        date: (data as any).date || new Date().toISOString().split("T")[0],
        time: (data as any).time || "",
        location: (data as any).location || "Main Campus",
        category: (data as any).category
          ? (data as any).category.charAt(0).toUpperCase() +
            (data as any).category.slice(1)
          : "Events",
        department: department || "General",
        isPublished: true,
      };

      if (editingEvent && editingEvent._id) {
        // ✅ UPDATE existing event
        if (typeof editingEvent._id === "string" && editingEvent._id.trim() !== "") {
          await updateEvent(editingEvent._id, eventData, imageData);

          if (user) {
            await logUpdate(
              { uid: user.uid, email: user.email || "unknown" },
              "EVENTS",
              editingEvent._id,
              { title: data.title }
            );
          }

          toast.success("Event updated successfully");
        } else {
          toast.error("Invalid event ID. Cannot update event.");
          return;
        }
      } else {
        // ✅ CREATE new event
        const newEventId = await addEvent(eventData, imageData);

        if (user) {
          await logCreate(
            { uid: user.uid, email: user.email || "unknown" },
            "EVENTS",
            newEventId,
            { title: data.title }
          );
        }

        toast.success("Event created successfully");
      }

      // Refresh the list
      await fetchStories();

      // Close modal and reset
      setIsModalOpen(false);
      reset();
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      setEditingEvent(null);
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // TABLE COLUMNS
  // =====================================================
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
            <span
              className={
                isLong ? "truncate inline-block w-40 align-top" : ""
              }
            >
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
      key: "image",
      header: "Image",
      render: (event: Event) =>
        (event as any).image ? (
          <button
            className="text-blue-600 hover:text-blue-900 underline"
            onClick={() => {
              setSelectedImageUrl((event as any).image || "");
              setShowImageModal(true);
            }}
            type="button"
          >
            Show Image
          </button>
        ) : (
          <span className="text-gray-400">No Image</span>
        ),
    },
    {
      key: "category",
      header: "Category",
      render: (event: Event) => (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
          {event.category || "General"}
        </span>
      ),
    },
    {
      key: "isPublished",
      header: "Status",
      render: (event: Event) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${
            event.isPublished
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
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
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(event._id || event.id);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // =====================================================
  // RENDER
  // =====================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredStories = stories.filter((event) =>
    event.title.toLowerCase().includes(eventSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search events by title..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <Table data={filteredStories} columns={columns} />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
          reset();
          setSelectedImageFile(null);
          setImagePreviewUrl("");
        }}
        title={editingEvent ? "Edit Event" : "Add New Event"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category */}
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

          {/* Date and Time */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                {...register("date", { required: true })}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register("title", { required: true })}
              type="text"
              placeholder="Enter event title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              {...register("content", { required: true })}
              rows={6}
              placeholder="Enter event description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image Upload */}
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
              Max size: 10MB. Supported: JPG, PNG, WEBP, GIF
            </p>

            {imageTooLarge && (
              <p className="mt-1 text-xs text-red-600 font-semibold">
                Image size is too large. It will be compressed automatically.
              </p>
            )}

            {/* Image Preview */}
            {imagePreviewUrl && (
              <div className="mt-2">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="h-32 w-auto object-cover rounded-lg border"
                />
                {selectedImageFile && (
                  <p className="text-xs text-green-600 mt-1">
                    {selectedImageFile.name} (
                    {formatFileSize(selectedImageFile.size)})
                  </p>
                )}
                {!selectedImageFile && (editingEvent as any)?.image && (
                  <p className="text-xs text-blue-600 mt-1">Current Image</p>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingEvent(null);
                reset();
                setSelectedImageFile(null);
                setImagePreviewUrl("");
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : editingEvent ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Event Image"
        size="md"
      >
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
      <Modal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        title="Full Content"
        size="md"
      >
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, eventId: null })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-lg text-gray-800">
            Are you sure you want to delete this event?
          </p>
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