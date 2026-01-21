import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Upload, Image as ImageIcon } from 'lucide-react';
import { Item } from '../types';
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
} from '../utils/base64Utils';
import {
  addLostAndFoundItem,
  getDocuments,
  updateDocumentWithBase64,
  deleteDocument,
} from '../utils/firestore';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger';
import { useAuth } from '../context/AuthContext';

const Items: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Item>>();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      // Try Firestore first
      try {
        const firestoreItems = await getDocuments('lostNfound');
        if (firestoreItems && firestoreItems.length > 0) {
          const mappedItems = firestoreItems.map(item => ({
            _id: item.id || '',
            id: item.id || '',
            title: item.title || '',
            description: item.description || '',
            price: typeof item.price === 'number' ? item.price : 0,
            category: item.category || '',
            imageUrl: item.imageUrl || '',
            isActive: item.isActive !== false,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          }));
          setItems(mappedItems as Item[]);
          setLoading(false);
          return;
        }
      } catch (firestoreError) {
        console.log('Firestore not available:', firestoreError);
      }

      // Try API
      try {
        const response = await api.get('/items', {
          headers: { 'X-Silent-Error': 'true' }
        });
        console.log('API response:', response.data);
        if (response.data && Array.isArray(response.data)) {
          setItems(response.data);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API not available:', apiError);
      }

      // Use mock data as fallback
      console.log('Using mock data');
      const mockData: Item[] = [
        {
          _id: '1',
          title: 'Lost Laptop',
          description: 'Dell XPS 15 laptop found in library',
          price: 0,
          category: 'Electronics',
          imageUrl: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: '2',
          title: 'Found Backpack',
          description: 'Blue Nike backpack found in cafeteria',
          price: 0,
          category: 'Clothing',
          imageUrl: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: '3',
          title: 'Lost Keys',
          description: 'Set of keys with Toyota keychain found in parking lot',
          price: 0,
          category: 'Other',
          imageUrl: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setItems(mockData);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setError('Failed to load items. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    reset();
    setSelectedCategory('');
    setCustomCategory('');
    setSelectedFile(null);
    setPreviewUrl('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setValue('title', item.title);
    setValue('description', item.description);
    setValue('price', item.price);
    setValue('category', item.category);
    setValue('imageUrl', item.imageUrl);
    setValue('isActive', item.isActive);
    
    // Check if category is a predefined one or custom
    const predefinedCategories = ['electronics', 'clothing', 'home', 'sports', 'books'];
    if (predefinedCategories.includes(item.category.toLowerCase())) {
      setSelectedCategory(item.category);
      setCustomCategory('');
    } else {
      setSelectedCategory('other');
      setCustomCategory(item.category);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Try Firestore delete first
      await deleteDocument('lostNfound', itemId);
      
      // Log the delete action
      if (user) {
        await logDelete(
          { uid: user.uid, email: user.email || 'unknown' },
          'ITEMS',
          itemId,
          { action: 'deleted_lost_found_item' }
        );
      }
      
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (firestoreError) {
      // Try API delete
      try {
        await api.delete(`/items/${itemId}`);
        setItems(items.filter(item => item._id !== itemId));
        toast.success('Item deleted successfully');
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const onSubmit = async (data: Partial<Item>) => {
    setIsSubmitting(true);
    try {
      // Use custom category if "other" is selected
      const finalCategory = selectedCategory === 'other' ? customCategory : data.category;
      
      let imageData: Base64Data | undefined;
      if (selectedFile) {
        imageData = await fileToBase64(selectedFile);
      }
      
      if (editingItem) {
        // Update using Firestore
        const updateData: any = {
          title: data.title,
          description: data.description,
          price: data.price || 0,
          category: finalCategory,
          isActive: data.isActive !== undefined ? data.isActive : true,
        };

        const files: any = {};
        if (imageData) {
          files.image = imageData;
        }

        await updateDocumentWithBase64(
          'lostNfound',
          editingItem._id || editingItem.id || '',
          updateData,
          Object.keys(files).length > 0 ? files : undefined
        );
        
        // Log the update action
        if (user) {
          await logUpdate(
            { uid: user.uid, email: user.email || 'unknown' },
            'ITEMS',
            editingItem._id || editingItem.id || '',
            { title: data.title, category: finalCategory }
          );
        }
        
        toast.success('Item updated successfully');
        fetchItems();
      } else {
        // Create new item using Firestore
        const newItemId = await addLostAndFoundItem({
          title: data.title || '',
          description: data.description || '',
          price: data.price || 0,
          category: finalCategory || '',
          isActive: true,
          imageData,
        });
        
        // Log the create action
        if (user) {
          await logCreate(
            { uid: user.uid, email: user.email || 'unknown' },
            'ITEMS',
            newItemId,
            { title: data.title, category: finalCategory }
          );
        }
        
        toast.success('Item created successfully');
        fetchItems();
      }
      
      setIsModalOpen(false);
      reset();
      setSelectedCategory('');
      setCustomCategory('');
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item: ' + (error as Error).message);
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
      key: 'category',
      header: 'Category',
      sortable: true,
    },
    {
      key: 'price',
      header: 'Price',
      render: (item: Item) => `$${(item.price ?? 0).toFixed(2)}`,
      sortable: true,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Item) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          item.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {item.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">lostNfound</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table data={items} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
        size="lg"
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
              Description
            </label>
            <textarea
              {...register('description', { required: true })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                {...register('price', { required: true, min: 0 })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                {...register('category', { required: true })}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="home">Home & Garden</option>
                <option value="sports">Sports</option>
                <option value="books">Books</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {selectedCategory === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Category
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

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
              Max size: 10MB. Supported: JPG, PNG, WEBP
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

          <div className="flex items-center">
            <input
              {...register('isActive')}
              type="checkbox"
              defaultChecked={true}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Active
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
              {isSubmitting ? <LoadingSpinner size="sm" /> : (editingItem ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Items;