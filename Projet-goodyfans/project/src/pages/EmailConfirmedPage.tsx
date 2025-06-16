import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, CheckCircle, ArrowRight, Loader, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { handleEmailConfirmation } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const EmailConfirmedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const handleVerification = async () => {
      try {
        console.log('🔍 Starting email verification process...');
        console.log('📍 Current URL:', window.location.href);
        console.log('📋 Search params:', Object.fromEntries(searchParams.entries()));
        console.log('🔗 Hash:', window.location.hash);

        // Check for error parameters first
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('❌ Error in URL parameters:', { errorParam, errorDescription });
          if (errorParam === 'access_denied' && errorDescription?.includes('expired')) {
            setError('The verification link has expired. Please request a new one.');
          } else {
            setError(errorDescription || 'Verification failed');
          }
          setVerifying(false);
          return;
        }

        // Check for hash parameters (access_token, refresh_token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          console.log('✅ Found access token in URL hash - email verification successful');
          setVerified(true);
          toast.success('🎉 Email verified successfully! Welcome to GoodyFans!');
          await refreshProfile();
          
          // Get user email for display
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);
          }
          
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Start countdown
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                navigate('/dashboard');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          setVerifying(false);
          return;
        }

        // Try to handle email confirmation using our function
        const result = await handleEmailConfirmation();
        
        if (result.success) {
          console.log('✅ Email verification successful via handleEmailConfirmation');
          setVerified(true);
          toast.success('🎉 Email verified successfully! Welcome to GoodyFans!');
          await refreshProfile();
          
          // Get user email for display
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);
          }
          
          // Start countdown
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                navigate('/dashboard');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          console.log('⚠️ No verification parameters found, checking if user is already verified...');
          
          // Check if user is already signed in and verified
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email_confirmed_at) {
            console.log('✅ User is already verified');
            setVerified(true);
            setUserEmail(user.email || '');
            toast.success('✅ Email already verified! Welcome back!');
            await refreshProfile();
            
            const countdownInterval = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  navigate('/dashboard');
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            setError('No valid verification token found. Please check your email for the verification link.');
          }
        }
      } catch (error: any) {
        console.error('❌ Verification error:', error);
        if (error.message?.includes('expired')) {
          setError('The verification link has expired. Please request a new one.');
        } else if (error.message?.includes('invalid')) {
          setError('The verification link is invalid. Please request a new one.');
        } else {
          setError(error.message || 'Verification failed');
        }
      } finally {
        setVerifying(false);
      }
    };

    handleVerification();
  }, [searchParams, navigate, refreshProfile]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleRequestNew = () => {
    navigate('/signup');
  };

  const handleBackToLogin = () => {
    // Pass verification status and email to login page
    const params = new URLSearchParams();
    if (verified && userEmail) {
      params.set('verified', 'true');
      params.set('email', userEmail);
    }
    navigate(`/login?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              GoodyFans
            </h1>
          </div>

          {/* Content */}
          <div className="text-center">
            {verifying && (
              <div className="mb-6">
                <Loader className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying your email...</h3>
                <p className="text-gray-600">Please wait while we confirm your email address.</p>
              </div>
            )}

            {verified && (
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-2">🎉 Email Verified Successfully!</h3>
                <p className="text-green-700 mb-4">
                  Welcome to GoodyFans! Your account is now active and ready to use.
                </p>
                {userEmail && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-4">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Account: <span className="text-green-600 break-all">{userEmail}</span>
                    </p>
                    <p className="text-sm text-green-800 font-medium mt-1">
                      Status: <span className="text-green-600">Verified & Active</span>
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Redirecting to your dashboard in <span className="font-bold text-purple-600">{countdown}</span> seconds...
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Verification Issue</h3>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                <p className="text-sm text-gray-600">
                  Don't worry! You can try logging in if your account is already verified, or request a new verification email.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {verified && (
              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {error && (
              <div className="space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Try Logging In</span>
                </button>
                <button
                  onClick={handleRequestNew}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Request New Verification</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Text */}
          {verified && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <h4 className="text-sm font-medium text-purple-900 mb-2">🚀 What's Next?</h4>
              <ul className="text-xs text-purple-700 space-y-1">
                <li>• Complete your profile setup</li>
                <li>• Upload your first content</li>
                <li>• Start building your fanbase</li>
                <li>• Explore the creator dashboard</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};