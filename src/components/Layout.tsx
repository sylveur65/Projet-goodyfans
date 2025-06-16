import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Video, 
  Settings, 
  BarChart3, 
  LogOut, 
  User,
  Heart,
  ShoppingBag,
  Shield,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';
import toast from 'react-hot-toast';
import { WebSocketNotifications } from './WebSocketNotifications';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, clearAuthState } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      // First attempt to sign out from Supabase
      await signOut();
      
      // Always clear local auth state regardless of server response
      await clearAuthState();
      
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Even if server sign out fails, clear local state and redirect
      await clearAuthState();
      navigate('/login');
      toast.success('Signed out successfully');
    }
  };

  // Different navigation based on user role
  const getNavigation = () => {
    if (profile?.role === 'admin') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Admin Dashboard', href: '/admin', icon: Shield },
        { name: 'Account', href: '/account', icon: Settings },
      ];
    } else if (profile?.role === 'creator') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Content', href: '/content', icon: Video },
        { name: 'Media', href: '/media', icon: Heart },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Account', href: '/account', icon: Settings },
      ];
    } else {
      // Buyer navigation
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'My Purchases', href: '/purchases', icon: ShoppingBag },
        { name: 'Account', href: '/account', icon: Settings },
      ];
    }
  };

  const navigation = getNavigation();

  // Get role-specific styling
  const getRoleStyles = () => {
    if (profile?.role === 'admin') {
      return {
        badge: 'bg-red-100 text-red-700',
        gradient: 'from-red-600 to-orange-600',
        hover: 'hover:bg-red-50 hover:text-red-700',
        icon: '👑'
      };
    } else if (profile?.role === 'creator') {
      return {
        badge: 'bg-purple-100 text-purple-700',
        gradient: 'from-purple-600 to-pink-600',
        hover: 'hover:bg-purple-50 hover:text-purple-700',
        icon: '🎨'
      };
    } else {
      return {
        badge: 'bg-blue-100 text-blue-700',
        gradient: 'from-blue-600 to-cyan-600',
        hover: 'hover:bg-blue-50 hover:text-blue-700',
        icon: '🛍️'
      };
    }
  };

  const roleStyles = getRoleStyles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white shadow-md text-gray-700 hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white/80 backdrop-blur-xl border-r border-purple-100 shadow-xl hidden lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center p-6 border-b border-purple-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                GoodyFans
              </span>
            </div>
          </div>

          {/* Role Badge */}
          <div className="px-4 py-2">
            <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${roleStyles.badge}`}>
              {roleStyles.icon} {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'creator' ? 'Creator Account' : 'Buyer Account'}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${roleStyles.gradient} text-white shadow-lg`
                      : `text-gray-700 ${roleStyles.hover}`
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-purple-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${roleStyles.gradient} rounded-full flex items-center justify-center`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {profile?.role}
                </p>
              </div>
              {profile?.role === 'admin' && (
                <div className="relative">
                  <WebSocketNotifications />
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-purple-100 shadow-xl">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex items-center justify-between p-6 border-b border-purple-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    GoodyFans
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Role Badge */}
              <div className="px-4 py-2">
                <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${roleStyles.badge}`}>
                  {roleStyles.icon} {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'creator' ? 'Creator Account' : 'Buyer Account'}
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-r ${roleStyles.gradient} text-white shadow-lg`
                          : `text-gray-700 ${roleStyles.hover}`
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* User Profile */}
              <div className="p-4 border-t border-purple-100">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${roleStyles.gradient} rounded-full flex items-center justify-center`}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {profile?.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};