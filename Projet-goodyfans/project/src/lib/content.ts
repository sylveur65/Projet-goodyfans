import { supabase } from './supabase';
import { moderateContent } from './moderation';

interface ContentData {
  title: string;
  description?: string;
  price: number;
  content_type: 'media' | 'link';
  media_id?: string | null;
  external_url?: string | null;
  expiry_days?: number | null;
  is_active: boolean;
}

export interface Content {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  price: number;
  content_type: 'media' | 'link';
  media_id?: string;
  external_url?: string;
  expiry_days?: number;
  is_active: boolean;
  view_count: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  media?: {
    id: string;
    filename: string;
    cloudflare_url: string;
    mime_type: string;
    file_size: number;
  };
  // Moderation status
  moderation_status?: 'pending' | 'approved' | 'rejected';
}

// Create new content with automatic moderation
export const createContent = async (contentData: ContentData): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🎬 Creating new content with moderation:', contentData);

    // Prepare the data for insertion
    const insertData = {
      creator_id: user.id,
      title: contentData.title,
      description: contentData.description || null,
      price: contentData.price,
      content_type: contentData.content_type,
      media_id: contentData.media_id || null,
      external_url: contentData.external_url || null,
      expiry_days: contentData.expiry_days || null,
      is_active: false, // Start as inactive until moderation is complete
      view_count: 0,
      purchase_count: 0
    };

    const { data, error } = await supabase
      .from('ppvcontent')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating content:', error);
      throw error;
    }

    console.log('✅ Content created, starting moderation:', data);

    // Get media URL if it's a media content
    let mediaUrl: string | undefined;
    if (contentData.content_type === 'media' && contentData.media_id) {
      const { data: mediaData } = await supabase
        .from('mediafile')
        .select('cloudflare_url')
        .eq('id', contentData.media_id)
        .single();
      
      mediaUrl = mediaData?.cloudflare_url;
    }

    // Start automatic moderation
    try {
      const moderationResult = await moderateContent({
        id: data.id,
        title: contentData.title,
        description: contentData.description,
        content_type: contentData.content_type,
        media_url: mediaUrl,
        external_url: contentData.external_url,
      });

      console.log('🛡️ Moderation completed:', moderationResult);

      // If content is automatically approved, activate it
      if (moderationResult.status === 'approved') {
        await supabase
          .from('ppvcontent')
          .update({ 
            is_active: contentData.is_active, // Use original is_active value
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        console.log('✅ Content automatically approved and activated');
      } else {
        console.log('⏳ Content requires human review or was rejected');
      }

    } catch (moderationError) {
      console.error('❌ Moderation error:', moderationError);
      // Content remains inactive if moderation fails
    }

    return data.id;
  } catch (error) {
    console.error('❌ Error creating content:', error);
    throw error;
  }
};

// Update existing content
export const updateContent = async (contentId: string, contentData: ContentData): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('📝 Updating content:', contentId, contentData);

    const updateData = {
      title: contentData.title,
      description: contentData.description || null,
      price: contentData.price,
      content_type: contentData.content_type,
      media_id: contentData.media_id || null,
      external_url: contentData.external_url || null,
      expiry_days: contentData.expiry_days || null,
      is_active: contentData.is_active,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('ppvcontent')
      .update(updateData)
      .eq('id', contentId)
      .eq('creator_id', user.id);

    if (error) {
      console.error('❌ Error updating content:', error);
      throw error;
    }

    console.log('✅ Content updated successfully');
  } catch (error) {
    console.error('❌ Error updating content:', error);
    throw error;
  }
};

// Get user's content with moderation status
export const getUserContent = async (): Promise<Content[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First, fetch the content with media information
    const { data: contentData, error: contentError } = await supabase
      .from('ppvcontent')
      .select(`
        *,
        media:mediafile(
          id,
          filename,
          cloudflare_url,
          mime_type,
          file_size
        )
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (contentError) {
      console.error('❌ Error fetching content:', contentError);
      throw contentError;
    }

    if (!contentData || contentData.length === 0) {
      return [];
    }

    // Get content IDs for moderation status lookup
    const contentIds = contentData.map(item => item.id);

    // Fetch moderation status separately
    const { data: moderationData, error: moderationError } = await supabase
      .from('content_moderation')
      .select('content_id, status')
      .in('content_id', contentIds)
      .order('created_at', { ascending: false });

    if (moderationError) {
      console.error('❌ Error fetching moderation data:', moderationError);
      // Don't throw error, just continue without moderation status
    }

    // Create a map of content_id to moderation status
    const moderationMap = new Map();
    if (moderationData) {
      moderationData.forEach(mod => {
        if (!moderationMap.has(mod.content_id)) {
          moderationMap.set(mod.content_id, mod.status);
        }
      });
    }

    // Add moderation status to content
    const contentWithModeration = contentData.map(item => ({
      ...item,
      moderation_status: moderationMap.get(item.id) || 'approved'
    }));

    return contentWithModeration;
  } catch (error) {
    console.error('❌ Error fetching content:', error);
    throw error;
  }
};

// Delete content
export const deleteContent = async (contentId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('ppvcontent')
      .delete()
      .eq('id', contentId)
      .eq('creator_id', user.id);

    if (error) {
      console.error('❌ Error deleting content:', error);
      throw error;
    }

    console.log('✅ Content deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting content:', error);
    throw error;
  }
};

// Toggle content active status
export const toggleContentStatus = async (contentId: string, isActive: boolean): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('ppvcontent')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .eq('creator_id', user.id);

    if (error) {
      console.error('❌ Error toggling content status:', error);
      throw error;
    }

    console.log('✅ Content status updated successfully');
  } catch (error) {
    console.error('❌ Error toggling content status:', error);
    throw error;
  }
};

// Get content analytics
export const getContentAnalytics = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('ppvcontent')
      .select('id, title, view_count, purchase_count, price, is_active, created_at')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching content analytics:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error fetching content analytics:', error);
    throw error;
  }
};

// Get public content by ID (for purchase page)
export const getPublicContent = async (contentId: string) => {
  try {
    const { data, error } = await supabase
      .from('ppvcontent')
      .select(`
        id,
        title,
        description,
        price,
        content_type,
        external_url,
        expiry_days,
        created_at,
        creator:profile!creator_id(
          full_name,
          bio
        ),
        media:mediafile(
          filename,
          mime_type,
          file_size
        )
      `)
      .eq('id', contentId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching public content:', error);
    throw error;
  }
};

// Create guest purchase
export const createGuestPurchase = async (
  contentId: string,
  email: string,
  fullName: string,
  amount: number
): Promise<string> => {
  try {
    // Generate a unique access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // In a real implementation, this would integrate with Stripe
    // For demo purposes, we'll create a purchase record directly
    const { data, error } = await supabase
      .from('purchase')
      .insert({
        buyer_id: null, // Guest purchase
        content_id: contentId,
        amount: amount,
        stripe_payment_id: accessToken,
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Increment purchase count
    await supabase.rpc('increment_purchase_count', { content_uuid: contentId });

    return accessToken;
  } catch (error) {
    console.error('❌ Error creating guest purchase:', error);
    throw error;
  }
};

// Format price for display
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calculate expiry date
export const calculateExpiryDate = (createdAt: string, expiryDays: number | null): Date | null => {
  if (!expiryDays) return null;
  
  const created = new Date(createdAt);
  const expiry = new Date(created);
  expiry.setDate(expiry.getDate() + expiryDays);
  
  return expiry;
};

// Check if content is expired
export const isContentExpired = (createdAt: string, expiryDays: number | null): boolean => {
  if (!expiryDays) return false;
  
  const expiryDate = calculateExpiryDate(createdAt, expiryDays);
  if (!expiryDate) return false;
  
  return new Date() > expiryDate;
};