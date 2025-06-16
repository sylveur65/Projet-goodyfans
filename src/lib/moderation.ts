// Système de modération automatique avec Azure Content Moderator - Version optimisée pour éviter stack depth
import { supabase } from './supabase';

// Configuration Azure Content Moderator
const AZURE_CONFIG = {
  endpoint: import.meta.env.VITE_AZURE_CONTENT_MODERATOR_ENDPOINT,
  subscriptionKey: import.meta.env.VITE_AZURE_CONTENT_MODERATOR_KEY,
  region: import.meta.env.VITE_AZURE_REGION || 'francecentral',
};

// Types pour la modération
export interface ModerationResult {
  isApproved: boolean;
  confidence: number;
  categories: {
    adult: number;
    violence: number;
    hate: number;
    selfHarm: number;
  };
  flags: string[];
  requiresHumanReview: boolean;
  reason?: string;
}

export interface ModerationRecord {
  id: string;
  content_id: string;
  content_type: 'image' | 'video' | 'text' | 'url';
  status: 'pending' | 'approved' | 'rejected' | 'reviewing';
  auto_result: ModerationResult;
  human_review?: {
    reviewer_id: string;
    decision: 'approve' | 'reject';
    reason?: string;
    reviewed_at: string;
  };
  created_at: string;
  updated_at: string;
}

// Seuils optimisés pour plateforme adulte légale
const MODERATION_THRESHOLDS = {
  // Seuils pour approbation automatique (scores faibles = contenu sûr)
  AUTO_APPROVE: {
    adult: 0.95,       // 95% - Très permissif sur le contenu adulte (c'est le thème de la plateforme)
    violence: 0.1,     // 10% - Très strict sur la violence
    hate: 0.05,        // 5% - Extrêmement strict sur les discours haineux
    selfHarm: 0.05,    // 5% - Extrêmement strict sur l'auto-mutilation
  },
  // Seuils pour rejet automatique (scores élevés = contenu problématique)
  AUTO_REJECT: {
    adult: 0.99,       // 99% - Seul le contenu extrême est rejeté automatiquement
    violence: 0.2,     // 20% - Rejet automatique dès 20% de violence détectée
    hate: 0.2,         // 20% - Rejet automatique dès 20% de discours haineux
    selfHarm: 0.2,     // 20% - Rejet automatique dès 20% d'auto-mutilation
  },
  // Entre les deux = révision humaine requise
};

// Vérification de la configuration Azure
export const checkAzureConfiguration = (): { configured: boolean; message: string } => {
  const hasEndpoint = !!AZURE_CONFIG.endpoint && AZURE_CONFIG.endpoint !== 'your_azure_endpoint';
  const hasKey = !!AZURE_CONFIG.subscriptionKey && AZURE_CONFIG.subscriptionKey !== 'your_azure_subscription_key';
  
  console.log('🔧 Azure Configuration Check:', {
    hasEndpoint,
    hasKey,
    endpoint: AZURE_CONFIG.endpoint ? `${AZURE_CONFIG.endpoint.substring(0, 30)}...` : 'missing',
    region: AZURE_CONFIG.region
  });
  
  if (!hasEndpoint || !hasKey) {
    return {
      configured: false,
      message: 'Azure Content Moderator non configuré. Variables d\'environnement manquantes.'
    };
  }
  
  return {
    configured: true,
    message: 'Azure Content Moderator configuré et prêt.'
  };
};

// Validation de la configuration Azure
const validateAzureConfig = (): boolean => {
  const config = checkAzureConfiguration();
  
  if (!config.configured) {
    console.warn('⚠️ Azure Content Moderator not configured. Using fallback moderation.');
    console.warn('💡 Pour configurer Azure:');
    console.warn('   1. Créez un service Azure Content Moderator');
    console.warn('   2. Ajoutez les variables d\'environnement:');
    console.warn('      VITE_AZURE_CONTENT_MODERATOR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/');
    console.warn('      VITE_AZURE_CONTENT_MODERATOR_KEY=your_subscription_key');
    console.warn('      VITE_AZURE_REGION=francecentral');
    return false;
  }
  
  return true;
};

// Modération d'image avec Azure Content Moderator
export const moderateImage = async (imageUrl: string): Promise<ModerationResult> => {
  try {
    if (!validateAzureConfig()) {
      console.log('🔄 Using fallback moderation for image');
      return fallbackImageModeration(imageUrl);
    }

    console.log('🔍 Moderating image with Azure:', imageUrl.substring(0, 50) + '...');

    // Utiliser l'edge function pour la modération Azure avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          type: 'image',
          url: imageUrl,
          config: {
            endpoint: AZURE_CONFIG.endpoint,
            subscriptionKey: AZURE_CONFIG.subscriptionKey,
            region: AZURE_CONFIG.region
          }
        }
      });

      clearTimeout(timeoutId);

      if (error) {
        console.warn('⚠️ Azure moderation failed, using fallback:', error);
        return fallbackImageModeration(imageUrl);
      }

      if (data && data.success) {
        console.log('✅ Azure moderation successful:', data.result);
        return data.result;
      } else {
        console.warn('⚠️ Azure returned invalid response, using fallback');
        return fallbackImageModeration(imageUrl);
      }
    } catch (invokeError: any) {
      clearTimeout(timeoutId);
      
      if (invokeError.name === 'AbortError') {
        console.warn('⚠️ Azure moderation timeout, using fallback');
      } else {
        console.warn('⚠️ Azure moderation error, using fallback:', invokeError);
      }
      
      return fallbackImageModeration(imageUrl);
    }

  } catch (error) {
    console.error('❌ Error moderating image:', error);
    return fallbackImageModeration(imageUrl);
  }
};

// Modération de texte avec Azure Content Moderator
export const moderateText = async (text: string): Promise<ModerationResult> => {
  try {
    if (!validateAzureConfig()) {
      console.log('🔄 Using fallback moderation for text');
      return fallbackTextModeration(text);
    }

    console.log('🔍 Moderating text with Azure:', text.substring(0, 100) + '...');

    // Utiliser l'edge function pour la modération Azure avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          type: 'text',
          content: text,
          config: {
            endpoint: AZURE_CONFIG.endpoint,
            subscriptionKey: AZURE_CONFIG.subscriptionKey,
            region: AZURE_CONFIG.region
          }
        }
      });

      clearTimeout(timeoutId);

      if (error) {
        console.warn('⚠️ Azure text moderation failed, using fallback:', error);
        return fallbackTextModeration(text);
      }

      if (data && data.success) {
        console.log('✅ Azure text moderation successful:', data.result);
        return data.result;
      } else {
        console.warn('⚠️ Azure returned invalid response, using fallback');
        return fallbackTextModeration(text);
      }
    } catch (invokeError: any) {
      clearTimeout(timeoutId);
      
      if (invokeError.name === 'AbortError') {
        console.warn('⚠️ Azure text moderation timeout, using fallback');
      } else {
        console.warn('⚠️ Azure text moderation error, using fallback:', invokeError);
      }
      
      return fallbackTextModeration(text);
    }

  } catch (error) {
    console.error('❌ Error moderating text:', error);
    return fallbackTextModeration(text);
  }
};

// Évaluation des scores de modération avec seuils optimisés
const evaluateModerationScores = (categories: ModerationResult['categories'], flags: string[]): ModerationResult => {
  const maxScore = Math.max(...Object.values(categories));
  
  // Logique spécialisée pour plateforme adulte
  
  // Vérifier si le contenu doit être rejeté automatiquement (violence, haine, auto-mutilation)
  const shouldReject = 
    categories.violence > MODERATION_THRESHOLDS.AUTO_REJECT.violence ||
    categories.hate > MODERATION_THRESHOLDS.AUTO_REJECT.hate ||
    categories.selfHarm > MODERATION_THRESHOLDS.AUTO_REJECT.selfHarm ||
    categories.adult > MODERATION_THRESHOLDS.AUTO_REJECT.adult; // Seul le contenu adulte extrême

  // Vérifier si le contenu peut être approuvé automatiquement
  const canAutoApprove = 
    categories.violence <= MODERATION_THRESHOLDS.AUTO_APPROVE.violence &&
    categories.hate <= MODERATION_THRESHOLDS.AUTO_APPROVE.hate &&
    categories.selfHarm <= MODERATION_THRESHOLDS.AUTO_APPROVE.selfHarm;
    // Note: pas de restriction sur le contenu adulte pour l'approbation automatique

  let isApproved: boolean;
  let requiresHumanReview: boolean;
  let reason: string | undefined;

  if (shouldReject) {
    isApproved = false;
    requiresHumanReview = false;
    
    // Messages spécifiques selon le type de contenu problématique
    if (categories.violence > MODERATION_THRESHOLDS.AUTO_REJECT.violence) {
      reason = `Contenu rejeté: Violence détectée (${(categories.violence * 100).toFixed(1)}%)`;
    } else if (categories.hate > MODERATION_THRESHOLDS.AUTO_REJECT.hate) {
      reason = `Contenu rejeté: Discours haineux détecté (${(categories.hate * 100).toFixed(1)}%)`;
    } else if (categories.selfHarm > MODERATION_THRESHOLDS.AUTO_REJECT.selfHarm) {
      reason = `Contenu rejeté: Auto-mutilation détectée (${(categories.selfHarm * 100).toFixed(1)}%)`;
    } else {
      reason = `Contenu rejeté: Contenu extrême détecté (${flags.join(', ')})`;
    }
  } else if (canAutoApprove) {
    isApproved = true;
    requiresHumanReview = false;
    
    if (categories.adult > 0.5) {
      reason = `Contenu adulte approuvé automatiquement (${(categories.adult * 100).toFixed(1)}% adulte, conforme à la plateforme)`;
    } else {
      reason = `Contenu approuvé automatiquement (scores de sécurité acceptables)`;
    }
  } else {
    isApproved = false;
    requiresHumanReview = true;
    
    // Messages spécifiques pour la révision humaine
    if (categories.violence > MODERATION_THRESHOLDS.AUTO_APPROVE.violence) {
      reason = `Révision humaine requise: Violence détectée (${(categories.violence * 100).toFixed(1)}%)`;
    } else if (categories.hate > MODERATION_THRESHOLDS.AUTO_APPROVE.hate) {
      reason = `Révision humaine requise: Discours potentiellement haineux (${(categories.hate * 100).toFixed(1)}%)`;
    } else if (categories.selfHarm > MODERATION_THRESHOLDS.AUTO_APPROVE.selfHarm) {
      reason = `Révision humaine requise: Auto-mutilation potentielle (${(categories.selfHarm * 100).toFixed(1)}%)`;
    } else {
      reason = `Révision humaine requise: Contenu nécessitant une évaluation manuelle`;
    }
  }

  return {
    isApproved,
    confidence: 1 - maxScore, // Plus le score est bas, plus on est confiant
    categories,
    flags,
    requiresHumanReview,
    reason,
  };
};

// Modération de fallback (sans Azure) - OPTIMISÉE POUR CONTENU ADULTE
const fallbackImageModeration = (imageUrl: string): ModerationResult => {
  console.log('🔄 Using enhanced fallback image moderation for adult platform');
  
  // Modération basique basée sur l'URL et le nom de fichier
  const url = imageUrl.toLowerCase();
  const flags: string[] = [];
  
  // Seuils optimisés pour plateforme adulte
  const categories = { 
    adult: 0.7,      // Assume du contenu adulte par défaut (c'est normal sur cette plateforme)
    violence: 0.05,  // Très faible par défaut
    hate: 0.05,      // Très faible par défaut
    selfHarm: 0.05   // Très faible par défaut
  };

  // Mots-clés problématiques (violence, haine, etc.)
  const violenceKeywords = ['blood', 'weapon', 'gun', 'knife', 'violence', 'kill', 'murder'];
  const hateKeywords = ['nazi', 'racist', 'hate', 'terrorist', 'supremacist'];
  const selfHarmKeywords = ['suicide', 'selfharm', 'cutting', 'harm'];
  
  const foundViolence = violenceKeywords.some(keyword => url.includes(keyword));
  const foundHate = hateKeywords.some(keyword => url.includes(keyword));
  const foundSelfHarm = selfHarmKeywords.some(keyword => url.includes(keyword));
  
  if (foundViolence) {
    categories.violence = 0.8;
    flags.push('violence_keywords');
  }
  
  if (foundHate) {
    categories.hate = 0.9;
    flags.push('hate_keywords');
  }
  
  if (foundSelfHarm) {
    categories.selfHarm = 0.9;
    flags.push('selfharm_keywords');
  }
  
  // Pour le contenu adulte normal, on l'accepte
  flags.push('adult_content_platform');

  const result = evaluateModerationScores(categories, flags);
  console.log('📊 Fallback moderation result (adult platform optimized):', result);
  
  return result;
};

const fallbackTextModeration = (text: string): ModerationResult => {
  console.log('🔄 Using enhanced fallback text moderation for adult platform');
  
  const lowerText = text.toLowerCase();
  const flags: string[] = [];
  
  // Seuils optimisés pour plateforme adulte
  const categories = { 
    adult: 0.6,      // Contenu adulte attendu et accepté
    violence: 0.05,  // Très strict sur la violence
    hate: 0.05,      // Très strict sur la haine
    selfHarm: 0.05   // Très strict sur l'auto-mutilation
  };

  // Mots-clés de violence (très strict)
  const violenceKeywords = ['kill', 'murder', 'violence', 'weapon', 'gun', 'knife', 'blood', 'torture', 'abuse'];
  const hateKeywords = ['hate', 'racist', 'nazi', 'terrorist', 'supremacist', 'genocide', 'discrimination'];
  const selfHarmKeywords = ['suicide', 'selfharm', 'cutting', 'harm yourself', 'kill yourself'];

  violenceKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      categories.violence = Math.max(categories.violence, 0.9);
      flags.push('violence_language');
    }
  });

  hateKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      categories.hate = Math.max(categories.hate, 0.95);
      flags.push('hate_speech');
    }
  });

  selfHarmKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      categories.selfHarm = Math.max(categories.selfHarm, 0.95);
      flags.push('selfharm_content');
    }
  });

  // Le contenu adulte est normal sur cette plateforme
  flags.push('adult_platform_content');

  const result = evaluateModerationScores(categories, flags);
  console.log('📊 Fallback text moderation result (adult platform optimized):', result);
  
  return result;
};

// Modération automatique d'un média spécifique
export const moderateMediaFile = async (mediaId: string): Promise<ModerationRecord> => {
  console.log('🛡️ Starting moderation for media:', mediaId);

  try {
    // Récupérer les informations du média
    const { data: mediaData, error: mediaError } = await supabase
      .from('mediafile')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (mediaError || !mediaData) {
      throw new Error('Media not found');
    }

    console.log('📁 Media data:', mediaData);

    // Vérifier si ce média a déjà été modéré
    const { data: existingModeration } = await supabase
      .from('content_moderation')
      .select('*')
      .eq('content_id', mediaId)
      .single();

    if (existingModeration) {
      console.log('⚠️ Media already moderated:', existingModeration);
      return existingModeration as ModerationRecord;
    }

    // Modérer le média selon son type
    let moderationResult: ModerationResult;
    
    if (mediaData.mime_type.startsWith('image/')) {
      moderationResult = await moderateImage(mediaData.cloudflare_url);
    } else if (mediaData.mime_type.startsWith('video/')) {
      // Pour les vidéos, utiliser une modération basique pour l'instant
      moderationResult = fallbackImageModeration(mediaData.cloudflare_url);
    } else {
      // Pour les autres fichiers, modération très permissive
      moderationResult = {
        isApproved: true,
        confidence: 0.9,
        categories: { adult: 0.1, violence: 0.05, hate: 0.05, selfHarm: 0.05 },
        flags: ['document_file'],
        requiresHumanReview: false,
        reason: 'Document file - auto-approved'
      };
    }

    // Créer l'enregistrement de modération
    const moderationRecord = {
      id: `mod_media_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      content_id: mediaId,
      content_type: mediaData.mime_type.startsWith('image/') ? 'image' as const : 'video' as const,
      status: moderationResult.isApproved ? 'approved' as const : 
              moderationResult.requiresHumanReview ? 'pending' as const : 'rejected' as const,
      auto_result: moderationResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Sauvegarder dans la base de données
    const { error: saveError } = await supabase
      .from('content_moderation')
      .insert(moderationRecord);

    if (saveError) {
      console.error('❌ Error saving moderation record:', saveError);
      throw saveError;
    }

    console.log('✅ Media moderation completed:', {
      mediaId,
      status: moderationRecord.status,
      confidence: moderationResult.confidence,
      flags: moderationResult.flags,
    });

    return moderationRecord as ModerationRecord;

  } catch (error) {
    console.error('❌ Error during media moderation:', error);
    
    // En cas d'erreur, créer un enregistrement qui nécessite une révision humaine
    const errorRecord = {
      id: `mod_error_${Date.now()}`,
      content_id: mediaId,
      content_type: 'image' as const,
      status: 'pending' as const,
      auto_result: {
        isApproved: false,
        confidence: 0,
        categories: { adult: 0, violence: 0, hate: 0, selfHarm: 0 },
        flags: ['moderation_error'],
        requiresHumanReview: true,
        reason: `Moderation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Essayer de sauvegarder l'enregistrement d'erreur
    try {
      await supabase
        .from('content_moderation')
        .insert(errorRecord);
    } catch (saveError) {
      console.error('❌ Failed to save error record:', saveError);
    }

    return errorRecord as ModerationRecord;
  }
};

// Modération complète d'un contenu
export const moderateContent = async (contentData: {
  id: string;
  title: string;
  description?: string;
  content_type: 'media' | 'link';
  media_url?: string;
  external_url?: string;
}): Promise<ModerationRecord> => {
  console.log('🛡️ Starting content moderation for:', contentData.id);

  try {
    // Vérifier si ce contenu a déjà été modéré
    const { data: existingModeration } = await supabase
      .from('content_moderation')
      .select('*')
      .eq('content_id', contentData.id)
      .single();

    if (existingModeration) {
      console.log('⚠️ Content already moderated:', existingModeration);
      return existingModeration as ModerationRecord;
    }

    // Modérer le titre
    const titleResult = await moderateText(contentData.title);
    
    // Modérer la description si elle existe
    let descriptionResult: ModerationResult | null = null;
    if (contentData.description) {
      descriptionResult = await moderateText(contentData.description);
    }

    // Modérer le contenu média si c'est une image
    let mediaResult: ModerationResult | null = null;
    if (contentData.content_type === 'media' && contentData.media_url) {
      // Vérifier si c'est une image (pour la modération visuelle)
      if (contentData.media_url.includes('image') || 
          contentData.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        mediaResult = await moderateImage(contentData.media_url);
      }
    }

    // Modérer l'URL externe si elle existe
    let urlResult: ModerationResult | null = null;
    if (contentData.content_type === 'link' && contentData.external_url) {
      urlResult = await moderateText(contentData.external_url);
    }

    // Combiner tous les résultats pour une décision finale
    const allResults = [titleResult, descriptionResult, mediaResult, urlResult].filter(Boolean) as ModerationResult[];
    
    const combinedResult = combineResults(allResults);

    // Créer l'enregistrement de modération
    const moderationRecord = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      content_id: contentData.id,
      content_type: contentData.content_type === 'media' ? 'image' as const : 'url' as const,
      status: combinedResult.isApproved ? 'approved' as const : 
              combinedResult.requiresHumanReview ? 'pending' as const : 'rejected' as const,
      auto_result: combinedResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Sauvegarder dans la base de données
    const { error: saveError } = await supabase
      .from('content_moderation')
      .insert(moderationRecord);

    if (saveError) {
      console.error('❌ Error saving moderation record:', saveError);
      throw saveError;
    }

    console.log('✅ Content moderation completed:', {
      contentId: contentData.id,
      status: moderationRecord.status,
      confidence: combinedResult.confidence,
      flags: combinedResult.flags,
    });

    return moderationRecord as ModerationRecord;

  } catch (error) {
    console.error('❌ Error during content moderation:', error);
    
    // En cas d'erreur, créer un enregistrement qui nécessite une révision humaine
    const errorRecord = {
      id: `mod_error_${Date.now()}`,
      content_id: contentData.id,
      content_type: 'image' as const,
      status: 'pending' as const,
      auto_result: {
        isApproved: false,
        confidence: 0,
        categories: { adult: 0, violence: 0, hate: 0, selfHarm: 0 },
        flags: ['moderation_error'],
        requiresHumanReview: true,
        reason: `Moderation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase
        .from('content_moderation')
        .insert(errorRecord);
    } catch (saveError) {
      console.error('❌ Failed to save error record:', saveError);
    }

    return errorRecord as ModerationRecord;
  }
};

// Combiner plusieurs résultats de modération
const combineResults = (results: ModerationResult[]): ModerationResult => {
  if (results.length === 0) {
    return {
      isApproved: false,
      confidence: 0,
      categories: { adult: 0, violence: 0, hate: 0, selfHarm: 0 },
      flags: ['no_results'],
      requiresHumanReview: true,
      reason: 'No moderation results available',
    };
  }

  // Prendre les scores maximum de chaque catégorie
  const combinedCategories = {
    adult: Math.max(...results.map(r => r.categories.adult)),
    violence: Math.max(...results.map(r => r.categories.violence)),
    hate: Math.max(...results.map(r => r.categories.hate)),
    selfHarm: Math.max(...results.map(r => r.categories.selfHarm)),
  };

  // Combiner tous les flags
  const combinedFlags = [...new Set(results.flatMap(r => r.flags))];

  return evaluateModerationScores(combinedCategories, combinedFlags);
};

// Obtenir les statistiques de modération avec requêtes optimisées
export const getModerationStats = async (): Promise<{
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  autoApprovalRate: number;
}> => {
  try {
    console.log('📊 Getting moderation stats with optimized queries...');
    
    // Utiliser des requêtes COUNT avec select minimal pour éviter le stack depth error
    const [totalResult, approvedResult, rejectedResult, pendingResult] = await Promise.all([
      // Total count - select only id to minimize query complexity
      supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true }),
      
      // Approved count
      supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      
      // Rejected count
      supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected'),
      
      // Pending count
      supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ]);

    // Vérifier les erreurs
    if (totalResult.error) {
      console.error('❌ Error fetching total count:', totalResult.error);
      throw totalResult.error;
    }
    if (approvedResult.error) {
      console.error('❌ Error fetching approved count:', approvedResult.error);
      throw approvedResult.error;
    }
    if (rejectedResult.error) {
      console.error('❌ Error fetching rejected count:', rejectedResult.error);
      throw rejectedResult.error;
    }
    if (pendingResult.error) {
      console.error('❌ Error fetching pending count:', pendingResult.error);
      throw pendingResult.error;
    }

    const stats = {
      total: totalResult.count || 0,
      approved: approvedResult.count || 0,
      rejected: rejectedResult.count || 0,
      pending: pendingResult.count || 0,
      autoApprovalRate: 0,
    };

    // Calculer le taux d'approbation automatique
    stats.autoApprovalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;

    console.log('✅ Moderation stats calculated successfully:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error getting moderation stats:', error);
    
    // En cas d'erreur, retourner des stats par défaut
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      autoApprovalRate: 0,
    };
  }
};

// Révision humaine
export const submitHumanReview = async (
  moderationId: string,
  decision: 'approve' | 'reject',
  reason?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const humanReview = {
      reviewer_id: user.id,
      decision,
      reason,
      reviewed_at: new Date().toISOString(),
    };

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('content_moderation')
      .update({
        status: newStatus,
        human_review: humanReview,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moderationId);

    if (error) throw error;

    console.log('✅ Human review submitted:', { moderationId, decision, reason });
  } catch (error) {
    console.error('❌ Error submitting human review:', error);
    throw error;
  }
};

// Modérer tous les médias existants
export const moderateAllExistingMedia = async (): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  pending: number;
  errors: string[];
}> => {
  console.log('🔄 Starting bulk moderation of existing media...');
  
  try {
    // Récupérer tous les médias qui n'ont pas encore été modérés
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('mediafile')
      .select(`
        id,
        filename,
        mime_type,
        cloudflare_url,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50); // Limiter pour éviter les problèmes de performance

    if (mediaError) {
      throw mediaError;
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        processed: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        errors: ['No media files found']
      };
    }

    console.log(`📊 Found ${mediaFiles.length} media files to check`);

    // Vérifier quels médias ont déjà été modérés
    const { data: existingModerations, error: moderationError } = await supabase
      .from('content_moderation')
      .select('content_id')
      .in('content_id', mediaFiles.map(m => m.id));

    if (moderationError) {
      console.warn('Warning: Could not check existing moderations:', moderationError);
    }

    const moderatedIds = new Set(existingModerations?.map(m => m.content_id) || []);
    const unmoderatdMedia = mediaFiles.filter(media => !moderatedIds.has(media.id));

    console.log(`📋 ${unmoderatdMedia.length} media files need moderation`);

    let processed = 0;
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    const errors: string[] = [];

    // Modérer chaque média
    for (const media of unmoderatdMedia) {
      try {
        console.log(`🔍 Moderating media: ${media.filename}`);
        
        const moderationRecord = await moderateMediaFile(media.id);
        processed++;

        switch (moderationRecord.status) {
          case 'approved':
            approved++;
            break;
          case 'rejected':
            rejected++;
            break;
          case 'pending':
            pending++;
            break;
        }

        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`❌ Error moderating media ${media.filename}:`, error);
        errors.push(`${media.filename}: ${error.message}`);
      }
    }

    const result = {
      processed,
      approved,
      rejected,
      pending,
      errors
    };

    console.log('✅ Bulk moderation completed:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Error during bulk moderation:', error);
    return {
      processed: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      errors: [error.message]
    };
  }
};