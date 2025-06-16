import React, { useState, useEffect } from 'react';
import { Shield, Eye, Check, X, AlertTriangle, BarChart3, Clock, Users, TrendingUp, Settings, RefreshCw } from 'lucide-react';
import { getModerationStats, submitHumanReview, checkAzureConfiguration, moderateAllExistingMedia, type ModerationRecord } from '../lib/moderation';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/content';
import toast from 'react-hot-toast';

export const ModerationDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    autoApprovalRate: 0,
  });
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [azureConfig, setAzureConfig] = useState({ configured: false, message: '' });
  const [moderatingAll, setModeratingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{column: string, direction: 'asc' | 'desc'}>({
    column: 'created_at',
    direction: 'desc'
  });

  useEffect(() => {
    loadModerationData();
    checkAzureConfig();
  }, []);

  const checkAzureConfig = () => {
    const config = checkAzureConfiguration();
    setAzureConfig(config);
  };

  const loadModerationData = async () => {
    try {
      setLoading(true);
      
      // Load statistics
      const moderationStats = await getModerationStats();
      setStats(moderationStats);

      // Load pending items using the optimized view
      const { data: pending, error } = await supabase
        .from('moderation_with_content')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingItems(pending || []);

    } catch (error: any) {
      console.error('Error loading moderation data:', error);
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (moderationId: string, decision: 'approve' | 'reject') => {
    try {
      await submitHumanReview(moderationId, decision, reviewReason);
      toast.success(`Content ${decision}d successfully`);
      
      // Reload data
      await loadModerationData();
      setSelectedItem(null);
      setReviewReason('');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
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
      await loadModerationData();

    } catch (error: any) {
      console.error('Error during bulk moderation:', error);
      toast.error('Error during bulk moderation');
    } finally {
      setModeratingAll(false);
    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prevConfig => ({
      column,
      direction: prevConfig.column === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredPendingItems = pendingItems
    .filter(item => {
      const contentTitle = item.content_data?.title || item.content_data?.filename || '';
      const creatorName = item.content_data?.creator_name || '';
      
      return contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
             creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortConfig.column === 'created_at') {
        return sortConfig.direction === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      if (sortConfig.column === 'confidence') {
        const aConfidence = a.auto_result?.confidence || 0;
        const bConfidence = b.auto_result?.confidence || 0;
        
        return sortConfig.direction === 'asc' 
          ? aConfidence - bConfidence
          : bConfidence - aConfidence;
      }
      
      return 0;
    });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending Review</span>;
      case 'reviewing':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Reviewing</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
            <p className="text-gray-600 mt-2">Review and moderate platform content</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
          <p className="text-gray-600 mt-2">AI-powered content moderation with human oversight</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleModerateAllMedia}
            disabled={moderatingAll}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {moderatingAll ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Moderation in progress...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Moderate All Media</span>
              </>
            )}
          </button>
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Moderation Center</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Content</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Auto Approval</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stats.autoApprovalRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Azure Configuration Status */}
      <div className={`rounded-2xl p-6 border ${
        azureConfig.configured 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' 
          : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
      }`}>
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            azureConfig.configured ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Shield className={`w-6 h-6 ${azureConfig.configured ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🤖 AI Moderation Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Current Configuration:</h4>
                <ul className="text-gray-700 space-y-1">
                  <li>• Azure Content Moderator: {azureConfig.configured ? '✅ Configured' : '❌ Not configured'}</li>
                  <li>• Automatic image analysis: ✅ Active</li>
                  <li>• Text content filtering: ✅ Active</li>
                  <li>• Human review workflow: ✅ Active</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Moderation Thresholds:</h4>
                <ul className="text-gray-700 space-y-1">
                  <li>• Auto-approval: low risk content</li>
                  <li>• Human review: medium risk content</li>
                  <li>• Auto-rejection: high risk content</li>
                  <li>• Response time: Less than 2 minutes</li>
                </ul>
              </div>
            </div>
            
            {!azureConfig.configured && (
              <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">🔧 Azure Configuration Required</h4>
                <p className="text-red-700 text-sm mb-3">
                  To enable Azure automatic moderation, add these environment variables:
                </p>
                <div className="bg-red-50 p-3 rounded text-xs font-mono text-red-800">
                  VITE_AZURE_CONTENT_MODERATOR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/<br/>
                  VITE_AZURE_CONTENT_MODERATOR_KEY=your_subscription_key<br/>
                  VITE_AZURE_REGION=francecentral
                </div>
                <p className="text-red-700 text-sm mt-2">
                  💡 In the meantime, the system will use a basic moderation that automatically approves normal content.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSort('created_at')}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center space-x-1 hover:bg-gray-50"
          >
            <span>Date</span>
            {sortConfig.column === 'created_at' && (
              sortConfig.direction === 'asc' ? 
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg> : 
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            )}
          </button>
          <button
            onClick={() => handleSort('confidence')}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center space-x-1 hover:bg-gray-50"
          >
            <span>Confidence</span>
            {sortConfig.column === 'confidence' && (
              sortConfig.direction === 'asc' ? 
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg> : 
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            )}
          </button>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <span>Content Pending Review ({filteredPendingItems.length})</span>
          </h3>
          <p className="text-gray-600 mt-1">Content that requires human moderation</p>
        </div>

        {filteredPendingItems.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Clear! 🎉</h4>
            <p className="text-gray-600">No content pending human review. The AI moderation is working perfectly!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPendingItems.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="font-semibold text-gray-900">{item.content_data?.title || item.content_data?.filename || 'Untitled Content'}</h4>
                      {getStatusBadge(item.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(item.auto_result?.confidence || 0)}`}>
                        {((item.auto_result?.confidence || 0) * 100).toFixed(0)}% confidence
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Creator:</strong> {item.content_data?.creator_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Type:</strong> {item.content_type}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Submitted:</strong> {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>AI Flags:</strong> {item.auto_result?.flags?.join(', ') || 'None'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {item.auto_result?.reason || 'Requires review'}
                        </p>
                      </div>
                    </div>

                    {/* AI Analysis Details */}
                    {item.auto_result?.categories && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">AI Analysis Scores:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(item.auto_result.categories).map(([category, score]) => (
                            <div key={category} className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-600 capitalize">{category}</p>
                              <p className="text-sm font-medium text-gray-900">{(score * 100).toFixed(1)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Review content"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Review Content</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{selectedItem.content_data?.title || selectedItem.content_data?.filename}</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                    {selectedItem.content_type}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">Status:</span>
                  {getStatusBadge(selectedItem.status)}
                </div>
                
                {/* AI Analysis */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">🤖 AI Analysis</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm text-blue-700">Confidence:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {((selectedItem.auto_result?.confidence || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Flags:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {selectedItem.auto_result?.flags?.join(', ') || 'None'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-blue-700">Adult Content:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {((selectedItem.auto_result?.categories?.adult || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Violence:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {((selectedItem.auto_result?.categories?.violence || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Hate Speech:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {((selectedItem.auto_result?.categories?.hate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Self Harm:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {((selectedItem.auto_result?.categories?.selfHarm || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {selectedItem.auto_result?.reason && (
                    <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>AI Reason:</strong> {selectedItem.auto_result.reason}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Content Preview */}
                {selectedItem.content_data?.cloudflare_url && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Content Preview:</h4>
                    {selectedItem.content_type === 'image' ? (
                      <div className="bg-gray-100 rounded-xl p-2 flex justify-center">
                        <img 
                          src={selectedItem.content_data.cloudflare_url} 
                          alt="Content preview" 
                          className="max-h-64 object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center">
                        <Eye className="w-12 h-12 text-gray-400" />
                        <p className="ml-2 text-gray-600">Click to view content</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Reason (Optional)
                  </label>
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Add a reason for your decision..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedItem.id, 'reject')}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <X className="w-5 h-5" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => handleReview(selectedItem.id, 'approve')}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};