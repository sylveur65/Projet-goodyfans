import { supabase } from './supabase';
import type { UserRole } from './supabase';

// Use the current WebContainer URL
const CURRENT_URL = window.location.origin;

export const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
  console.log('🔐 Starting signup process for:', { email, fullName, role });
  
  // Use the current URL for redirect
  const redirectUrl = `${CURRENT_URL}/email-confirmed`;
  console.log('📧 Using redirect URL:', redirectUrl);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
      emailRedirectTo: redirectUrl,
    }
  });

  if (error) {
    console.error('❌ Signup error:', error);
    throw error;
  }
  
  console.log('✅ Signup successful:', data);
  console.log('📧 Email redirect URL:', redirectUrl);
  return data;
};

export const signIn = async (email: string, password: string) => {
  console.log('🔐 Attempting to sign in user:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
  
  console.log('✅ Sign in successful:', data);
  return data;
};

export const signOut = async () => {
  console.log('🚪 Signing out user...');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      // Check if the error is due to an invalid session
      if (error.message?.includes('session_not_found') || 
          error.message?.includes('Session from session_id claim in JWT does not exist') ||
          error.message?.includes('Auth session missing')) {
        console.warn('⚠️ Session already invalid on server, proceeding with local cleanup');
        // Don't throw the error - the session is already gone on the server
        return;
      }
      
      // For other errors, still throw them
      console.error('❌ Sign out error:', error);
      throw error;
    }
    
    console.log('✅ Sign out successful');
  } catch (error: any) {
    // Additional catch for any other session-related errors
    if (error.message?.includes('session_not_found') || 
        error.message?.includes('Session from session_id claim in JWT does not exist') ||
        error.message?.includes('Auth session missing')) {
      console.warn('⚠️ Session already invalid, proceeding with local cleanup');
      return;
    }
    
    console.error('❌ Sign out error:', error);
    throw error;
  }
};

const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const resendConfirmation = async (email: string) => {
  console.log('📧 Resending confirmation email for:', email);
  
  // Use the current URL for redirect
  const redirectUrl = `${CURRENT_URL}/email-confirmed`;
  console.log('📧 Using redirect URL:', redirectUrl);
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: redirectUrl,
    }
  });

  if (error) {
    console.error('❌ Resend confirmation error:', error);
    throw error;
  }

  console.log('✅ Confirmation email resent successfully');
  console.log('📧 Email redirect URL:', redirectUrl);
  return { success: true };
};

const verifyEmail = async (token: string) => {
  console.log('📧 Verifying email with token:', token);
  
  const { data, error } = await supabase.rpc('verify_email_token', {
    verification_token: token
  });

  if (error) {
    console.error('❌ Email verification error:', error);
    throw error;
  }

  console.log('✅ Email verified successfully:', data);
  return data;
};

const resetPassword = async (email: string) => {
  console.log('🔑 Sending password reset email for:', email);
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${CURRENT_URL}/reset-password`,
  });

  if (error) {
    console.error('❌ Password reset error:', error);
    throw error;
  }

  console.log('✅ Password reset email sent successfully');
  return { success: true };
};

const updatePassword = async (newPassword: string) => {
  console.log('🔑 Updating user password');
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    console.error('❌ Password update error:', error);
    throw error;
  }

  console.log('✅ Password updated successfully');
  return { success: true };
};

// Handle email confirmation from URL hash parameters (Supabase format)
export const handleEmailConfirmation = async () => {
  console.log('🔍 Checking for email confirmation parameters...');
  
  // Check for hash parameters (Supabase format)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const errorParam = hashParams.get('error');
  const errorDescription = hashParams.get('error_description');
  
  // Also check for query parameters (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const type = urlParams.get('type');
  
  console.log('📋 URL Parameters:', {
    hash: window.location.hash,
    search: window.location.search,
    accessToken: !!accessToken,
    refreshToken: !!refreshToken,
    errorParam,
    errorDescription,
    token,
    type
  });

  // Handle errors first
  if (errorParam) {
    const message = errorDescription || errorParam;
    console.error('❌ Email confirmation error from URL:', message);
    throw new Error(message);
  }

  if (accessToken && refreshToken) {
    try {
      console.log('🔑 Setting session with tokens from URL...');
      
      // Set the session using the tokens from the URL
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('❌ Session setup error:', error);
        throw error;
      }
      
      console.log('✅ Email confirmed and session set:', data);
      
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Email confirmation failed:', error);
      throw error;
    }
  } else if (token && type === 'signup') {
    try {
      console.log('🔑 Verifying OTP token...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });
      
      if (error) {
        console.error('❌ Email confirmation error:', error);
        throw error;
      }
      
      console.log('✅ Email confirmed successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Email confirmation failed:', error);
      throw error;
    }
  }
  
  console.log('⚠️ No valid confirmation parameters found');
  return { success: false, message: 'No valid confirmation token found' };
};