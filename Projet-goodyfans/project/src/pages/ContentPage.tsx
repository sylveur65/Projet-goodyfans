import React, { useState, useEffect } from 'react';
import { Plus, Video, Image, DollarSign, Eye, Edit, Trash2, Upload, ExternalLink, Calendar, ToggleLeft, ToggleRight, Search, Filter, Share2, Copy, Link as LinkIcon } from 'lucide-react';
import { ContentForm } from '../components/ContentForm';
import { getUserContent, deleteContent, toggleContentStatus, formatPrice, isContentExpired, calculateExpiryDate, type Content } from '../lib/content';
import { getFileCategory } from '../lib/cloudflare';
import toast from 'react-hot-toast';

export const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const userContent = await getUserContent();
      setContent(userContent);
    } catch (error: any) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContent = () => {
    setEditingContent(null);
    setShowForm(true);
  };

  const handleEditContent = (contentItem: Content) => {
    setEditingContent(contentItem);
    setShowForm(true);
  };

  const handleDeleteContent = async (contentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await deleteContent(contentId);
      setContent(prev => prev.filter(item => item.id !== contentId));
      toast.success('Content deleted successfully');
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleToggleStatus = async (contentId: string, currentStatus: boolean) => {
    try {
      await toggleContentStatus(contentId, !currentStatus);
      setContent(prev => prev.map(item => 
        item.id === contentId 
          ? { ...item, is_active: !currentStatus }
          : item
      ));
      toast.success(`Content ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Error toggling content status:', error);
      toast.error('Failed to update content status');
    }
  };

  const handleFormSuccess = () => {
    loadContent();
  };

  const generatePurchaseUrl = (contentId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/buy/${contentId}`;
  };

  const handleCopyPurchaseLink = async (contentId: string, title: string) => {
    const purchaseUrl = generatePurchaseUrl(contentId);
    
    try {
      await navigator.clipboard.writeText(purchaseUrl);
      toast.success(`Purchase link copied for "${title}"!`);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = purchaseUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`Purchase link copied for "${title}"!`);
    }
  };

  const handleShareContent = (contentId: string, title: string) => {
    const purchaseUrl = generatePurchaseUrl(contentId);
    
    if (navigator.share) {
      navigator.share({
        title: `Check out: ${title}`,
        text: `I'm sharing exclusive content with you!`,
        url: purchaseUrl,
      }).catch(console.error);
    } else {
      handleCopyPurchaseLink(contentId, title);
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'active' && item.is_active) ||
                      (activeTab === 'draft' && !item.is_active);
    
    return matchesSearch && matchesTab;
  });

  const getContentIcon = (contentItem: Content) => {
    if (contentItem.content_type === 'link') {
      return <ExternalLink className="w-5 h-5 text-purple-600" />;
    }
    
    if (contentItem.media?.mime_type) {
      const category = getFileCategory(contentItem.media.mime_type);
      switch (category) {
        case 'image':
          return <Image className="w-5 h-5 text-blue-600" />;
        case 'video':
          return <Video className="w-5 h-5 text-red-600" />;
        default:
          return <Video className="w-5 h-5 text-green-600" />;
      }
    }
    
    return <Video className="w-5 h-5 text-gray-600" />;
  };

  const getStatusBadge = (contentItem: Content) => {
    const expired = isContentExpired(contentItem.created_at, contentItem.expiry_days);
    
    if (expired) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Expired</span>;
    }
    
    if (contentItem.is_active) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
    }
    
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Draft</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getExpiryInfo = (contentItem: Content) => {
    if (!contentItem.expiry_days) return 'Never expires';
    
    const expiryDate = calculateExpiryDate(contentItem.created_at, contentItem.expiry_days);
    if (!expiryDate) return 'Never expires';
    
    const expired = isContentExpired(contentItem.created_at, contentItem.expiry_days);
    if (expired) return 'Expired';
    
    return `Expires ${formatDate(expiryDate.toISOString())}`;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
            <p className="text-gray-600 mt-2">Create and manage your PPV content</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600 mt-2">Create content and share purchase links with your audience</p>
        </div>
        <button 
          onClick={handleCreateContent}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Content</span>
        </button>
      </div>

      {/* Guest Checkout Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Share2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🚀 Guest Checkout System</h3>
            <p className="text-gray-700 mb-3">
              Your content now supports <strong>guest checkout</strong> - no account required for buyers! 
              Share purchase links anywhere and customers can buy instantly with just their email.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>No signup friction for buyers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Instant access after payment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Higher conversion rates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 border border-white shadow-lg">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All Content', count: content.length },
              { key: 'active', label: 'Active', count: content.filter(item => item.is_active).length },
              { key: 'draft', label: 'Drafts', count: content.filter(item => !item.is_active).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchTerm ? 'No content found' : 'Ready to create your first content?'}
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {searchTerm 
                ? 'Try adjusting your search terms or filters.'
                : 'Create premium content and get shareable purchase links. Your customers can buy instantly without creating accounts!'
              }
            </p>
            
            {!searchTerm && (
              <button 
                onClick={handleCreateContent}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Content</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContent.map((contentItem) => (
            <div
              key={contentItem.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
            >
              {/* Content Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getContentIcon(contentItem)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {contentItem.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {contentItem.content_type === 'media' ? 'Media File' : 'External Link'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(contentItem)}
                </div>

                {/* Description */}
                {contentItem.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {contentItem.description}
                  </p>
                )}

                {/* Content Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-semibold text-green-600">
                      {formatPrice(contentItem.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Views:</span>
                    <span className="font-medium text-gray-900">
                      {contentItem.view_count}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Sales:</span>
                    <span className="font-medium text-gray-900">
                      {contentItem.purchase_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires:</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {getExpiryInfo(contentItem)}
                    </span>
                  </div>
                </div>

                {/* Purchase Link Section */}
                {contentItem.is_active && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-purple-900">Purchase Link</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopyPurchaseLink(contentItem.id, contentItem.title)}
                          className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Copy purchase link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShareContent(contentItem.id, contentItem.title)}
                          className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Share content"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-2 text-xs font-mono text-purple-800 break-all">
                      {generatePurchaseUrl(contentItem.id)}
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      Share this link anywhere - customers can buy without creating an account!
                    </p>
                  </div>
                )}

                {/* Content Preview */}
                {contentItem.content_type === 'media' && contentItem.media && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      {getContentIcon(contentItem)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contentItem.media.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(contentItem.media.file_size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {contentItem.content_type === 'link' && contentItem.external_url && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <p className="text-sm text-gray-900 truncate">
                        {contentItem.external_url}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditContent(contentItem)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit content"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContent(contentItem.id, contentItem.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete content"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleToggleStatus(contentItem.id, contentItem.is_active)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      contentItem.is_active
                        ? 'text-green-700 bg-green-50 hover:bg-green-100'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={contentItem.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {contentItem.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    <span>{contentItem.is_active ? 'Active' : 'Draft'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Form Modal */}
      <ContentForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        editingContent={editingContent}
      />

      {/* Updated Tips Section */}
      {content.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Guest Checkout Benefits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">🚀 Higher Conversion Rates</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• No signup friction - customers buy instantly</li>
                <li>• Share links on social media, messaging apps</li>
                <li>• Works great for viral content sharing</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-2">💰 Platform Revenue</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Platform takes 15% commission on all sales</li>
                <li>• You keep 85% of every purchase</li>
                <li>• Payments processed securely via Stripe</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};