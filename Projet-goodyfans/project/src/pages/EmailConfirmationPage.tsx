import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Heart, Mail, ArrowLeft, RefreshCw, CheckCircle, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { resendConfirmation } from '../lib/auth';
import toast from 'react-hot-toast';

export const EmailConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState((searchParams.get('email') || '').trim());
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || resending || resendCooldown > 0) return;
    
    setResending(true);
    try {
      await resendConfirmation(trimmedEmail);
      toast.success('Confirmation email sent! Please check your inbox.');
      setResendCooldown(60);
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      if (error.message?.includes('Email rate limit exceeded')) {
        toast.error('Please wait before requesting another email.');
        setResendCooldown(60);
      } else {
        toast.error(error.message || 'Failed to resend confirmation email');
      }
    } finally {
      setResending(false);
    }
  };

  const handleCheckEmail = () => {
    window.open('mailto:', '_blank');
  };

  const handleTryLogin = () => {
    navigate('/login');
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
            <p className="text-gray-600 mt-2">Check your email</p>
          </div>

          {/* Success Message */}
          <div className="mb-6 p-6 bg-green-50 rounded-xl border border-green-200 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">Account Created Successfully!</h3>
            <p className="text-sm text-green-700">
              We've sent a confirmation email to:
            </p>
            <p className="font-semibold text-green-800 mt-1 break-all">{email}</p>
          </div>

          {/* Instructions */}
          <div className="mb-6 space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Step 1: Check Your Email</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Click the confirmation link in the email we sent you. This will open a new window to verify your account.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-purple-900">Step 2: Return Here to Login</h4>
                <p className="text-xs text-purple-700 mt-1">
                  After clicking the verification link, come back to this page and try logging in with your credentials.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Can't Find the Email?</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  Check your spam folder. Sometimes confirmation emails end up there.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckEmail}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Open Email App</span>
            </button>

            <button
              onClick={handleTryLogin}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>I've Verified - Try Login</span>
            </button>

            <button
              onClick={handleResendConfirmation}
              disabled={resending || resendCooldown > 0}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="w-5 h-5" />
                  <span>Resend in {resendCooldown}s</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Resend Confirmation Email</span>
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Verification Tips</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• The verification link will open in a new window</li>
              <li>• After verification, return here and click "I've Verified - Try Login"</li>
              <li>• If verification fails, try resending the email</li>
              <li>• Make sure you're using the correct email address</li>
            </ul>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};