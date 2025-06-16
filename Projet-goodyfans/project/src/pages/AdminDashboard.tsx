import React, { useState, useEffect } from 'react';
import { Users, Video, DollarSign, Shield, BarChart3, AlertTriangle, TrendingUp, Eye, Settings, Image, Download, Trash2, Edit, Play, FileText, Calendar, User, ExternalLink, RefreshCw, CheckCircle, Clock, X } from 'lucide-react';
import { ModerationDashboard } from '../components/ModerationDashboard';
import { supabase } from '../lib/supabase';
import { formatPrice, formatDate } from '../lib/content';
import { getFileCategory, formatFileSize } from '../lib/cloudflare';
import { moderateAllExistingMedia } from '../lib/moderation';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalCreators: number;
  totalBuyers: number;
  totalContent: number;
  totalMedia: number;
  totalRevenue: number;
  platformRevenue: number;
  pendingModeration: number;
}

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface ContentData {
  id: string;
  title: string;
  description?: string;
  price: number;
  content_type: string;
  is_active: boolean;
  view_count: number;
  purchase_count: number;
  created_at: string;
  creator: {
    full_name: string;
    email: string;
  };
  media?: {
    filename: string;
    mime_type: string;
    file_size: number;
    cloudflare_url: string;
    thumbnail_url?: string;
  };
}

interface MediaData {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  cloudflare_url: string;
  thumbnail_url?: string;
  created_at: string;
  creator: {
    full_name: string;
    email: string;
  };
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'not_analyzed';
  moderation_confidence?: number;
  moderation_flags?: string[];
}

interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'users' | 'content' | 'media' | 'analytics' | 'revenue'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCreators: 0,
    totalBuyers: 0,
    totalContent: 0,
    totalMedia: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    pendingModeration: 0,
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [content, setContent] = useState<ContentData[]>([]);
  const [media, setMedia] = useState<MediaData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderatingAll, setModeratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load each data type separately to avoid cascading failures
      try {
        await loadStats();
      } catch (statsError) {
        console.error('Error loading stats:', statsError);
        toast.error('Failed to load statistics');
      }
      
      try {
        await loadUsers();
      } catch (usersError) {
        console.error('Error loading users:', usersError);
        toast.error('Failed to load users');
      }
      
      try {
        await loadContent();
      } catch (contentError) {
        console.error('Error loading content:', contentError);
        toast.error('Failed to load content');
      }
      
      try {
        await loadMedia();
      } catch (mediaError) {
        console.error('Error loading media:', mediaError);
        toast.error('Failed to load media');
      }
      
      try {
        await loadRevenueData();
      } catch (revenueError) {
        console.error('Error loading revenue data:', revenueError);
        toast.error('Failed to load revenue data');
      }
      
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setError('Failed to load admin data. Please try refreshing the page.');
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Optimize queries to avoid stack depth errors
      // Load user statistics - only select id to minimize query complexity
      const { data: users, error: usersError } = await supabase
        .from('profile')
        .select('id, role');

      if (usersError) throw usersError;

      // Load content statistics - only select necessary fields
      const { data: content, error: contentError } = await supabase
        .from('ppvcontent')
        .select('id, price, purchase_count');

      if (contentError) throw contentError;

      // Load media statistics - only count
      const { count: mediaCount, error: mediaError } = await supabase
        .from('mediafile')
        .select('id', { count: 'exact', head: true });

      if (mediaError) throw mediaError;

      // Load purchase statistics - only select amount
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchase')
        .select('amount')
        .eq('status', 'completed');

      if (purchasesError) throw purchasesError;

      // Load moderation statistics - only count pending
      const { count: pendingCount, error: moderationError } = await supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (moderationError) {
        console.warn('Error loading moderation stats:', moderationError);
        // Continue without moderation stats
      }

      // Calculate statistics
      const totalUsers = users?.length || 0;
      const totalCreators = users?.filter(u => u.role === 'creator').length || 0;
      const totalBuyers = users?.filter(u => u.role === 'buyer').length || 0;
      const totalContent = content?.length || 0;
      const totalMedia = mediaCount || 0;
      const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const platformRevenue = totalRevenue * 0.15; // 15% commission
      const pendingModeration = pendingCount || 0;

      setStats({
        totalUsers,
        totalCreators,
        totalBuyers,
        totalContent,
        totalMedia,
        totalRevenue,
        platformRevenue,
        pendingModeration,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      // Optimize query to only fetch necessary fields
      const { data, error } = await supabase
        .from('profile')
        .select('id, email, full_name, role, email_verified, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to avoid performance issues

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  const loadContent = async () => {
    try {
      // Split the query into smaller parts to avoid stack depth errors
      const { data: contentData, error: contentError } = await supabase
        .from('ppvcontent')
        .select(`
          id, 
          title,
          description,
          price,
          content_type,
          is_active,
          view_count,
          purchase_count,
          created_at,
          creator_id,
          media_id
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to avoid performance issues

      if (contentError) throw contentError;
      
      if (!contentData || contentData.length === 0) {
        setContent([]);
        return;
      }

      // Get creator info separately
      const creatorIds = [...new Set(contentData.map(item => item.creator_id))];
      const { data: creators, error: creatorsError } = await supabase
        .from('profile')
        .select('id, full_name, email')
        .in('id', creatorIds);

      if (creatorsError) throw creatorsError;
      
      // Get media info separately
      const mediaIds = contentData
        .filter(item => item.media_id)
        .map(item => item.media_id);
      
      let mediaData: any[] = [];
      if (mediaIds.length > 0) {
        const { data: media, error: mediaError } = await supabase
          .from('mediafile')
          .select('id, filename, mime_type, file_size, cloudflare_url, thumbnail_url')
          .in('id', mediaIds);
        
        if (!mediaError) {
          mediaData = media || [];
        }
      }

      // Map creators and media to content
      const contentWithRelations = contentData.map(item => {
        const creator = creators?.find(c => c.id === item.creator_id) || { full_name: 'Unknown', email: 'unknown' };
        const media = item.media_id ? mediaData.find(m => m.id === item.media_id) : undefined;
        
        return {
          ...item,
          creator: {
            full_name: creator.full_name,
            email: creator.email
          },
          media
        };
      });

      setContent(contentWithRelations);
    } catch (error) {
      console.error('Error loading content:', error);
      throw error;
    }
  };

  const loadMedia = async () => {
    try {
      // Split the query into smaller parts to avoid stack depth errors
      const { data: mediaData, error: mediaError } = await supabase
        .from('mediafile')
        .select(`
          id,
          filename,
          file_size,
          mime_type,
          cloudflare_url,
          thumbnail_url,
          created_at,
          creator_id
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to avoid performance issues

      if (mediaError) throw mediaError;
      
      if (!mediaData || mediaData.length === 0) {
        setMedia([]);
        return;
      }

      // Get creator info separately
      const creatorIds = [...new Set(mediaData.map(item => item.creator_id))];
      const { data: creators, error: creatorsError } = await supabase
        .from('profile')
        .select('id, full_name, email')
        .in('id', creatorIds);

      if (creatorsError) throw creatorsError;

      // Get moderation status for each media in batches to avoid stack depth errors
      const mediaWithCreators = mediaData.map(mediaItem => {
        const creator = creators?.find(c => c.id === mediaItem.creator_id) || { full_name: 'Unknown', email: 'unknown' };
        
        return {
          ...mediaItem,
          creator: {
            full_name: creator.full_name,
            email: creator.email
          },
          moderation_status: 'not_analyzed' as const,
          moderation_confidence: 0,
          moderation_flags: []
        };
      });

      // Process in smaller batches
      const batchSize = 10;
      const mediaIds = mediaData.map(item => item.id);
      const moderationMap = new Map();
      
      for (let i = 0; i < mediaIds.length; i += batchSize) {
        const batchIds = mediaIds.slice(i, i + batchSize);
        
        try {
          const { data: moderationData } = await supabase
            .from('content_moderation')
            .select('content_id, status, auto_result')
            .in('content_id', batchIds)
            .order('created_at', { ascending: false });
          
          if (moderationData) {
            moderationData.forEach(mod => {
              if (!moderationMap.has(mod.content_id)) {
                moderationMap.set(mod.content_id, {
                  status: mod.status,
                  confidence: mod.auto_result?.confidence || 0,
                  flags: mod.auto_result?.flags || []
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Error loading moderation batch ${i}-${i+batchSize}:`, error);
        }
      }

      // Apply moderation data
      const mediaWithModeration = mediaWithCreators.map(item => {
        const moderation = moderationMap.get(item.id);
        if (moderation) {
          return {
            ...item,
            moderation_status: moderation.status,
            moderation_confidence: moderation.confidence,
            moderation_flags: moderation.flags
          };
        }
        return item;
      });

      setMedia(mediaWithModeration);
    } catch (error) {
      console.error('Error loading media:', error);
      throw error;
    }
  };

  const loadRevenueData = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase')
        .select('amount, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to avoid performance issues

      if (error) throw error;

      // Group by date
      const revenueByDate: { [key: string]: { revenue: number; transactions: number } } = {};
      
      data?.forEach(purchase => {
        const date = new Date(purchase.created_at).toISOString().split('T')[0];
        if (!revenueByDate[date]) {
          revenueByDate[date] = { revenue: 0, transactions: 0 };
        }
        revenueByDate[date].revenue += purchase.amount;
        revenueByDate[date].transactions += 1;
      });

      const revenueArray = Object.entries(revenueByDate)
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          transactions: data.transactions
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Last 30 days

      setRevenueData(revenueArray);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      throw error;
    }
  };

  const handleModerateAllMedia = async () => {
    if (!confirm('Are you sure you want to moderate all existing media? This operation may take several minutes.')) {
      return;
    }

    setModeratingAll(true);
    
    try {
      const result = await moderateAllExistingMedia();
      
      toast.success(
        `Moderation completed! ${result.processed} media processed: ${result.approved} approved, ${result.rejected} rejected, ${result.pending} pending.`
      );

      if (result.errors.length > 0) {
        console.warn('Moderation errors:', result.errors);
        toast.error(`${result.errors.length} errors during moderation. See console for details.`);
      }

      // Reload data
      await loadMedia();
      await loadStats();

    } catch (error: any) {
      console.error('Error during bulk moderation:', error);
      toast.error('Error during bulk moderation');
    } finally {
      setModeratingAll(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profile')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
      await loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user');
    }
  };

  const handleDeleteContent = async (contentId: string, contentTitle: string) => {
    if (!confirm(`Are you sure you want to delete content "${contentTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ppvcontent')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      setContent(prev => prev.filter(c => c.id !== contentId));
      toast.success('Content deleted successfully');
      await loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error('Error deleting content');
    }
  };

  const handleDeleteMedia = async (mediaId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete media "${filename}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mediafile')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success('Media deleted successfully');
      await loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error deleting media:', error);
      toast.error('Error deleting media');
    }
  };

  const getModerationBadge = (mediaItem: MediaData) => {
    switch (mediaItem.moderation_status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'not_analyzed':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Not analyzed
          </span>
        );
    }
  };

  const getMediaPreview = (mediaItem: MediaData) => {
    const category = getFileCategory(mediaItem.mime_type);
    const imageUrl = mediaItem.thumbnail_url || mediaItem.cloudflare_url;
    
    if (category === 'image') {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt={mediaItem.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
            <Image className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      );
    } else if (category === 'video') {
      return (
        <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden relative">
          {mediaItem.thumbnail_url ? (
            <>
              <img 
                src={mediaItem.thumbnail_url} 
                alt={mediaItem.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
        <FileText className="w-6 h-6 text-green-600" />
      </div>
    );
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'moderation', label: 'Moderation', icon: Shield },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'content', label: 'Content', icon: Video },
    { key: 'media', label: 'Media', icon: Image },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Complete platform administration</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Complete platform administration</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => loadAdminData()}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Complete platform administration for GoodyFans</p>
        </div>
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>👑 Administrator</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 border border-white shadow-lg overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.key === 'moderation' && stats.pendingModeration > 0 && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pendingModeration}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.totalCreators} creators, {stats.totalBuyers} buyers
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Content</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalContent}</p>
                  <p className="text-sm text-gray-500 mt-1">{stats.totalMedia} media uploaded</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{formatPrice(stats.totalRevenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">Platform gross revenue</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Commission</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{formatPrice(stats.platformRevenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">15% commission</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {stats.pendingModeration > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Moderation Required</h3>
                  <p className="text-yellow-700 mb-4">
                    {stats.pendingModeration} content{stats.pendingModeration > 1 ? 's' : ''} pending human review.
                  </p>
                  <button
                    onClick={() => setActiveTab('moderation')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    View Moderation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'moderation' && <ModerationDashboard />}

      {activeTab === 'users' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">User Management</h3>
            <p className="text-gray-600 mt-1">Manage all platform users</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'creator'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : user.role === 'creator' ? '🎨 Creator' : '🛍️ Buyer'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.email_verified 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.email_verified ? '✅ Verified' : '❌ Not verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Content Management</h3>
            <p className="text-gray-600 mt-1">All PPV content on the platform</p>
          </div>

          <div className="divide-y divide-gray-200">
            {content.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {item.content_type === 'media' ? '📁 Media' : '🔗 Link'}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <p className="font-medium text-green-600">{formatPrice(item.price)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Views:</span>
                        <p className="font-medium text-gray-900">{item.view_count}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Sales:</span>
                        <p className="font-medium text-gray-900">{item.purchase_count}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Creator:</span>
                        <p className="font-medium text-gray-900">{item.creator.full_name}</p>
                      </div>
                    </div>

                    {item.media && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {getMediaPreview(item.media as any)}
                        <div>
                          <p className="font-medium text-gray-900">{item.media.filename}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(item.media.file_size)} • {getFileCategory(item.media.mime_type)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDeleteContent(item.id, item.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete content"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Media Management</h3>
              <p className="text-gray-600 mt-1">All uploaded media files with moderation status</p>
            </div>
            <button
              onClick={handleModerateAllMedia}
              disabled={moderatingAll}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {moderatingAll ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Moderating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Moderate All Media</span>
                </>
              )}
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {media.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {getMediaPreview(item)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 truncate">{item.filename}</h4>
                        {getModerationBadge(item)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                        <div>
                          <span className="text-gray-500">Size:</span>
                          <p className="font-medium text-gray-900">{formatFileSize(item.file_size)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <p className="font-medium text-gray-900">{getFileCategory(item.mime_type)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Creator:</span>
                          <p className="font-medium text-gray-900">{item.creator.full_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Uploaded:</span>
                          <p className="font-medium text-gray-900">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      
                      {/* Moderation Details */}
                      {item.moderation_status !== 'not_analyzed' && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">🤖 AI Analysis</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-blue-700">Confidence:</span>
                              <span className="font-medium text-blue-900 ml-1">
                                {((item.moderation_confidence || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                            {item.moderation_flags && item.moderation_flags.length > 0 && (
                              <div>
                                <span className="text-blue-700">Flags:</span>
                                <span className="text-blue-900 ml-1">{item.moderation_flags.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(item.cloudflare_url, '_blank')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View media"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMedia(item.id, item.filename)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Commission</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{formatPrice(stats.platformRevenue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Creator Revenue</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{formatPrice(stats.totalRevenue * 0.85)}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue Evolution (Last 30 days)</h3>
            
            {revenueData.length > 0 ? (
              <div className="space-y-4">
                {revenueData.slice(-10).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{new Date(day.date).toLocaleDateString('en-US')}</p>
                      <p className="text-sm text-gray-500">{day.transactions} transaction{day.transactions > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatPrice(day.revenue)}</p>
                      <p className="text-sm text-gray-500">Commission: {formatPrice(day.revenue * 0.15)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No revenue data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Analytics</h3>
          <p className="text-gray-600">Advanced analytics features coming soon...</p>
        </div>
      )}
    </div>
  );
};