import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, Download, ExternalLink, CheckCircle, AlertCircle, Eye, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, calculateExpiryDate, isContentExpired } from '../lib/content';
import { getFileCategory } from '../lib/cloudflare';
import toast from 'react-hot-toast';

interface ContentAccess {
  id: string;
  title: string;
  description?: string;
  price: number;
  content_type: 'media' | 'link';
  external_url?: string;
  expiry_days?: number;
  created_at: string;
  creator: {
    full_name: string;
    bio?: string;
  };
  media?: {
    filename: string;
    mime_type: string;
    file_size: number;
    cloudflare_url: string;
    thumbnail_url?: string;
  };
}

export const AccessPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ContentAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [validAccess, setValidAccess] = useState(false);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (contentId && token && email) {
      verifyAccessAndLoadContent();
    } else {
      setLoading(false);
    }
  }, [contentId, token, email]);

  const verifyAccessAndLoadContent = async () => {
    try {
      setLoading(true);
      
      // Verify the purchase token exists
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase')
        .select('*')
        .eq('content_id', contentId)
        .eq('stripe_payment_id', token)
        .eq('status', 'completed')
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Invalid access token or purchase not found');
      }

      // Load content with creator info
      const { data: contentData, error: contentError } = await supabase
        .from('ppvcontent')
        .select(`
          id,
          title,
          description,
          price,
          content_type,
          external_url,
          expiry_days,
          created_at,
          creator:profile!creator_id(
            full_name,
            bio
          ),
          media:mediafile(
            filename,
            mime_type,
            file_size,
            cloudflare_url,
            thumbnail_url
          )
        `)
        .eq('id', contentId)
        .single();

      if (contentError || !contentData) {
        throw new Error('Content not found');
      }

      // Check if content has expired
      if (contentData.expiry_days && isContentExpired(contentData.created_at, contentData.expiry_days)) {
        throw new Error('This content has expired and is no longer accessible');
      }

      setContent(contentData as ContentAccess);
      setValidAccess(true);
      
    } catch (error: any) {
      console.error('Access verification error:', error);
      toast.error(error.message || 'Access denied');
      setValidAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!content?.media?.cloudflare_url) return;
    
    if (content.media.cloudflare_url.startsWith('data:')) {
      // For data URLs, create a download link
      const link = document.createElement('a');
      link.href = content.media.cloudflare_url;
      link.download = content.media.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } else {
      // For regular URLs, open in new tab
      window.open(content.media.cloudflare_url, '_blank');
      toast.success('Opening content in new tab!');
    }
  };

  const handleExternalLink = () => {
    if (!content?.external_url) return;
    
    window.open(content.external_url, '_blank');
    toast.success('Opening external content!');
  };

  const getExpiryInfo = () => {
    if (!content || !content.expiry_days) return 'Lifetime access';
    
    const expiryDate = calculateExpiryDate(content.created_at, content.expiry_days);
    if (!expiryDate) return 'Lifetime access';
    
    const now = new Date();
    const timeLeft = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return '1 day remaining';
    return `${daysLeft} days remaining`;
  };

  const getContentPreview = () => {
    if (!content) return null;

    if (content.content_type === 'media' && content.media) {
      const category = getFileCategory(content.media.mime_type);
      const imageUrl = content.media.thumbnail_url || content.media.cloudflare_url;
      
      if (category === 'image') {
        return (
          <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-6">
            <img 
              src={imageUrl} 
              alt={content.title}
              className="w-full h-64 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
              <Eye className="w-16 h-16 text-blue-600" />
            </div>
          </div>
        );
      } else if (category === 'video') {
        return (
          <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-6 h-64 flex items-center justify-center">
            {content.media.thumbnail_url ? (
              <img 
                src={content.media.thumbnail_url} 
                alt={content.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-center">
                <Eye className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Video Content</p>
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-8 mb-6 text-center">
        <ExternalLink className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">External Content</h3>
        <p className="text-gray-600">Click the access button below to view your content</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!validAccess || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            This content is not accessible. The link may be invalid, expired, or the purchase was not completed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Access</h1>
          <p className="text-gray-600">Your purchase is confirmed - enjoy your content!</p>
        </div>

        {/* Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Purchase Successful!</h3>
              <p className="text-green-700">
                Thank you for your purchase! You now have access to this exclusive content. 
                {email && ` A confirmation has been sent to ${email}.`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
              
              {content.description && (
                <p className="text-gray-700 mb-6 leading-relaxed">{content.description}</p>
              )}

              {/* Content Preview */}
              {getContentPreview()}

              {/* Access Buttons */}
              <div className="space-y-4">
                {content.content_type === 'media' && content.media && (
                  <button
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download {content.media.filename}</span>
                  </button>
                )}

                {content.content_type === 'link' && content.external_url && (
                  <button
                    onClick={handleExternalLink}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Access External Content</span>
                  </button>
                )}
              </div>

              {/* File Details */}
              {content.content_type === 'media' && content.media && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-2">File Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Filename:</span>
                      <p className="font-medium text-gray-900">{content.media.filename}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="font-medium text-gray-900">
                        {(content.media.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium text-gray-900 capitalize">
                        {getFileCategory(content.media.mime_type)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Format:</span>
                      <p className="font-medium text-gray-900">
                        {content.media.mime_type.split('/')[1]?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price Paid:</span>
                  <span className="font-semibold text-green-600">{formatPrice(content.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Access:</span>
                  <span className="font-medium text-gray-900">{getExpiryInfo()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{content.content_type}</span>
                </div>
                {email && (
                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900 break-all">{email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Creator Info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Creator</h3>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{content.creator.full_name}</p>
                  <p className="text-sm text-gray-500">Content Creator</p>
                </div>
              </div>
              {content.creator.bio && (
                <p className="text-sm text-gray-600">{content.creator.bio}</p>
              )}
            </div>

            {/* Access Expiry Warning */}
            {content.expiry_days && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Limited Time Access</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {getExpiryInfo()}. Make sure to download or access your content before it expires.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};