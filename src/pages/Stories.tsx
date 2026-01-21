import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { Story } from '../types';
import api from '../utils/api';
import Table from '../components/UI/Table';
import Modal from '../components/UI/Modal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  fileToBase64,
  base64ToDataURL,
  validateFileType,
  validateFileSize,
  formatFileSize,
  Base64Data,
  isImageFile,
  isVideoFile,
} from '../utils/base64Utils';
import {
  addEvent,
  getDocuments,
  updateDocumentWithBase64,
  deleteDocument,
} from '../utils/firestore';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger';
import { useAuth } from '../context/AuthContext';

const Stories: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Story>>();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      // Try Firestore first
      const firestoreStories = await getDocuments('events');
      if (firestoreStories && firestoreStories.length > 0) {
        setStories(firestoreStories.map(story => ({ ...story, _id: story.id })));
        setLoading(false);
        return;
      }

      // Try API
      const response = await api.get('/stories', {
        headers: { 'X-Silent-Error': 'true' }
      });
      console.log('API response:', response.data);
      setStories(response.data);
    } catch (error) {
      // Backend not available - use mock data
      console.log('Backend not available, using mock data');
      const mockData = [
        {
          _id: '1',
          title: 'Tech Conference 2026',
          content: 'Annual technology conference featuring latest innovations in AI and machine learning',
          imageUrl: '',
          videoUrl: '',
          isPublished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: '2',
          title: 'Student Orientation Day',
          content: 'Welcome new students to campus with orientation activities and campus tours',
          imageUrl: '',
          videoUrl: '',
          isPublished: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: '3',
          title: 'Art Exhibition',
          content: 'Student artwork showcase featuring paintings, sculptures, and digital art',
          imageUrl: '',
          videoUrl: '',
          isPublished: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      console.log('Setting mock stories:', mockData);
      setStories(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingStory(null);
    reset();
    setSelectedImageFile(null);
    setSelectedVideoFile(null);
    setImagePreviewUrl('');
    setVideoPreviewUrl('');
    setIsModalOpen(true);
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setValue('title', story.title);
    setValue('content', story.content);
    setValue('imageUrl', story.imageUrl);
    setValue('videoUrl', story.videoUrl);
    setValue('isPublished', story.isPublished);
    setSelectedImageFile(null);
    setSelectedVideoFile(null);
    setImagePreviewUrl('');
    setVideoPreviewUrl('');
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const typeValidation = validateFileType(file, allowedTypes);
      
      if (!typeValidation.valid) {
        toast.error(typeValidation.error || 'Invalid file type');
        e.target.value = '';
        return;
      }

      const maxSize = 10; // 10MB
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || 'File too large');
        e.target.value = '';
        return;
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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      const typeValidation = validateFileType(file, allowedTypes);
      
      if (!typeValidation.valid) {
        toast.error(typeValidation.error || 'Invalid file type');
        e.target.value = '';
        return;
      }

      const maxSize = 50; // 50MB for videos
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || 'File too large');
        e.target.value = '';
        return;
      }

      setSelectedVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success(`Video selected (${formatFileSize(file.size)})`);
    }
  };

  const handleDelete = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      // Try Firestore delete first
      await deleteDocument('events', storyId);
      
      // Log the delete action
      if (user) {
        await logDelete(
          { uid: user.uid, email: user.email || 'unknown' },
          'STORIES',
          storyId,
          { action: 'deleted_story_event' }
        );
      }
      
      toast.success('Story deleted successfully');
      fetchStories();
    } catch (firestoreError) {
      // Try API delete
      try {
        await api.delete(`/stories/${storyId}`);
        setStories(stories.filter(story => story._id !== storyId));
        toast.success('Story deleted successfully');
      } catch (error) {
        console.error('Failed to delete story:', error);
        toast.error('Failed to delete story');
      }
    }
  };

  const onSubmit = async (data: Partial<Story>) => {
    setIsSubmitting(true);
    try {
      let imageData: Base64Data | undefined;
      let videoData: Base64Data | undefined;

      if (selectedImageFile) {
        imageData = await fileToBase64(selectedImageFile);
      }
      
      if (selectedVideoFile) {
        videoData = await fileToBase64(selectedVideoFile);
      }

      if (editingStory) {
        // Update using Firestore
        const updateData: any = {
          title: data.title,
          content: data.content,
          isPublished: data.isPublished !== undefined ? data.isPublished : false,
        };

        const files: any = {};
        if (imageData) {
          files.image = imageData;
        }
        if (videoData) {
          files.video = videoData;
        }

        await updateDocumentWithBase64(
          'events',
          editingStory._id || editingStory.id || '',
          updateData,
          Object.keys(files).length > 0 ? files : undefined
        );
        
        // Log the update action
        if (user) {
          await logUpdate(
            { uid: user.uid, email: user.email || 'unknown' },
            'STORIES',
            editingStory._id || editingStory.id || '',
            { title: data.title, isPublished: data.isPublished }
          );
        }
        
        toast.success('Story updated successfully');
        fetchStories();
      } else {
        // Create new story using Firestore
        const newStoryId = await addEvent({
          title: data.title || '',
          content: data.content || '',
          isPublished: data.isPublished || false,
          imageData,
          videoData,
        });
        
        // Log the create action
        if (user) {
          await logCreate(
            { uid: user.uid, email: user.email || 'unknown' },
            'STORIES',
            newStoryId,
            { title: data.title, isPublished: data.isPublished }
          );
        }
        
        toast.success('Story created successfully');
        fetchStories();
      }
      
      setIsModalOpen(false);
      reset();
      setSelectedImageFile(null);
      setSelectedVideoFile(null);
      setImagePreviewUrl('');
      setVideoPreviewUrl('');
    } catch (error) {
      console.error('Failed to save story:', error);
      toast.error('Failed to save story: ' + (error as Error).message);
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
      key: 'content',
      header: 'Content',
      render: (story: Story) => (
        <div className="max-w-xs truncate">
          {story.content}
        </div>
      ),
    },
    {
      key: 'isPublished',
      header: 'Status',
      render: (story: Story) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          story.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {story.isPublished ? 'Published' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (story: Story) => new Date(story.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (story: Story) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(story)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(story._id)}
            className="text-red-600 hover:text-red-900"
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
        <h1 className="text-2xl font-bold text-gray-900">Stories Management</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Story</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table data={stories} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStory ? 'Edit Story' : 'Add New Story'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register('title', { required: true })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              {...register('content', { required: true })}
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
              Max size: 10MB. Supported: JPG, PNG, WEBP, GIF
            </p>
            {selectedImageFile && imagePreviewUrl && (
              <div className="mt-2">
                <img 
                  src={imagePreviewUrl} 
                  alt="Preview" 
                  className="h-32 w-auto object-cover rounded-lg border"
                />
                <p className="text-xs text-green-600 mt-1">
                  {selectedImageFile.name} ({formatFileSize(selectedImageFile.size)})
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Video (Optional)
            </label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              onChange={handleVideoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Max size: 50MB. Supported: MP4, WEBM, OGG
            </p>
            {selectedVideoFile && videoPreviewUrl && (
              <div className="mt-2">
                <video 
                  src={videoPreviewUrl} 
                  controls
                  className="h-32 w-auto rounded-lg border"
                />
                <p className="text-xs text-green-600 mt-1">
                  {selectedVideoFile.name} ({formatFileSize(selectedVideoFile.size)})
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL (Alternative to upload)
              </label>
              <input
                {...register('imageUrl')}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL (Alternative to upload)
              </label>
              <input
                {...register('videoUrl')}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              {...register('isPublished')}
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
              {isSubmitting ? <LoadingSpinner size="sm" /> : (editingStory ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Stories;