"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileText,
} from "lucide-react";
import Table from "../../../components/UI/Table";
import Modal from "../../../components/UI/Modal";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { where } from "firebase/firestore";
import { uploadFile } from "../../../utils/firebaseStorage";
import {
  fileToBase64,
  base64ToDataURL,
  validateFileType,
  validateFileSize,
  formatFileSize,
  downloadBase64File,
  Base64Data,
} from "../../../utils/base64Utils";
import {
  addAcademicResource,
  getDocuments,
  updateDocument,
  updateDocumentWithBase64,
  deleteDocument,
  getDocumentWithBase64,
} from "../../../utils/firestore";
import { logCreate, logUpdate, logDelete } from "../../../utils/auditLogger";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
interface Resource {
  id?: string;
  _id?: string;
  title: string;
  semester: string;
  subject: string;
  resourceType: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileBase64?: string;
  fileUrl?: string; // Fallback for old data or mock data
  description?: string; // For mock data compatibility
  category?: string; // For mock data compatibility
  uploadedBy: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

const AcademicResources: React.FC = () => {
  const { user, department } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    semester: "",
    subject: "",
    resourceType: "Notes",
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Build constraints for department filtering
      const constraints = [];
      if (department && department !== "General") {
        constraints.push(where("department", "==", department));
      }

      // Try to fetch from Firestore
      const firestoreResources = await getDocuments(
        "academic_resources",
        constraints,
      );

      if (firestoreResources && firestoreResources.length > 0) {
        setResources(
          firestoreResources.map((r) => {
            let fileBase64 = r.fileBase64 || "";
            // If files.resource exists and is an image, use its dataURL
            if (r.files && r.files.resource && r.files.resource.data && r.files.resource.mimeType && r.files.resource.mimeType.startsWith("image/")) {
              fileBase64 = `data:${r.files.resource.mimeType};base64,${r.files.resource.data}`;
            }
            return {
              _id: r.id || r._id || "",
              title: r.title || "",
              semester: r.semester || "",
              subject: r.subject || "",
              resourceType: r.resourceType || "",
              fileName: r.fileName || "",
              fileType: r.fileType || "",
              fileSize: r.fileSize || "",
              fileBase64,
              uploadedBy: r.uploadedBy || "",
              createdAt:
                r.createdAt?.toDate?.()?.toISOString() ||
                r.createdAt ||
                new Date().toISOString(),
              updatedAt:
                r.updatedAt?.toDate?.()?.toISOString() ||
                r.updatedAt ||
                new Date().toISOString(),
            } as Resource;
          })
        );
      } else {
        // Mock data for demo
        setResources([
          {
            _id: "1",
            title: "Computer Science Notes",
            semester: "7th",
            subject: "Computer Science",
            resourceType: "Notes",
            fileName: "cs-notes.pdf",
            fileType: "application/pdf",
            fileSize: "1.2 MB",
            uploadedBy: "Admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            _id: "2",
            title: "Mathematics Study Guide",
            semester: "5th",
            subject: "Mathematics",
            resourceType: "Notes",
            fileName: "math-guide.docx",
            fileType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSize: "500 KB",
            uploadedBy: "Admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "video/mp4",
        "video/webm",
        "video/ogg",
      ];

      const typeValidation = validateFileType(file, allowedTypes);
      if (!typeValidation.valid) {
        toast.error(typeValidation.error || "Invalid file type");
        e.target.value = "";
        return;
      }

      const maxSize = 25; // 25MB for Base64 storage
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || "File too large");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      toast.success(
        `File "${file.name}" selected (${formatFileSize(file.size)})`,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingResource && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      let base64FileData: Base64Data | undefined;

      // Convert file to Base64 if a new one is selected
      if (selectedFile) {
        base64FileData = await fileToBase64(selectedFile);
        toast.success("File encoded successfully");
      }

      // Integrate AI Content Moderation
      // For academic resources, we mainly check if the file is an image or if there's enough text content/title
      if (base64FileData || formData.subject || formData.title) {
        const moderationToastId = toast.loading("AI is verifying content...");
        try {
          const modResponse = await fetch("/api/content-moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: formData.subject || "academic",
              content: `${formData.title} - ${formData.semester}`,
              title: formData.title,
              imageUrl: base64FileData?.mimeType.startsWith("image/")
                ? base64ToDataURL(base64FileData)
                : undefined,
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
            setUploading(false);
            return; // Stop submission
          }
        } catch (modError) {
          console.error("Moderation error:", modError);
          toast.dismiss(moderationToastId);
          toast.error("AI check failed, proceeding with caution...");
        }
      }

      if (editingResource) {
        // Update existing resource
        const updateData: any = {
          ...formData,
          updatedAt: new Date().toISOString(),
        };
        let files: any = undefined;
        if (base64FileData) {
          updateData.fileName = base64FileData.fileName;
          updateData.fileType = base64FileData.mimeType;
          updateData.fileSize = formatFileSize(selectedFile?.size || 0);
          files = { resource: base64FileData };
        }
        const resourceId = editingResource._id || editingResource.id || "";
        if (files) {
          await updateDocumentWithBase64("academic_resources", resourceId, updateData, files);
        } else {
          await updateDocument("academic_resources", resourceId, updateData);
        }
        // Log the update
        if (user) {
          await logUpdate(user, "academic_resources", resourceId, {
            title: formData.title,
            subject: formData.subject,
            fileUpdated: !!base64FileData,
          });
        }
        toast.success("Resource updated successfully!");
      } else {
        // Create new resource
        if (!base64FileData) {
          toast.error("File encoding failed");
          return;
        }
        const newResourceId = await addAcademicResource({
          ...formData,
          fileName: base64FileData.fileName,
          fileType: base64FileData.mimeType,
          fileSize: formatFileSize(selectedFile?.size || 0),
          fileBase64: base64ToDataURL(base64FileData),
        });
        // Log the creation
        if (user) {
          await logCreate(
            user,
            "academic_resources",
            newResourceId || "unknown",
            {
              title: formData.title,
              subject: formData.subject,
              fileName: base64FileData.fileName,
            },
          );
        }
        toast.success("Resource uploaded successfully to Firestore!");
      }

      setIsModalOpen(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("Failed to save resource: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      semester: resource.semester,
      subject: resource.subject,
      resourceType: resource.resourceType,
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      try {
        // Find the resource for logging
        const resourceToDelete = resources.find((r) => (r._id || r.id) === id);

        await deleteDocument("academic_resources", id);

        // Log the deletion
        if (user) {
          await logDelete(user, "academic_resources", id, {
            title: resourceToDelete?.title,
            subject: resourceToDelete?.subject,
          });
        }

        toast.success("Resource deleted successfully");
        fetchResources();
      } catch (error) {
        console.error("Error deleting resource:", error);
        toast.error("Failed to delete resource");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      semester: "",
      subject: "",
      resourceType: "Notes",
    });
    setSelectedFile(null);
    setEditingResource(null);
  };

  const handleDownload = async (resource: Resource) => {
    try {
      // If resource has Base64 data in Firestore (new format)
      if (resource.id || resource._id) {
        const { files } = await getDocumentWithBase64(
          "academic_resources",
          resource.id || resource._id || "",
        );
        if (files?.resource) {
          downloadBase64File(files.resource);
          toast.success("Download started");
          return;
        }
      }
      // Fallback to fileBase64 (old format)
      if (resource.fileBase64) {
        downloadBase64File({
          data: resource.fileBase64,
          fileName: resource.fileName,
          mimeType: resource.fileType,
          size: 0, // Size is optional, set to 0 or actual size if available
          timestamp: Date.now(),
        });
        toast.success("Download started");
        return;
      }
      // Fallback to URL if available
      if (resource.fileUrl) {
        window.open(resource.fileUrl, "_blank");
      } else {
        toast.error("File not available for download");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const columns = [
    { key: "title", header: "Title" },
    { key: "subject", header: "Subject" },
    { key: "semester", header: "Semester" },
    { key: "resourceType", header: "Type" },
    {
      key: "fileName",
      header: "File",
      render: (resource: Resource) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{resource.fileName}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Uploaded",
      render: (resource: Resource) =>
        new Date(resource.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (resource: Resource) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleDownload(resource)}
            className="text-green-600 hover:text-green-900"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(resource)}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(resource._id || resource.id || "")}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            Academic Resources
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage educational materials and resources
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="h-5 w-5" />
          <span>Add Resource</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <Table data={resources} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingResource ? "Edit Resource" : "Add New Resource"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester
              </label>
              <input
                type="text"
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 7th"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={formData.resourceType}
                onChange={(e) =>
                  setFormData({ ...formData, resourceType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Past Paper">Past Paper</option>
                <option value="Assignment">Assignment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File (PDF, DOCX, Images, Videos)
            </label>
            <div className="mt-1">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.webm,.ogg"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required={!editingResource}
              />
              <p className="mt-1 text-xs text-gray-500">
                Max file size: 25MB. Supported: PDF, DOCX, Images (JPG, PNG),
                Videos (MP4, WEBM, OGG)
              </p>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Upload className="h-4 w-4" />
                  <span>
                    Selected: {selectedFile.name} (
                    {formatFileSize(selectedFile.size)})
                  </span>
                </div>
              )}
              {editingResource && !selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>Current file: {editingResource.fileName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end sm:space-x-3 pt-4 gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 w-full sm:w-auto"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto justify-center"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>{editingResource ? "Update" : "Upload"} Resource</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicResources;
