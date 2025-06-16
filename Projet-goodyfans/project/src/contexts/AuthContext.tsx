import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  refreshProfile: () => Promise<void>;
  clearAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isEmailVerified: false,
  refreshProfile: async () => {},
  clearAuthState: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  console.log('🔐 AuthProvider initializing...');

  const clearAuthState = async () => {
    console.log('🧹 Clearing local authentication state...');
    
    try {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
      console.log('✅ Local authentication state cleared');
    } catch (error) {
      console.error('❌ Error clearing local auth state:', error);
    }
  };

  const createProfileFromUser = (user: User): Profile => {
    console.log('🔧 Creating profile from user data:', {
      email: user.email,
      metadata: user.user_metadata,
      rawMetadata: user.raw_user_meta_data,
      emailConfirmedAt: user.email_confirmed_at
    });
    
    const fullName = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.raw_user_meta_data?.full_name ||
                    user.email?.split('@')[0] || 
                    'User';
    
    let role = 'buyer';
    
    if (user.raw_user_meta_data?.role) {
      role = user.raw_user_meta_data.role;
    } else if (user.user_metadata?.role) {
      role = user.user_metadata.role;
    }
    
    if (user.email === 'admin@goodyfans.com') {
      role = 'admin';
    }
    
    const emailVerified = !!user.email_confirmed_at;
    const emailVerifiedAt = user.email_confirmed_at || new Date().toISOString();
    
    console.log('👤 Extracted user data:', { 
      fullName, 
      role, 
      email: user.email,
      emailVerified,
      emailVerifiedAt
    });
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      role: role as 'creator' | 'buyer' | 'admin',
      email_verified: emailVerified,
      email_verified_at: emailVerifiedAt,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar_url: user.user_metadata?.avatar_url,
      bio: user.user_metadata?.bio
    };
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const newProfile = createProfileFromUser(user);
        setProfile(newProfile);
        setIsEmailVerified(!!user.email_confirmed_at);
      } catch (error) {
        console.error('❌ Error refreshing profile:', error);
      }
    }
  };

  useEffect(() => {
    console.log('🔄 AuthProvider initializing...');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      setLoading(false);
      return;
    }

    console.log('✅ Supabase environment variables found');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
        } else {
          console.log('📱 Initial session:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            userMetadata: session?.user?.user_metadata,
            rawMetadata: session?.user?.raw_user_meta_data,
            emailConfirmedAt: session?.user?.email_confirmed_at
          });
          
          if (session?.user) {
            console.log('✅ User found, creating profile...');
            setUser(session.user);
            
            const newProfile = createProfileFromUser(session.user);
            setProfile(newProfile);
            setIsEmailVerified(!!session.user.email_confirmed_at);
            
            console.log('✅ Profile created successfully:', newProfile);
          } else {
            console.log('ℹ️ No user session found');
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
      } finally {
        console.log('✅ Auth initialization complete, setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userMetadata: session?.user?.user_metadata,
          rawMetadata: session?.user?.raw_user_meta_data,
          emailConfirmedAt: session?.user?.email_confirmed_at
        });
        
        if (session?.user) {
          console.log('✅ User authenticated, creating profile...');
          setUser(session.user);
          
          const newProfile = createProfileFromUser(session.user);
          setProfile(newProfile);
          setIsEmailVerified(!!session.user.email_confirmed_at);
          
          console.log('✅ Profile created from auth data:', newProfile);
        } else {
          console.log('ℹ️ User signed out');
          setUser(null);
          setProfile(null);
          setIsEmailVerified(false);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    console.log('🔍 AuthProvider state update:', {
      user: !!user,
      userEmail: user?.email,
      profile: !!profile,
      profileEmail: profile?.email,
      profileRole: profile?.role,
      loading,
      isEmailVerified
    });
  }, [user, profile, loading, isEmailVerified]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isEmailVerified,
      refreshProfile,
      clearAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};