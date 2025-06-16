import React, { useEffect, useState, useRef } from 'react';
import { Bell, Shield, DollarSign, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
  id: string;
  type: 'moderation' | 'purchase' | 'system';
  message: string;
  read: boolean;
  created_at: string;
}

export const WebSocketNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  
  // Use refs to store channel instances
  const moderationChannelRef = useRef<RealtimeChannel | null>(null);
  const purchaseChannelRef = useRef<RealtimeChannel | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load existing notifications
    const loadNotifications = async () => {
      // In a real implementation, you would fetch notifications from the database
      // For demo purposes, we'll use mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'moderation',
          message: 'New content pending moderation',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'purchase',
          message: 'New purchase completed',
          read: false,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'system',
          message: 'System maintenance scheduled',
          read: true,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    };

    loadNotifications();

    // Set up Supabase Realtime subscription
    const setupRealtimeSubscription = async () => {
      try {
        // Clean up existing subscriptions first
        if (moderationChannelRef.current) {
          await supabase.removeChannel(moderationChannelRef.current);
          moderationChannelRef.current = null;
        }
        
        if (purchaseChannelRef.current) {
          await supabase.removeChannel(purchaseChannelRef.current);
          purchaseChannelRef.current = null;
        }

        // Create unique channel names with user ID to prevent conflicts
        const moderationChannelName = `moderation-changes-${user.id}-${Date.now()}`;
        const purchaseChannelName = `purchase-changes-${user.id}-${Date.now()}`;

        // Subscribe to content_moderation table changes
        moderationChannelRef.current = supabase
          .channel(moderationChannelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'content_moderation',
              filter: 'status=eq.pending'
            },
            (payload) => {
              console.log('New moderation item:', payload);
              
              // Add notification
              const newNotification: Notification = {
                id: `mod_${Date.now()}`,
                type: 'moderation',
                message: 'New content pending moderation',
                read: false,
                created_at: new Date().toISOString()
              };
              
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          )
          .subscribe();

        // Subscribe to purchase table changes
        purchaseChannelRef.current = supabase
          .channel(purchaseChannelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'purchase'
            },
            (payload) => {
              console.log('New purchase:', payload);
              
              // Add notification
              const newNotification: Notification = {
                id: `purchase_${Date.now()}`,
                type: 'purchase',
                message: 'New purchase completed',
                read: false,
                created_at: new Date().toISOString()
              };
              
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          )
          .subscribe();

        setConnected(true);
        console.log('✅ WebSocket subscriptions established successfully');

      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        setConnected(false);
      }
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        console.log('🧹 Cleaning up WebSocket subscriptions');
        
        if (moderationChannelRef.current) {
          await supabase.removeChannel(moderationChannelRef.current);
          moderationChannelRef.current = null;
        }
        
        if (purchaseChannelRef.current) {
          await supabase.removeChannel(purchaseChannelRef.current);
          purchaseChannelRef.current = null;
        }
      };
      
      cleanup();
    };
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'moderation':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'purchase':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'system':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div 
          ref={notificationPanelRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-hidden"
          style={{ maxHeight: '500px', right: '-20px' }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
          
          <div className="max-h-[calc(500px-120px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors ${notification.read ? '' : 'bg-blue-50'}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={markAllAsRead}
              className="w-full py-2 text-sm text-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
};