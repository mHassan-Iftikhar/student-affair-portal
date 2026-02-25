"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Item } from "../../../types";
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
} from "../../../utils/base64Utils";
import {
  addLostAndFoundItem,
  getDocuments,
  updateDocumentWithBase64,
  deleteDocument,
} from "../../../utils/firestore";
import { logCreate, logUpdate, logDelete } from "../../../utils/auditLogger";
import { useAuth } from "../../../context/AuthContext";


const Items: React.FC = () => {
  const { user, department } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(undefined);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [reportType, setReportType] = useState<string>("Lost");
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("All");

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Item>>();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const constraints = [];
      if (department && department !== "General") {
        constraints.push(where("department", "==", department));
      }
      // Use correct Firestore collection name and include reportType
      const firestoreItems = await getDocuments("lostNfound", constraints);
      const mappedItems = firestoreItems.map((item) => {
        let imageLink = "";
        if (item.files?.image?.dataURL) {
          imageLink = item.files.image.dataURL;
        } else if (item.imageUrl) {
          imageLink = item.imageUrl;
        } else if (item.imageLink) {
          imageLink = item.imageLink;
        }
        return {
          _id: item.id || "",
          id: item.id || "",
          title: item.title || "",
          description: item.description || "",
          // price removed
          category: item.category || "",
          imageLink,
          isActive: item.isActive !== false,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          reportType: item.reportType || "Lost",
        };
      });
      // Sort by createdAt descending (newest first)
      const sortedItems = [...mappedItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(sortedItems as Item[]);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setError("Failed to load items. Please try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    reset();
    setSelectedCategory("");
    setCustomCategory("");
    setSelectedFile(null);
    setPreviewUrl("");
    setIsModalOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setValue("title", item.title);
    setValue("description", item.description);
    // setValue for price removed
    setValue("category", item.category);
    setValue("imageLink", item.imageLink || item.imageUrl || "");
    setValue("isActive", item.isActive);

    // Check if category is a predefined one or custom
    const predefinedCategories = [
      "electronics",
      "clothing",
      "home",
      "sports",
      "books",
    ];
    if (predefinedCategories.includes(item.category.toLowerCase())) {
      setSelectedCategory(item.category);
      setCustomCategory("");
    } else {
      setSelectedCategory("other");
      setCustomCategory(item.category);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      const typeValidation = validateFileType(file, allowedTypes);

      if (!typeValidation.valid) {
        toast.error(typeValidation.error || "Invalid file type");
        e.target.value = "";
        return;
      }

      const maxSize = 10; // 10MB
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || "File too large");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.success(`Image selected (${formatFileSize(file.size)})`);
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeleteConfirm({ open: true, itemId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.itemId) return;
    try {
      await deleteDocument("lostNfound", deleteConfirm.itemId);
      if (user) {
        await logDelete(
          { uid: user.uid, email: user.email || "unknown" },
          "ITEMS",
          deleteConfirm.itemId,
          { action: "deleted_lost_found_item" },
        );
      }
      toast.success("Item deleted successfully");
      fetchItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error("Failed to delete item");
    } finally {
      setDeleteConfirm({ open: false, itemId: null });
    }
  };

  const onSubmit = async (data: Partial<Item>) => {
    setIsSubmitting(true);
    try {
      // Use custom category if "other" is selected
      const finalCategory =
        selectedCategory === "other" ? customCategory : data.category;

      let imageData: Base64Data | undefined;
      if (selectedFile) {
        imageData = await fileToBase64(selectedFile);
      }

      const imageUrlToMod =
        imageData && imageData.mimeType.startsWith("image/")
          ? base64ToDataURL(imageData)
          : data.imageUrl;

      // Integrate AI Content Moderation
      if (imageUrlToMod || data.description || data.title) {
        const moderationToastId = toast.loading("AI is verifying content...");
        try {
          const modResponse = await fetch("/api/content-moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: finalCategory || "lostnfound",
              content: data.description,
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
            toast.error(`Content Flagged: ${modResult.reason}`, {
              duration: 6000,
            });
            setIsSubmitting(false);
            return; // Stop submission
          }
        } catch (modError) {
          console.error("Moderation error:", modError);
          toast.dismiss(moderationToastId);
          // We can decide to block or allow on AI failure. Let's allow but log a warning.
          toast.error("AI check failed, proceeding with caution...");
        }
      }

      if (editingItem) {
        // Update using Firestore
        const updateData: any = {
          title: data.title,
          description: data.description,
          // price removed
          category: finalCategory,
          isActive: data.isActive !== undefined ? data.isActive : true,
        };

        const files: any = {};
        if (imageData) {
          files.image = imageData;
        }

        await updateDocumentWithBase64(
          "lostNfound",
          editingItem._id || editingItem.id || "",
          updateData,
          Object.keys(files).length > 0 ? files : undefined,
        );

        // Log the update action
        if (user) {
          await logUpdate(
            { uid: user.uid, email: user.email || "unknown" },
            "ITEMS",
            editingItem._id || editingItem.id || "",
            { title: data.title, category: finalCategory },
          );
        }

        toast.success("Item updated successfully");
        fetchItems();
      } else {
        // Create new item using Firestore
        const newItemId = await addLostAndFoundItem({
          title: data.title || "",
          reportType: reportType || "Lost",
          description: data.description || "",
          date: (data as any).date || new Date().toISOString().split("T")[0],
          time: (data as any).time || new Date().toLocaleTimeString(),
          imageLink: typeof previewUrl === "string" ? previewUrl : "",
          isClaimed: false,
          createdBy: user?.email || "Admin",
        });

        // Log the create action
        if (user) {
          await logCreate(
            { uid: user.uid, email: user.email || "unknown" },
            "ITEMS",
            newItemId,
            { title: data.title, category: finalCategory },
          );
        }

        toast.success("Item created successfully");
        fetchItems();
      }

      setIsModalOpen(false);
      reset();
      setSelectedCategory("");
      setCustomCategory("");
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error("Failed to save item: " + (error as Error).message);
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
      key: "description",
      header: "Content",
      render: (item: Item) => {
        const isLong = item.description && item.description.length > 60;
        return (
          <div className="max-w-xs">
            <span className={isLong ? "truncate inline-block w-40 align-top" : ""}>
              {isLong ? item.description.slice(0, 60) + "..." : item.description}
            </span>
            {isLong && (
              <button
                className="ml-2 text-blue-600 underline hover:text-blue-900"
                type="button"
                onClick={() => {
                  setSelectedContent(item.description);
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
      key: "imageLink",
      header: "Image",
      render: (item: Item) => (
        item.imageLink ? (
          <button
            className="text-blue-600 hover:text-blue-900 underline"
            onClick={() => {
              setSelectedImageUrl(item.imageLink);
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
      key: "isActive",
      header: "Status",
      render: (item: Item) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            item.isActive !== false
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.isActive !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "reportType",
      header: "Report Type",
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(item._id || (item as any).id)}
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

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchItems();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Filter items by search and report type
  const filteredItems = items.filter((item) => {
    const matchesType = filterType === "All" || item.reportType === filterType;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.category && item.category.toLowerCase().includes(term));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">lostNfound</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by title, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {/* Report Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Lost">Lost</option>
            <option value="Found">Found</option>
          </select>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table data={filteredItems} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Item" : "Add New Item"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Description
            </label>
            <textarea
              {...register("description", { required: true })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              {...register("reportType", { required: true })}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Image (Optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Max size: 1MB. Supported: JPG, PNG, WEBP
            </p>
            {selectedFile && previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg border"
                />
                <p className="text-xs text-green-600 mt-1">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              {...register("isActive")}
              type="checkbox"
              defaultChecked={true}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">Active</label>
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
              ) : editingItem ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Modal */}
      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)} title="Item Image" size="md">
        <div className="flex flex-col items-center justify-center p-4">
          {selectedImageUrl ? (
            <img
              src={selectedImageUrl}
              alt="Lost and Found Item"
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, itemId: null })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-lg text-gray-800">Are you sure you want to delete this item?</p>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setDeleteConfirm({ open: false, itemId: null })}
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

export default Items;
