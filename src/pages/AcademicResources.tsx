import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Download, Upload, FileText } from 'lucide-react';
import Table from '../components/UI/Table';
import Modal from '../components/UI/Modal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { uploadFile } from '../utils/firebaseStorage';
import { 
  fileToBase64, 
  base64ToDataURL, 
  validateFileType, 
  validateFileSize,
  formatFileSize,
  downloadBase64File,
  Base64Data 
} from '../utils/base64Utils';
import { 
  addAcademicResource, 
  getDocuments, 
  updateDocumentWithBase64,
  deleteDocument,
  getDocumentWithBase64 
} from '../utils/firestore';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Resource {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  fileUrl?: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
  files?: {
    resource?: Base64Data;
  };
}

const AcademicResources: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Try to fetch from Firestore
      const firestoreResources = await getDocuments('academic_resources');
      
      if (firestoreResources && firestoreResources.length > 0) {
        setResources(firestoreResources.map(r => ({
          ...r,
          _id: r.id,
          fileName: r.files?.resource?.fileName || r.fileName || '',
          fileType: r.files?.resource?.mimeType || r.fileType || '',
        })));
      } else {
        // Mock data for demo
        setResources([
          {
            _id: '1',
            title: 'Computer Science Notes',
            description: 'Comprehensive notes for CS101',
            category: 'Computer Science',
            fileUrl: 'https://example.com/cs-notes.pdf',
            fileName: 'cs-notes.pdf',
            fileType: 'application/pdf',
            uploadedBy: 'Admin',
            createdAt: new Date().toISOString(),
          },
          {
            _id: '2',
            title: 'Mathematics Study Guide',
            description: 'Calculus and Linear Algebra resources',
            category: 'Mathematics',
            fileUrl: 'https://example.com/math-guide.docx',
            fileName: 'math-guide.docx',
            fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            uploadedBy: 'Admin',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'video/mp4',
        'video/webm',
        'video/ogg',
      ];
      
      const typeValidation = validateFileType(file, allowedTypes);
      if (!typeValidation.valid) {
        toast.error(typeValidation.error || 'Invalid file type');
        e.target.value = '';
        return;
      }

      const maxSize = 25; // 25MB for Base64 storage
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || 'File too large');
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      toast.success(`File "${file.name}" selected (${formatFileSize(file.size)})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingResource && !selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      let base64FileData: Base64Data | undefined;

      // Convert file to Base64 if a new one is selected
      if (selectedFile) {
        base64FileData = await fileToBase64(selectedFile);
        toast.success('File encoded successfully');
      }

      if (editingResource) {
        // Update existing resource
        const updateData: any = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
        };

        const files: any = {};
        if (base64FileData) {
          files.resource = base64FileData;
          updateData.fileName = base64FileData.fileName;
          updateData.fileType = base64FileData.mimeType;
        }

        const resourceId = editingResource._id || editingResource.id || '';
        await updateDocumentWithBase64(
          'academic_resources',
          resourceId,
          updateData,
          Object.keys(files).length > 0 ? files : undefined
        );

        // Log the update
        if (user) {
          await logUpdate(user, 'academic_resources', resourceId, {
            title: formData.title,
            category: formData.category,
            fileUpdated: !!base64FileData
          });
        }

        toast.success('Resource updated successfully!');
      } else {
        // Create new resource
        if (!base64FileData) {
          toast.error('File encoding failed');
          return;
        }

        const newResourceId = await addAcademicResource({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          fileData: base64FileData,
          uploadedBy: user?.email || 'Admin',
        });

        // Log the creation
        if (user) {
          await logCreate(user, 'academic_resources', newResourceId || 'unknown', {
            title: formData.title,
            category: formData.category,
            fileName: base64FileData.fileName
          });
        }

        toast.success('Resource uploaded successfully to Firestore!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        // Find the resource for logging
        const resourceToDelete = resources.find(r => (r._id || r.id) === id);
        
        await deleteDocument('academic_resources', id);
        
        // Log the deletion
        if (user) {
          await logDelete(user, 'academic_resources', id, {
            title: resourceToDelete?.title,
            category: resourceToDelete?.category
          });
        }
        
        toast.success('Resource deleted successfully');
        fetchResources();
      } catch (error) {
        console.error('Error deleting resource:', error);
        toast.error('Failed to delete resource');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
    });
    setSelectedFile(null);
    setEditingResource(null);
  };

  const handleDownload = async (resource: Resource) => {
    try {
      // If resource has Base64 data in Firestore
      if (resource.id || resource._id) {
        const { files } = await getDocumentWithBase64('academic_resources', resource.id || resource._id || '');
        if (files?.resource) {
          downloadBase64File(files.resource);
          toast.success('Download started');
          return;
        }
      }
      
      // Fallback to URL if available
      if (resource.fileUrl) {
        window.open(resource.fileUrl, '_blank');
      } else {
        toast.error('File not available for download');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'category', header: 'Subject' },
    { key: 'description', header: 'Description' },
    {
      key: 'fileName',
      header: 'File',
      render: (resource: Resource) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{resource.fileName}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      render: (resource: Resource) =>
        new Date(resource.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
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
            onClick={() => handleDelete(resource._id || resource.id || '')}
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Academic Resources
          </h1>
          <p className="text-gray-600 mt-1">
            Manage educational materials and resources
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Resource
        </button>
      </div>

      <Table data={resources} columns={columns} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingResource ? 'Edit Resource' : 'Add New Resource'}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
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
                Max file size: 25MB. Supported: PDF, DOCX, Images (JPG, PNG), Videos (MP4, WEBM, OGG)
              </p>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Upload className="h-4 w-4" />
                  <span>Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  {editingResource ? 'Update' : 'Upload'} Resource
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicResources;
