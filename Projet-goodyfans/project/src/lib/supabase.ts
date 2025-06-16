import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status (without exposing sensitive data)
console.log('🔧 Supabase Configuration Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValid: supabaseUrl?.includes('supabase.co') || supabaseUrl?.includes('webcontainer-api.io'),
  keyValid: supabaseAnonKey?.startsWith('eyJ')
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please create a .env file with:');
  console.error('VITE_SUPABASE_URL=https://your-project-ref.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your_anon_key');
  
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Check if URL is a placeholder value
if (supabaseUrl === 'your_supabase_project_url' || supabaseUrl === 'https://your-project-ref.supabase.co') {
  console.error('❌ Supabase URL is still set to placeholder value!');
  console.error('Please update your .env file with your actual Supabase project URL');
  console.error('Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
  
  throw new Error('Supabase URL is set to placeholder. Please update .env with your actual project URL.');
}

// Check if anon key is a placeholder value
if (supabaseAnonKey === 'your_supabase_anon_key' || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('❌ Supabase anon key is still set to placeholder value!');
  console.error('Please update your .env file with your actual Supabase anon key');
  console.error('Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
  
  throw new Error('Supabase anon key is set to placeholder. Please update .env with your actual anon key.');
}

// Allow both production Supabase URLs and development WebContainer URLs
const isValidUrl = supabaseUrl.includes('supabase.co') || supabaseUrl.includes('webcontainer-api.io');

if (!isValidUrl) {
  console.error('❌ Invalid Supabase URL format!');
  console.error('Current URL:', supabaseUrl);
  console.error('Expected format: https://your-project-ref.supabase.co');
  throw new Error('Invalid Supabase URL. Should be like: https://your-project-ref.supabase.co or a valid development URL');
}

if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase anon key format!');
  console.error('Anon key should start with "eyJ"');
  throw new Error('Invalid Supabase anon key. Should start with "eyJ"');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    fetch: (url, options = {}) => {
      console.log('🌐 Supabase request to:', url);
      
      // Create a new Headers object from existing headers
      const headers = new Headers(options.headers);
      
      // Add cache control headers
      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');
      
      // Ensure API key is present if no Authorization header exists
      if (!headers.has('Authorization') && !headers.has('apikey')) {
        headers.set('apikey', supabaseAnonKey);
      }
      
      return fetch(url, {
        ...options,
        headers
      });
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

console.log('✅ Supabase client initialized successfully');

export type UserRole = 'creator' | 'buyer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  bio?: string;
  email_verified: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

interface PPVContent {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  price: number;
  preview_url?: string;
  content_url: string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  view_count: number;
  purchase_count: number;
}

interface Purchase {
  id: string;
  buyer_id: string;
  content_id: string;
  amount: number;
  stripe_payment_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at?: string;
}

interface MediaFile {
  id: string;
  creator_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  created_at: string;
}

interface EmailVerification {
  id: string;
  user_id: string;
  email: string;
  verification_token: string;
  expires_at: string;
  verified: boolean;
  verified_at?: string;
  created_at: string;
}