import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  requiredRole?: 'creator' | 'buyer' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireEmailVerification = false,
  requiredRole
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute check:', {
    user: !!user,
    userEmail: user?.email,
    profile: !!profile,
    profileEmail: profile?.email,
    profileRole: profile?.role,
    loading,
    currentPath: location.pathname,
    requireEmailVerification,
    requiredRole
  });

  // Show loading while auth is initializing
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // No user at all - redirect to login
  if (!user) {
    console.log('🚫 No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User exists but no profile - this should be very rare now, but show loading
  if (!profile) {
    console.log('⚠️ User exists but no profile, showing loading...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && profile.role !== requiredRole) {
    console.log(`🚫 Role mismatch: required ${requiredRole}, user has ${profile.role}`);
    
    // Redirect based on user's actual role
    if (profile.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (profile.role === 'creator') {
      return <Navigate to="/dashboard\" replace />;
    } else if (profile.role === 'buyer') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // For development/demo purposes, we'll skip email verification requirement
  // In production, you might want to enforce this
  if (requireEmailVerification && !profile.email_verified) {
    console.log('📧 Email verification required but not verified - allowing access for development');
    // For now, we'll allow access anyway - you can uncomment the line below to enforce verification
    // return <Navigate to="/email-confirmation" replace />;
  }

  console.log('✅ All checks passed, rendering protected content');
  return <>{children}</>;
};