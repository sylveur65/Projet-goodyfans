import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, CreditCard, Mail, User, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, calculateExpiryDate, isContentExpired } from '../lib/content';
import { getFileCategory } from '../lib/cloudflare';
import toast from 'react-hot-toast';

interface ContentData {
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
  } | null;
  media?: {
    filename: string;
    mime_type: string;
    file_size: number;
  };
}

interface PurchaseData {
  email: string;
  fullName: string;
  createAccount: boolean;
  password?: string;
}

export const PurchasePage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseData>({
    email: '',
    fullName: '',
    createAccount: false,
    password: ''
  });

  useEffect(() => {
    if (contentId) {
      loadContent();
    }
  }, [contentId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
            file_size
          )
        `)
        .eq('id', contentId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Content not found or not available');
      }

      setContent(data as ContentData);
    } catch (error: any) {
      console.error('Error loading content:', error);
      toast.error('Content not found or not available');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content) return;
    
    // Validation
    if (!purchaseData.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!purchaseData.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (purchaseData.createAccount && (!purchaseData.password || purchaseData.password.length < 6)) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setPurchasing(true);

    try {
      // Check if content is expired
      if (content.expiry_days && isContentExpired(content.created_at, content.expiry_days)) {
        throw new Error('This content has expired and is no longer available for purchase');
      }

      // For demo purposes, we'll simulate the purchase process
      // In production, this would integrate with Stripe for payment processing
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a unique access token for this purchase
      const accessToken = `access_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Create purchase record (simplified for demo)
      const { error: purchaseError } = await supabase
        .from('purchase')
        .insert({
          buyer_id: null, // Guest purchase
          content_id: content.id,
          amount: content.price,
          stripe_payment_id: `demo_${accessToken}`,
          status: 'completed'
        });

      if (purchaseError) {
        throw purchaseError;
      }

      // If user wants to create an account, create it
      if (purchaseData.createAccount && purchaseData.password) {
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email: purchaseData.email,
            password: purchaseData.password,
            options: {
              data: {
                full_name: purchaseData.fullName,
                role: 'buyer'
              }
            }
          });
          
          if (signUpError) {
            console.warn('Account creation failed, but purchase was successful:', signUpError);
          }
        } catch (accountError) {
          console.warn('Account creation failed, but purchase was successful:', accountError);
        }
      }

      // Redirect to access page with token
      navigate(`/access/${content.id}?token=${accessToken}&email=${encodeURIComponent(purchaseData.email)}`);
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getContentPreview = () => {
    if (!content) return null;

    if (content.content_type === 'media' && content.media) {
      const category = getFileCategory(content.media.mime_type);
      return (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            {category === 'image' && <Eye className="w-5 h-5 text-blue-600" />}
            {category === 'video' && <Eye className="w-5 h-5 text-red-600" />}
            {category === 'document' && <Eye className="w-5 h-5 text-green-600" />}
            <div>
              <p className="font-medium text-gray-900">{content.media.filename}</p>
              <p className="text-sm text-gray-500">
                {(content.media.file_size / 1024 / 1024).toFixed(1)} MB • {category}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (content.content_type === 'link') {
      return (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <ExternalLink className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">External Content</p>
              <p className="text-sm text-gray-500">Access to exclusive external content</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const getExpiryInfo = () => {
    if (!content || !content.expiry_days) return 'Lifetime access';
    
    const expiryDate = calculateExpiryDate(content.created_at, content.expiry_days);
    if (!expiryDate) return 'Lifetime access';
    
    const expired = isContentExpired(content.created_at, content.expiry_days);
    if (expired) return 'Expired';
    
    return `${content.expiry_days} day${content.expiry_days > 1 ? 's' : ''} access`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Not Found</h2>
          <p className="text-gray-600">This content is not available or has been removed.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Content</h1>
          <p className="text-gray-600">Secure checkout - no account required</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Content Preview */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            
            {content.description && (
              <p className="text-gray-700 mb-6 leading-relaxed">{content.description}</p>
            )}

            {/* Content Preview */}
            {getContentPreview()}

            {/* Creator Info */}
            {content.creator && (
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-gray-900 mb-2">Created by {content.creator.full_name}</h3>
                {content.creator.bio && (
                  <p className="text-sm text-gray-600">{content.creator.bio}</p>
                )}
              </div>
            )}

            {/* Purchase Details */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price:</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(content.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Access:</span>
                <span className="font-medium text-gray-900">{getExpiryInfo()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium text-gray-900 capitalize">{content.content_type}</span>
              </div>
            </div>
          </div>

          {/* Purchase Form */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Complete Your Purchase</h3>
            
            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={purchaseData.email}
                    onChange={(e) => setPurchaseData({ ...purchaseData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">We'll send your access link to this email</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={purchaseData.fullName}
                    onChange={(e) => setPurchaseData({ ...purchaseData, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>

              {/* Create Account Option */}
              <div className="border border-gray-200 rounded-xl p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purchaseData.createAccount}
                    onChange={(e) => setPurchaseData({ ...purchaseData, createAccount: e.target.checked })}
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Create an account (optional)</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Track your purchases and get exclusive updates from creators
                    </p>
                  </div>
                </label>

                {purchaseData.createAccount && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={purchaseData.password}
                        onChange={(e) => setPurchaseData({ ...purchaseData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Choose a password (min 6 characters)"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Secure Payment</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your payment will be processed securely through Stripe. 
                      You'll receive instant access after successful payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                type="submit"
                disabled={purchasing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {purchasing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Purchase for {formatPrice(content.price)}</span>
                  </>
                )}
              </button>

              {/* Security Notice */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔒 Secure checkout powered by Stripe • No account required
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};