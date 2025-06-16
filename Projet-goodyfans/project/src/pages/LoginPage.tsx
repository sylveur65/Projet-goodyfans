import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { signIn } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Check if user came from email verification
  const fromVerification = searchParams.get('verified') === 'true';
  const verifiedEmail = searchParams.get('email');

  // Check environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

  // Pre-fill email if coming from verification
  useEffect(() => {
    if (verifiedEmail) {
      setEmail(verifiedEmail);
    }
  }, [verifiedEmail]);

  // Show verification success message
  useEffect(() => {
    if (fromVerification) {
      toast.success('✅ Email verified successfully! You can now sign in.');
    }
  }, [fromVerification]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && hasSupabaseConfig) {
      console.log('👤 User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, hasSupabaseConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasSupabaseConfig) {
      toast.error('Supabase configuration is missing. Please check your environment variables.');
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 Attempting login for:', email.trim());
      await signIn(email.trim(), password);
      console.log('✅ Login successful, redirecting...');
      toast.success('Welcome back!');
      
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please check your email and click the confirmation link before signing in.');
      } else if (error.message?.includes('Too many requests')) {
        toast.error('Too many login attempts. Please wait a moment and try again.');
      } else if (error.message?.includes('User not found')) {
        toast.error('No account found with this email address. Please sign up first.');
      } else {
        toast.error(error.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show configuration error if Supabase is not configured
  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                GoodyFans
              </h1>
            </div>

            <div className="p-6 bg-red-50 rounded-xl border border-red-200 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-2">Configuration Required</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Supabase environment variables are missing. Please configure your .env file with:
                  </p>
                  <div className="bg-red-100 p-3 rounded text-xs font-mono text-red-800">
                    VITE_SUPABASE_URL=your_project_url<br/>
                    VITE_SUPABASE_ANON_KEY=your_anon_key
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to get Supabase credentials:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                    <li>Create a new project or select existing one</li>
                    <li>Go to Settings → API</li>
                    <li>Copy the Project URL and anon public key</li>
                    <li>Add them to your .env file</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              GoodyFans
            </h1>
            <p className="text-gray-600 mt-2">Welcome back! Sign in to continue</p>
          </div>

          {/* Verification Success Message */}
          {fromVerification && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">Email Verified Successfully!</h4>
                  <p className="text-xs text-green-700 mt-1">
                    Your account is now active. Please sign in with your credentials below.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  required
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

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};