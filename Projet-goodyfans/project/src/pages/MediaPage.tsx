import React, { useState, useEffect } from 'react';
import { Upload, Image, Video, FileText, Search, Grid, List, Plus, Trash2, Eye, Download, Play, Shield, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { getUserMediaFiles, deleteFile, getFileCategory, formatFileSize, generateSecureAccessUrl, cleanupOrphanedR2Files } from '../lib/cloudflare';
import { supabase } from '../lib/supabase';
import { moderateAllExistingMedia } from '../lib/moderation';
import toast from 'react-hot-toast';

interface MediaFile {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  cloudflare_url: string;
  thumbnail_url?: string;
  created_at: string;
}

interface ModerationStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  auto_result?: {
    confidence: number;
    categories: {
      adult: number;
      violence: number;
      hate: number;
      selfHarm: number;
    };
    flags: string[];
    reason?: string;
  };
  created_at: string;
}

export const MediaPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [moderationStatuses, setModerationStatuses] = useState<Record<string, ModerationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [moderatingAll, setModeratingAll] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load media files on component mount
  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      const files = await getUserMediaFiles();
      setMediaFiles(files);
      
      // Load moderation statuses for content that uses these media files
      await loadModerationStatuses(files);
    } catch (error: any) {
      console.error('Error loading media files:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStatuses = async (files: MediaFile[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get content that uses these media files
      const { data: content, error: contentFetchError } = await supabase
        .from('ppvcontent')
        .select('id, media_id')
        .eq('creator_id', user.id)
        .not('media_id', 'is', null);

      if (contentFetchError) {
        console.error('❌ Error fetching associated content:', contentFetchError);
        return;
      }

      if (!content || content.length === 0) {
        console.log('📋 No associated content found');
      } else {
        console.log(`📋 Found ${content.length} associated content items`);
      }

      const contentIds = content?.map(c => c.id) || [];

      // Get moderation records for this content
      const { data: moderation, error: moderationError } = await supabase
        .from('content_moderation')
        .select('*')
        .in('content_id', contentIds)
        .order('created_at', { ascending: false });

      if (moderationError) {
        console.error('Error loading moderation data:', moderationError);
        return;
      }

      // Map moderation data to media files
      const statusMap: Record<string, ModerationStatus> = {};
      
      moderation?.forEach(mod => {
        const contentItem = content.find(c => c.id === mod.content_id);
        if (contentItem?.media_id) {
          statusMap[contentItem.media_id] = {
            id: mod.id,
            status: mod.status,
            auto_result: mod.auto_result,
            created_at: mod.created_at,
          };
        }
      });

      // 🎯 FIXED: Also check for direct media moderation records
      if (files.length > 0) {
        const mediaIds = files.map(f => f.id);
        
        const { data: directModeration, error: directModerationError } = await supabase
          .from('content_moderation')
          .select('*')
          .in('content_id', mediaIds)
          .order('created_at', { ascending: false });

        if (!directModerationError && directModeration) {
          console.log(`📋 Found ${directModeration.length} direct media moderation records`);
          directModeration.forEach(mod => {
            statusMap[mod.content_id] = {
              id: mod.id,
              status: mod.status,
              auto_result: mod.auto_result,
              created_at: mod.created_at,
            };
          });
        }
      }

      setModerationStatuses(statusMap);
    } catch (error) {
      console.error('Error loading moderation statuses:', error);
    }
  };

  const handleUploadComplete = (fileData: any) => {
    console.log('Upload completed:', fileData);
    // Refresh the media files list
    refreshMediaAndModeration();
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await deleteFile(fileId);
      setMediaFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleModerateAllMedia = async () => {
    if (!confirm('Are you sure you want to moderate all media files? This may take a while.')) {
      return;
    }

    setModeratingAll(true);
    
    try {
      const result = await moderateAllExistingMedia();
      
      toast.success(
        `Moderation completed! ${result.processed} media files processed: ${result.approved} approved, ${result.rejected} rejected, ${result.pending} pending.`
      );

      if (result.errors.length > 0) {
        console.warn('Moderation errors:', result.errors);
        toast.error(`${result.errors.length} errors occurred during moderation. See console for details.`);
      }

      // Reload media files and moderation statuses
      await refreshMediaAndModeration();

    } catch (error: any) {
      console.error('Error during bulk moderation:', error);
      toast.error('Failed to moderate all media files');
    } finally {
      setModeratingAll(false);
    }
  };

  const handleCleanupOrphanedFiles = async () => {
    if (!confirm('Are you sure you want to clean up orphaned files in Cloudflare R2? This will delete any files that are not referenced in the database.')) {
      return;
    }

    setCleaningUp(true);
    
    try {
      const result = await cleanupOrphanedR2Files();
      
      if (result.cleaned > 0) {
        toast.success(`Cleanup completed! ${result.cleaned} orphaned files removed from R2.`);
      } else {
        toast.success('No orphaned files found. Your storage is clean!');
      }

      if (result.errors.length > 0) {
        console.warn('Cleanup errors:', result.errors);
        toast.error(`${result.errors.length} errors occurred during cleanup. See console for details.`);
      }

    } catch (error: any) {
      console.error('Error during R2 cleanup:', error);
      toast.error('Failed to clean up orphaned files');
    } finally {
      setCleaningUp(false);
    }
  };

  const refreshMediaAndModeration = async () => {
    setRefreshing(true);
    try {
      await loadMediaFiles();
      toast.success('Media files and moderation statuses refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredFiles = mediaFiles.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || getFileCategory(file.mime_type) === filterType;
    return matchesSearch && matchesFilter;
  });

  const getModerationBadge = (fileId: string) => {
    const moderation = moderationStatuses[fileId];
    if (!moderation) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center space-x-1">
          <Shield className="w-3 h-3" />
          <span>Not analyzed</span>
        </span>
      );
    }

    switch (moderation.status) {
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getModerationDetails = (fileId: string) => {
    const moderation = moderationStatuses[fileId];
    if (!moderation?.auto_result) return null;

    const { confidence, categories, flags, reason } = moderation.auto_result;

    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h5 className="text-sm font-medium text-blue-900 mb-2">🤖 AI Analysis</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-blue-700">Confidence:</span>
            <span className="font-medium text-blue-900 ml-1">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-blue-700">Adult:</span>
            <span className="font-medium text-blue-900 ml-1">{(categories.adult * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-blue-700">Violence:</span>
            <span className="font-medium text-blue-900 ml-1">{(categories.violence * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-blue-700">Hate:</span>
            <span className="font-medium text-blue-900 ml-1">{(categories.hate * 100).toFixed(1)}%</span>
          </div>
        </div>
        {flags.length > 0 && (
          <div className="mt-2">
            <span className="text-blue-700 text-xs">Flags:</span>
            <span className="text-blue-900 text-xs ml-1">{flags.join(', ')}</span>
          </div>
        )}
        {reason && (
          <div className="mt-2">
            <span className="text-blue-700 text-xs">Reason:</span>
            <span className="text-blue-900 text-xs ml-1">{reason}</span>
          </div>
        )}
      </div>
    );
  };

  const getMediaPreview = (file: MediaFile) => {
    const category = getFileCategory(file.mime_type);
    const imageUrl = file.thumbnail_url || generateSecureAccessUrl(file.cloudflare_url);
    
    if (category === 'image') {
      return (
        <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden group">
          <img 
            src={imageUrl} 
            alt={file.filename}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
            <Image className="w-12 h-12 text-blue-600" />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
                  if (secureUrl.startsWith('data:')) {
                    const newWindow = window.open();
                    if (newWindow) {
                      newWindow.document.write(`<img src="${secureUrl}" style="max-width:100%;height:auto;" alt="${file.filename}">`);
                    }
                  } else {
                    window.open(secureUrl, '_blank');
                  }
                }}
                className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                title="View full size"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      );
    } else if (category === 'video') {
      return (
        <div className="relative w-full h-48 bg-gray-900 rounded-xl overflow-hidden group flex items-center justify-center">
          {file.thumbnail_url ? (
            <>
              <img 
                src={file.thumbnail_url} 
                alt={file.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-16 h-16 text-white/90" />
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-purple-600/20"></div>
              <Play className="w-16 h-16 text-white/80 group-hover:text-white transition-colors" />
            </>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            VIDEO
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
                if (secureUrl.startsWith('data:')) {
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`<video controls style="max-width:100%;height:auto;"><source src="${secureUrl}" type="${file.mime_type}"></video>`);
                  }
                } else {
                  window.open(secureUrl, '_blank');
                }
              }}
              className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
              title="Play video"
            >
              <Play className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative w-full h-48 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl overflow-hidden group flex items-center justify-center">
          <FileText className="w-16 h-16 text-green-600 group-hover:text-green-700 transition-colors" />
          <div className="absolute bottom-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded uppercase">
            {file.mime_type.split('/')[1] || 'DOC'}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
                if (secureUrl.startsWith('data:')) {
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`<iframe src="${secureUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
                  }
                } else {
                  window.open(secureUrl, '_blank');
                }
              }}
              className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
              title="Open document"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      );
    }
  };

  const getListPreview = (file: MediaFile) => {
    const category = getFileCategory(file.mime_type);
    const imageUrl = file.thumbnail_url || generateSecureAccessUrl(file.cloudflare_url);
    
    if (category === 'image') {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={imageUrl} 
            alt={file.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center">
            <Image className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      );
    } else if (category === 'video') {
      return (
        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          {file.thumbnail_url ? (
            <>
              <img 
                src={file.thumbnail_url} 
                alt={file.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
            </>
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </div>
      );
    } else {
      return (
        <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-green-600" />
        </div>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (file: MediaFile) => {
    const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
    
    if (secureUrl.startsWith('data:')) {
      // For data URLs, create a download link
      const link = document.createElement('a');
      link.href = secureUrl;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For regular URLs, open in new tab (browser will handle download)
      window.open(secureUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
            <p className="text-gray-600 mt-2">Manage your media files and assets</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-2">Upload and manage your media files with AI moderation</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={refreshMediaAndModeration}
            disabled={refreshing}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {refreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
          <button 
            onClick={handleModerateAllMedia}
            disabled={moderatingAll}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {moderatingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Moderating...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Moderate All</span>
              </>
            )}
          </button>
          <button 
            onClick={handleCleanupOrphanedFiles}
            disabled={cleaningUp}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {cleaningUp ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Cleanup R2</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setShowUpload(!showUpload)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>{showUpload ? 'Hide Upload' : 'Upload Files'}</span>
          </button>
        </div>
      </div>

      {/* Azure Moderation Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Content Moderation</h3>
            <p className="text-gray-700 mb-3">
              All your media files are automatically analyzed by AI to detect inappropriate content. The moderation happens in real-time when you upload files.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Automatic image analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Adult content detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>AI confidence scoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload New Files</h3>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadStart={() => console.log('Upload started')}
            maxFiles={10}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xl rounded-lg p-1 border border-white shadow-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Image className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchTerm || filterType !== 'all' ? 'No files found' : 'Ready to upload your first files?'}
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload images, videos, and documents that you\'ll use in your content creation.'
              }
            </p>
            
            {!searchTerm && filterType === 'all' && (
              <button 
                onClick={() => setShowUpload(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Upload Your First Files</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${
                viewMode === 'grid' ? 'p-0' : 'p-4'
              }`}
            >
              {viewMode === 'grid' ? (
                // Grid View with Thumbnails
                <div>
                  {/* Media Preview */}
                  {getMediaPreview(file)}
                  
                  {/* File Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 truncate flex-1" title={file.filename}>
                        {file.filename}
                      </h4>
                      {getModerationBadge(file.id)}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="capitalize">{getFileCategory(file.mime_type)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                      {formatDate(file.created_at)}
                    </p>

                    {/* Moderation Details */}
                    {getModerationDetails(file.id)}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
                            if (secureUrl.startsWith('data:')) {
                              const newWindow = window.open();
                              if (newWindow) {
                                if (getFileCategory(file.mime_type) === 'image') {
                                  newWindow.document.write(`<img src="${secureUrl}" style="max-width:100%;height:auto;" alt="${file.filename}">`);
                                } else if (getFileCategory(file.mime_type) === 'video') {
                                  newWindow.document.write(`<video controls style="max-width:100%;height:auto;"><source src="${secureUrl}" type="${file.mime_type}"></video>`);
                                } else {
                                  newWindow.document.write(`<iframe src="${secureUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
                                }
                              }
                            } else {
                              window.open(secureUrl, '_blank');
                            }
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.filename)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // List View with Small Previews
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Small Preview */}
                    {getListPreview(file)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {file.filename}
                        </h4>
                        {getModerationBadge(file.id)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.file_size)} • {formatDate(file.created_at)} • {getFileCategory(file.mime_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const secureUrl = generateSecureAccessUrl(file.cloudflare_url);
                        if (secureUrl.startsWith('data:')) {
                          const newWindow = window.open();
                          if (newWindow) {
                            if (getFileCategory(file.mime_type) === 'image') {
                              newWindow.document.write(`<img src="${secureUrl}" style="max-width:100%;height:auto;" alt="${file.filename}">`);
                            } else if (getFileCategory(file.mime_type) === 'video') {
                              newWindow.document.write(`<video controls style="max-width:100%;height:auto;"><source src="${secureUrl}" type="${file.mime_type}"></video>`);
                            } else {
                              newWindow.document.write(`<iframe src="${secureUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
                            }
                          }
                        } else {
                          window.open(secureUrl, '_blank');
                        }
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View file"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.filename)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};