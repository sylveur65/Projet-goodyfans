import React, { useState, useEffect } from 'react';
import { ShoppingBag, Calendar, DollarSign, ExternalLink, Download, Eye, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/content';
import { getFileCategory } from '../lib/cloudflare';
import toast from 'react-hot-toast';

interface Purchase {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  content: {
    id: string;
    title: string;
    description?: string;
    content_type: 'media' | 'link';
    external_url?: string;
    creator: {
      full_name: string;
    };
    media?: {
      filename: string;
      mime_type: string;
      cloudflare_url: string;
    };
  };
}

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('purchase')
        .select(`
          id,
          amount,
          status,
          created_at,
          content:ppvcontent(
            id,
            title,
            description,
            content_type,
            external_url,
            creator:profile!creator_id(
              full_name
            ),
            media:mediafile(
              filename,
              mime_type,
              cloudflare_url
            )
          )
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPurchases(data || []);
    } catch (error: any) {
      console.error('Error loading purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessContent = (purchase: Purchase) => {
    if (purchase.content.content_type === 'media' && purchase.content.media) {
      // For media files, open in new tab or download
      if (purchase.content.media.cloudflare_url.startsWith('data:')) {
        const newWindow = window.open();
        if (newWindow) {
          const category = getFileCategory(purchase.content.media.mime_type);
          if (category === 'image') {
            newWindow.document.write(`<img src="${purchase.content.media.cloudflare_url}" style="max-width:100%;height:auto;" alt="${purchase.content.media.filename}">`);
          } else if (category === 'video') {
            newWindow.document.write(`<video controls style="max-width:100%;height:auto;"><source src="${purchase.content.media.cloudflare_url}" type="${purchase.content.media.mime_type}"></video>`);
          } else {
            newWindow.document.write(`<iframe src="${purchase.content.media.cloudflare_url}" style="width:100%;height:100%;border:none;"></iframe>`);
          }
        }
      } else {
        window.open(purchase.content.media.cloudflare_url, '_blank');
      }
    } else if (purchase.content.content_type === 'link' && purchase.content.external_url) {
      window.open(purchase.content.external_url, '_blank');
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.content.creator.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || purchase.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
            <p className="text-gray-600 mt-2">View and access your purchased content</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
          <p className="text-gray-600 mt-2">View and access your purchased content</p>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold">
          {purchases.length} Purchase{purchases.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchTerm || filterStatus !== 'all' ? 'No purchases found' : 'No purchases yet'}
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'You haven\'t purchased any content yet. Discover amazing content from creators and support them!'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {purchase.content.title}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        by {purchase.content.creator.full_name}
                      </p>
                      {purchase.content.description && (
                        <p className="text-gray-500 text-sm mb-3">
                          {purchase.content.description}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(purchase.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(purchase.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold text-green-600">
                          {formatPrice(purchase.amount)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {purchase.content.content_type === 'media' ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        <span className="capitalize">{purchase.content.content_type}</span>
                      </div>
                    </div>

                    {purchase.status === 'completed' && (
                      <button
                        onClick={() => handleAccessContent(purchase)}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 flex items-center space-x-2"
                      >
                        {purchase.content.content_type === 'media' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>View Content</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            <span>Access Link</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Summary */}
      {purchases.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Purchase Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {purchases.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed Purchases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(purchases.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(purchases.map(p => p.content.creator.full_name)).size}
              </div>
              <div className="text-sm text-gray-600">Creators Supported</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};