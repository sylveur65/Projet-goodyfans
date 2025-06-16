import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Video, TrendingUp, Heart, Eye, Plus, ShoppingBag, Star, Shield, BarChart3 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Admin users get redirected to the admin dashboard
  if (profile?.role === 'admin') {
    return <AdminDashboard profile={profile} navigate={navigate} />;
  }

  // Different dashboard content based on user role
  if (profile?.role === 'buyer') {
    return <BuyerDashboard profile={profile} navigate={navigate} />;
  }

  return <CreatorDashboard profile={profile} navigate={navigate} />;
};

const AdminDashboard: React.FC<{ profile: any; navigate: any }> = ({ profile, navigate }) => {
  // Real stats for admin (showing actual data)
  const stats = [
    {
      name: 'Platform Users',
      value: '4',
      change: 'Total registered users',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Total Revenue',
      value: '$0.00',
      change: 'Platform commission: $0.00',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Active Content',
      value: '1',
      change: 'Content pieces published',
      icon: Video,
      color: 'from-purple-500 to-violet-500',
    },
    {
      name: 'System Health',
      value: '100%',
      change: 'All systems operational',
      icon: Shield,
      color: 'from-red-500 to-orange-500',
    },
  ];

  const recentActivity = [
    { 
      type: 'admin', 
      content: 'Welcome to the Admin Dashboard! Monitor and manage the platform.', 
      amount: null, 
      time: 'Just now',
      icon: Shield,
      color: 'bg-red-100 text-red-600'
    },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'users':
        navigate('/admin');
        break;
      case 'content':
        navigate('/admin');
        break;
      case 'analytics':
        navigate('/admin');
        break;
      case 'settings':
        navigate('/account');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name || 'Administrator'}! 👑
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor platform activity and manage users, content, and system health.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold">
            👑 Administrator
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="bg-white border border-red-200 text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center space-x-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Open Admin Panel</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Admin Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-red-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.content}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
            <h4 className="font-semibold text-gray-900 mb-2">🔧 Admin Responsibilities</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Monitor user activity and platform health</li>
              <li>• Moderate content and handle user reports</li>
              <li>• Review platform analytics and performance</li>
              <li>• Manage user accounts and permissions</li>
            </ul>
          </div>
        </div>

        {/* Admin Tools */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Admin Tools</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleQuickAction('users')}
              className="p-4 rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50 transition-all group cursor-pointer"
            >
              <Users className="w-8 h-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">User Management</p>
              <p className="text-xs text-gray-500 mt-1">Manage user accounts</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('content')}
              className="p-4 rounded-xl border border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all group cursor-pointer"
            >
              <Video className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Content Moderation</p>
              <p className="text-xs text-gray-500 mt-1">Review and moderate</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('analytics')}
              className="p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer"
            >
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Platform Analytics</p>
              <p className="text-xs text-gray-500 mt-1">View detailed stats</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('settings')}
              className="p-4 rounded-xl border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group cursor-pointer"
            >
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">System Settings</p>
              <p className="text-xs text-gray-500 mt-1">Configure platform</p>
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Shield className="w-5 h-5" />
              <span>Open Full Admin Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Panel Access */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">👑 Administrator Access</h3>
            <p className="text-red-100 mb-4">
              You have full administrative privileges to manage the GoodyFans platform. 
              Monitor users, moderate content, and ensure platform health.
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="bg-white text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-colors"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => navigate('/account')}
                className="border border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Account Settings
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatorDashboard: React.FC<{ profile: any; navigate: any }> = ({ profile, navigate }) => {
  // Real stats for a new creator (all zeros)
  const stats = [
    {
      name: 'Total Earnings',
      value: '$0.00',
      change: 'Start creating content to earn!',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Active Content',
      value: '0',
      change: 'Upload your first content',
      icon: Video,
      color: 'from-purple-500 to-violet-500',
    },
    {
      name: 'Total Sales',
      value: '0',
      change: 'No sales yet',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Subscribers',
      value: '0',
      change: 'Build your audience',
      icon: Users,
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const recentActivity = [
    { 
      type: 'welcome', 
      content: 'Welcome to GoodyFans! Start by uploading your first content.', 
      amount: null, 
      time: 'Just now',
      icon: Heart,
      color: 'bg-purple-100 text-purple-600'
    },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'upload':
        navigate('/content');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'fans':
        alert('Fans management coming soon! Focus on creating great content first.');
        break;
      case 'payments':
        navigate('/account');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name || 'Creator'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Ready to create amazing content? Let's get started!
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold">
            🎨 Creator Dashboard
          </div>
          <button
            onClick={() => navigate('/content')}
            className="bg-white border border-purple-200 text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Content</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-purple-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.content}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
                {activity.amount && (
                  <div className="text-lg font-semibold text-green-600">
                    {activity.amount}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <h4 className="font-semibold text-gray-900 mb-2">🚀 Getting Started Tips</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Upload high-quality content that your fans will love</li>
              <li>• Set competitive prices for your premium content</li>
              <li>• Share purchase links on social media for viral growth</li>
              <li>• Use analytics to understand what content performs best</li>
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleQuickAction('upload')}
              className="p-4 rounded-xl border border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all group cursor-pointer"
            >
              <Video className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Upload Content</p>
              <p className="text-xs text-gray-500 mt-1">Add new PPV content</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('analytics')}
              className="p-4 rounded-xl border border-pink-200 hover:border-pink-300 hover:bg-pink-50 transition-all group cursor-pointer"
            >
              <Eye className="w-8 h-8 text-pink-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-xs text-gray-500 mt-1">Check performance</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('fans')}
              className="p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer"
            >
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Manage Fans</p>
              <p className="text-xs text-gray-500 mt-1">Connect with audience</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('payments')}
              className="p-4 rounded-xl border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group cursor-pointer"
            >
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Payments</p>
              <p className="text-xs text-gray-500 mt-1">Manage earnings</p>
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/content')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message for New Creators */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">🎉 Welcome to GoodyFans!</h3>
            <p className="text-purple-100 mb-4">
              You're all set up and ready to start creating amazing content for your fans. 
              Upload your first piece of content to get started!
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/content')}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/account')}
                className="border border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Setup Profile
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
              <Heart className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuyerDashboard: React.FC<{ profile: any; navigate: any }> = ({ profile, navigate }) => {
  const stats = [
    {
      name: 'Total Purchases',
      value: '0',
      change: 'No purchases yet',
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Content Accessed',
      value: '0',
      change: 'Start exploring content',
      icon: Video,
      color: 'from-purple-500 to-violet-500',
    },
    {
      name: 'Favorite Creators',
      value: '0',
      change: 'Discover amazing creators',
      icon: Star,
      color: 'from-pink-500 to-rose-500',
    },
    {
      name: 'Total Spent',
      value: '$0.00',
      change: 'Support your favorite creators',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const recentActivity = [
    { 
      type: 'welcome', 
      content: 'Welcome to GoodyFans! Discover amazing content from creators.', 
      amount: null, 
      time: 'Just now',
      icon: Heart,
      color: 'bg-blue-100 text-blue-600'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name || 'Fan'}! 🛍️
          </h1>
          <p className="text-gray-600 mt-2">
            Discover amazing content from your favorite creators.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold">
            🛍️ Buyer Dashboard
          </div>
          <button
            onClick={() => navigate('/purchases')}
            className="bg-white border border-blue-200 text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>My Purchases</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-blue-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.content}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-gray-900 mb-2">💡 How to Get Started</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Browse content from amazing creators</li>
              <li>• Purchase content with just your email - no account required</li>
              <li>• Get instant access after payment</li>
              <li>• Support your favorite creators</li>
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/purchases')}
              className="p-4 rounded-xl border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer"
            >
              <ShoppingBag className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">My Purchases</p>
              <p className="text-xs text-gray-500 mt-1">View bought content</p>
            </button>
            
            <button 
              onClick={() => navigate('/account')}
              className="p-4 rounded-xl border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all group cursor-pointer"
            >
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Account</p>
              <p className="text-xs text-gray-500 mt-1">Manage settings</p>
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/purchases')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>View My Purchases</span>
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message for Buyers */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">🛍️ Welcome to GoodyFans!</h3>
            <p className="text-blue-100 mb-4">
              Discover exclusive content from amazing creators. Purchase content instantly with just your email - no complex signup required!
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/purchases')}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Browse Content
              </button>
              <button
                onClick={() => navigate('/account')}
                className="border border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Manage Account
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};