import React, { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Calendar, DollarSign, FileText, Image, Video, Eye, ExternalLink } from 'lucide-react';
import { getUserMediaFiles, getFileCategory, formatFileSize } from '../lib/cloudflare';
import { createContent, updateContent } from '../lib/content';
import toast from 'react-hot-toast';

interface MediaFile {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  cloudflare_url: string;
  created_at: string;
}

interface ContentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingContent?: any;
}

export const ContentForm: React.FC<ContentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingContent
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    contentType: 'media' as 'media' | 'link',
    selectedMediaId: '',
    externalUrl: '',
    expiryDays: 'never' as 'never' | '2' | '3' | '7' | '14' | '30',
    isActive: true
  });

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Load media files when component mounts
  useEffect(() => {
    if (isOpen) {
      loadMediaFiles();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (editingContent) {
      setFormData({
        title: editingContent.title || '',
        description: editingContent.description || '',
        price: editingContent.price?.toString() || '',
        contentType: editingContent.external_url ? 'link' : 'media',
        selectedMediaId: editingContent.media_id || '',
        externalUrl: editingContent.external_url || '',
        expiryDays: editingContent.expiry_days?.toString() || 'never',
        isActive: editingContent.is_active ?? true
      });
    } else {
      // Reset form for new content
      setFormData({
        title: '',
        description: '',
        price: '',
        contentType: 'media',
        selectedMediaId: '',
        externalUrl: '',
        expiryDays: 'never',
        isActive: true
      });
    }
  }, [editingContent, isOpen]);

  const loadMediaFiles = async () => {
    try {
      setLoadingMedia(true);
      const files = await getUserMediaFiles();
      setMediaFiles(files);
    } catch (error) {
      console.error('Error loading media files:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (formData.contentType === 'media' && !formData.selectedMediaId) {
      toast.error('Please select a media file');
      return;
    }

    if (formData.contentType === 'link' && !formData.externalUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    // Validate URL format if link type
    if (formData.contentType === 'link') {
      try {
        new URL(formData.externalUrl);
      } catch {
        toast.error('Please enter a valid URL (e.g., https://example.com)');
        return;
      }
    }

    setLoading(true);

    try {
      const contentData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        content_type: formData.contentType,
        media_id: formData.contentType === 'media' ? formData.selectedMediaId : null,
        external_url: formData.contentType === 'link' ? formData.externalUrl.trim() : null,
        expiry_days: formData.expiryDays === 'never' ? null : parseInt(formData.expiryDays),
        is_active: formData.isActive
      };

      if (editingContent) {
        // Update existing content
        await updateContent(editingContent.id, contentData);
        toast.success('Content updated successfully!');
      } else {
        // Create new content
        await createContent(contentData);
        toast.success('Content created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedMedia = () => {
    return mediaFiles.find(file => file.id === formData.selectedMediaId);
  };

  const getFileIcon = (mimeType: string) => {
    const category = getFileCategory(mimeType);
    switch (category) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-green-600" />;
    }
  };

  const expiryOptions = [
    { value: 'never', label: 'Never expires' },
    { value: '2', label: '2 days' },
    { value: '3', label: '3 days' },
    { value: '7', label: '1 week' },
    { value: '14', label: '2 weeks' },
    { value: '30', label: '1 month' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingContent ? 'Edit Content' : 'Create New Content'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a catchy title for your content"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what buyers will get..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (USD) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="9.99"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Content Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, contentType: 'media', externalUrl: '' })}
                className={`p-4 border-2 rounded-xl transition-all ${
                  formData.contentType === 'media'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="font-medium text-gray-900">Media File</div>
                <div className="text-xs text-gray-500">From your library</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, contentType: 'link', selectedMediaId: '' })}
                className={`p-4 border-2 rounded-xl transition-all ${
                  formData.contentType === 'link'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LinkIcon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="font-medium text-gray-900">External Link</div>
                <div className="text-xs text-gray-500">URL to content</div>
              </button>
            </div>
          </div>

          {/* Media Selection */}
          {formData.contentType === 'media' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Media File *
              </label>
              {loadingMedia ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading media files...</p>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No media files found</p>
                  <p className="text-sm text-gray-400">Upload files in the Media Library first</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {mediaFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedMediaId: file.id })}
                      className={`p-3 border-2 rounded-xl text-left transition-all ${
                        formData.selectedMediaId === file.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.mime_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {file.filename}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.cloudflare_url, '_blank');
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* External URL */}
          {formData.contentType === 'link' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External URL *
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  placeholder="https://t.me/your-private-group or https://mega.nz/..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Examples: Telegram groups, Mega/Dropbox folders, private websites
              </p>
            </div>
          )}

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Duration
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.expiryDays}
                onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value as any })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                {expiryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              How long buyers will have access to this content
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-900">Publish Content</h4>
              <p className="text-sm text-gray-500">Make this content available for purchase</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Preview */}
          {(formData.selectedMediaId || formData.externalUrl) && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <h4 className="font-medium text-purple-900 mb-2">Content Preview</h4>
              {formData.contentType === 'media' && getSelectedMedia() && (
                <div className="flex items-center space-x-3">
                  {getFileIcon(getSelectedMedia()!.mime_type)}
                  <div>
                    <p className="font-medium text-purple-900">{getSelectedMedia()!.filename}</p>
                    <p className="text-sm text-purple-700">
                      {formatFileSize(getSelectedMedia()!.file_size)}
                    </p>
                  </div>
                </div>
              )}
              {formData.contentType === 'link' && formData.externalUrl && (
                <div className="flex items-center space-x-3">
                  <ExternalLink className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">External Link</p>
                    <p className="text-sm text-purple-700 break-all">{formData.externalUrl}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : editingContent ? 'Update Content' : 'Create Content'}
          </button>
        </div>
      </div>
    </div>
  );
};