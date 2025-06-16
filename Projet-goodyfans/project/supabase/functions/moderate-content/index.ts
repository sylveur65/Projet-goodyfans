// Edge Function pour la modération de contenu avec Azure - Version optimisée pour studios de musique
import { corsHeaders } from '../_shared/cors.ts';

// Seuils optimisés pour plateforme adulte
const MODERATION_THRESHOLDS = {
  AUTO_APPROVE: {
    adult: 0.95,      // Très permissif sur le contenu adulte
    violence: 0.3,    // Plus permissif pour les studios
    hate: 0.1,        // Strict sur la haine
    selfHarm: 0.1     // Strict sur l'auto-mutilation
  },
  AUTO_REJECT: {
    adult: 0.99,      // Seul le contenu extrême est rejeté
    violence: 0.7,    // Seuil élevé pour la violence
    hate: 0.4,        // Rejet automatique pour la haine
    selfHarm: 0.4     // Rejet automatique pour l'auto-mutilation
  }
};

// Fonction améliorée pour détecter le contexte de studio/musique
function detectStudioContext(url: string): boolean {
  const studioKeywords = [
    'studio', 'music', 'audio', 'recording', 'producer', 'daw', 'mixing', 'sound',
    'monitor', 'speaker', 'headphone', 'microphone', 'keyboard', 'piano', 'guitar',
    'instrument', 'musician', 'artist', 'beat', 'track', 'song', 'composition',
    'synthesizer', 'midi', 'ableton', 'logic', 'protools', 'cubase', 'fl studio',
    'acoustique', 'enregistrement', 'musicien', 'artiste', 'compositeur'
  ];
  
  const lowerUrl = url.toLowerCase();
  const matchCount = studioKeywords.filter(keyword => lowerUrl.includes(keyword)).length;
  
  // Si au moins 2 mots-clés correspondent, c'est probablement un studio
  return matchCount >= 2 || studioKeywords.some(keyword => 
    keyword.length > 6 && lowerUrl.includes(keyword)
  );
}

// Fonction pour détecter l'équipement technique
function detectTechnicalEquipment(url: string): boolean {
  const techKeywords = [
    'equipment', 'gear', 'tech', 'electronic', 'device', 'monitor', 'computer',
    'setup', 'workstation', 'desk', 'office', 'hardware', 'software', 'system',
    'équipement', 'matériel', 'ordinateur', 'bureau', 'poste', 'travail'
  ];
  
  const lowerUrl = url.toLowerCase();
  return techKeywords.some(keyword => lowerUrl.includes(keyword));
}

// Fonction pour normaliser les flags (éviter les doublons)
function normalizeFlags(flags: string[]): string[] {
  const uniqueFlags = new Set<string>();
  
  // Mapper les flags redondants vers des flags standardisés
  flags.forEach(flag => {
    if (flag === 'studio_context_detected') {
      uniqueFlags.add('studio_context');
    } else if (flag === 'workspace_context') {
      uniqueFlags.add('workspace');
    } else if (flag === 'adult_content_platform' && flags.includes('adult_content')) {
      // Ne pas ajouter adult_content_platform si adult_content existe déjà
    } else {
      uniqueFlags.add(flag);
    }
  });
  
  return Array.from(uniqueFlags);
}

function evaluateModerationScores(categories: any, flags: string[]) {
  const maxScore = Math.max(...Object.values(categories));
  
  // Normaliser les flags
  const normalizedFlags = normalizeFlags(flags);
  
  // Vérifier si c'est un contexte de studio
  const isStudioContext = normalizedFlags.includes('studio_context');
  const isTechnicalEquipment = normalizedFlags.includes('technical_equipment');
  
  // Si c'est un studio ou équipement technique, réduire drastiquement les scores problématiques
  if (isStudioContext || isTechnicalEquipment) {
    categories.violence = Math.max(0.01, categories.violence * 0.1);
    categories.hate = Math.max(0.01, categories.hate * 0.1);
    categories.selfHarm = Math.max(0.01, categories.selfHarm * 0.1);
    console.log('🎵 Studio/technical context detected, scores adjusted:', categories);
  }
  
  // Vérifier si le contenu doit être rejeté automatiquement
  const shouldReject = 
    categories.violence > MODERATION_THRESHOLDS.AUTO_REJECT.violence &&
    categories.hate > MODERATION_THRESHOLDS.AUTO_REJECT.hate &&
    categories.selfHarm > MODERATION_THRESHOLDS.AUTO_REJECT.selfHarm &&
    categories.adult > MODERATION_THRESHOLDS.AUTO_REJECT.adult;
  
  // Vérifier si le contenu peut être approuvé automatiquement
  const canAutoApprove = 
    categories.violence <= MODERATION_THRESHOLDS.AUTO_APPROVE.violence &&
    categories.hate <= MODERATION_THRESHOLDS.AUTO_APPROVE.hate &&
    categories.selfHarm <= MODERATION_THRESHOLDS.AUTO_APPROVE.selfHarm;
  
  let isApproved: boolean;
  let requiresHumanReview: boolean;
  let reason: string;
  
  if (shouldReject && !(isStudioContext || isTechnicalEquipment)) {
    isApproved = false;
    requiresHumanReview = false;
    reason = `Contenu rejeté: Scores de sécurité trop élevés`;
  } else if (canAutoApprove || isStudioContext || isTechnicalEquipment) {
    isApproved = true;
    requiresHumanReview = false;
    
    if (isStudioContext) {
      reason = `Contenu approuvé automatiquement: Studio de musique détecté`;
    } else if (isTechnicalEquipment) {
      reason = `Contenu approuvé automatiquement: Équipement technique détecté`;
    } else if (categories.adult > 0.5) {
      reason = `Contenu adulte approuvé automatiquement (${(categories.adult * 100).toFixed(1)}% adulte, conforme à la plateforme)`;
    } else {
      reason = `Contenu approuvé automatiquement (scores de sécurité acceptables)`;
    }
  } else {
    isApproved = false;
    requiresHumanReview = true;
    reason = `Révision humaine requise: Contenu nécessitant une évaluation manuelle`;
  }
  
  return {
    isApproved,
    confidence: 1 - maxScore,
    categories,
    flags: normalizedFlags,
    requiresHumanReview,
    reason
  };
}

function fallbackModeration(content: string, type: string) {
  console.log(`🔄 Using fallback moderation for ${type}`);
  
  const lowerContent = content.toLowerCase();
  const flags: string[] = [];
  
  // Seuils optimisés pour plateforme adulte
  const categories = {
    adult: type === 'image' ? 0.7 : 0.6,
    violence: 0.05,
    hate: 0.05,
    selfHarm: 0.05
  };
  
  // Vérifier si c'est un contexte de studio
  if (detectStudioContext(content)) {
    flags.push('studio_context');
    console.log('🎵 Studio context detected in fallback moderation');
  }
  
  // Vérifier si c'est de l'équipement technique
  if (detectTechnicalEquipment(content)) {
    flags.push('technical_equipment');
    console.log('🔧 Technical equipment detected in fallback moderation');
  }
  
  // Mots-clés problématiques (seulement si ce n'est pas un studio)
  if (!flags.includes('studio_context') && !flags.includes('technical_equipment')) {
    const violenceKeywords = ['kill', 'murder', 'violence', 'weapon', 'gun', 'knife', 'blood', 'torture'];
    const hateKeywords = ['hate', 'racist', 'nazi', 'terrorist', 'supremacist', 'genocide'];
    const selfHarmKeywords = ['suicide', 'selfharm', 'cutting', 'harm yourself', 'kill yourself'];
    
    violenceKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        categories.violence = Math.max(categories.violence, 0.9);
        flags.push('violence_keywords');
      }
    });
    
    hateKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        categories.hate = Math.max(categories.hate, 0.95);
        flags.push('hate_speech');
      }
    });
    
    selfHarmKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        categories.selfHarm = Math.max(categories.selfHarm, 0.95);
        flags.push('selfharm_content');
      }
    });
  }
  
  // Ajouter un seul flag pour le contenu adulte
  flags.push('adult_content_platform');
  
  return evaluateModerationScores(categories, flags);
}

async function moderateWithAzure(config: any, type: string, content: string) {
  try {
    let azureUrl: string;
    let requestBody: any;
    let headers: any;
    
    if (type === 'image') {
      azureUrl = `${config.endpoint}/contentmoderator/moderate/v1.0/ProcessImage/Evaluate`;
      headers = {
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'application/json'
      };
      requestBody = {
        DataRepresentation: 'URL',
        Value: content
      };
    } else {
      azureUrl = `${config.endpoint}/contentmoderator/moderate/v1.0/ProcessText/Screen`;
      headers = {
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'text/plain'
      };
      requestBody = content;
    }
    
    console.log(`🔍 Calling Azure for ${type} moderation`);
    
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers,
      body: type === 'image' ? JSON.stringify(requestBody) : requestBody
    });
    
    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📊 Azure response:', result);
    
    // Vérifier si c'est un contexte de studio
    const isStudioContext = detectStudioContext(content);
    const isTechnicalEquipment = detectTechnicalEquipment(content);
    
    // Convertir la réponse Azure en format standardisé
    const categories = {
      adult: type === 'image' ? (result.IsImageAdultClassified ? 0.8 : 0.2) : 0.3,
      violence: type === 'image' ? (result.IsImageRacyClassified ? 0.6 : 0.1) : 0.1,
      hate: 0.1,
      selfHarm: 0.1
    };
    
    const flags: string[] = [];
    
    if (isStudioContext) {
      flags.push('studio_context');
      console.log('🎵 Studio context detected in Azure moderation');
    }
    
    if (isTechnicalEquipment) {
      flags.push('technical_equipment');
      console.log('🔧 Technical equipment detected in Azure moderation');
    }
    
    if (type === 'image' && result.IsImageAdultClassified) {
      flags.push('adult_content');
    }
    
    if (type === 'image' && result.IsImageRacyClassified) {
      flags.push('racy_content');
    }
    
    return evaluateModerationScores(categories, flags);
    
  } catch (error) {
    console.error('❌ Azure moderation failed:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  console.log('🛡️ Moderate content function called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Simple ping test for connectivity checks
    const url = new URL(req.url);
    if (url.searchParams.has('ping')) {
      return new Response(JSON.stringify({ status: 'ok', message: 'Moderation function is online' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    // Handle test requests
    if (requestData.test === true) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Moderation function is working correctly',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { type, url, content, config } = requestData;
    
    if (!type || (!url && !content)) {
      throw new Error('Type and content/url are required');
    }
    
    // Configuration Azure
    const azureConfig = {
      endpoint: config?.endpoint || Deno.env.get('AZURE_CONTENT_MODERATOR_ENDPOINT') || '',
      subscriptionKey: config?.subscriptionKey || Deno.env.get('AZURE_CONTENT_MODERATOR_KEY') || '',
      region: config?.region || Deno.env.get('AZURE_REGION') || 'francecentral'
    };
    
    console.log('🔧 Azure config check:', {
      hasEndpoint: !!azureConfig.endpoint,
      hasKey: !!azureConfig.subscriptionKey,
      region: azureConfig.region
    });
    
    let result;
    const contentToModerate = type === 'image' ? url : content;
    
    // Vérifier si c'est un contexte de studio
    const isStudioContext = detectStudioContext(contentToModerate);
    const isTechnicalEquipment = detectTechnicalEquipment(contentToModerate);
    console.log('🎵 Context detection:', { isStudioContext, isTechnicalEquipment });
    
    // Si c'est un studio de musique, approuver automatiquement
    if ((isStudioContext || isTechnicalEquipment) && type === 'image') {
      console.log('🎵 Studio/technical context detected! Approving automatically');
      result = {
        isApproved: true,
        confidence: 0.95,
        categories: {
          adult: 0.1,
          violence: 0.01,
          hate: 0.01,
          selfHarm: 0.01
        },
        flags: [
          isStudioContext ? 'studio_context' : null,
          isTechnicalEquipment ? 'technical_equipment' : null,
          'auto_approved'
        ].filter(Boolean) as string[],
        requiresHumanReview: false,
        reason: isStudioContext 
          ? 'Contenu approuvé automatiquement: Studio de musique détecté' 
          : 'Contenu approuvé automatiquement: Équipement technique détecté'
      };
    } else if (
      azureConfig.endpoint && 
      azureConfig.subscriptionKey && 
      azureConfig.endpoint !== 'your_azure_endpoint' && 
      azureConfig.subscriptionKey !== 'your_azure_subscription_key' &&
      azureConfig.endpoint.startsWith('https://')
    ) {
      try {
        result = await moderateWithAzure(azureConfig, type, contentToModerate);
        console.log('✅ Azure moderation successful');
      } catch (azureError) {
        console.warn('⚠️ Azure failed, using fallback:', azureError.message);
        result = fallbackModeration(contentToModerate, type);
      }
    } else {
      console.log('🔄 Using fallback moderation (Azure not properly configured)');
      result = fallbackModeration(contentToModerate, type);
    }
    
    return new Response(JSON.stringify({
      success: true,
      result,
      usedAzure: azureConfig.endpoint && azureConfig.subscriptionKey && 
                azureConfig.endpoint !== 'your_azure_endpoint' && 
                azureConfig.subscriptionKey !== 'your_azure_subscription_key'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ Error in moderate-content function:', error);
    
    // Toujours retourner un résultat de modération valide, même en cas d'erreur
    const fallbackResult = fallbackModeration('', 'text');
    
    return new Response(JSON.stringify({
      success: true,
      result: {
        ...fallbackResult,
        reason: `Fallback moderation used due to error: ${error.message}`
      },
      warning: `Fallback moderation used: ${error.message}`,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});