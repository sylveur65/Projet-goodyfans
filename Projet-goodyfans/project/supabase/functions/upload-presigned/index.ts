// Edge Function pour générer des URLs présignées Cloudflare R2
import { corsHeaders } from '../_shared/cors.ts';

// Fonction pour créer une signature AWS v4
async function createSignature(stringToSign: string, secretKey: string, region: string, service: string, date: string) {
  const encoder = new TextEncoder();
  
  // Créer la clé de signature
  const kDate = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`AWS4${secretKey}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const dateKey = await crypto.subtle.sign('HMAC', kDate, encoder.encode(date));
  
  const kRegion = await crypto.subtle.importKey(
    'raw',
    dateKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const regionKey = await crypto.subtle.sign('HMAC', kRegion, encoder.encode(region));
  
  const kService = await crypto.subtle.importKey(
    'raw',
    regionKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const serviceKey = await crypto.subtle.sign('HMAC', kService, encoder.encode(service));
  
  const kSigning = await crypto.subtle.importKey(
    'raw',
    serviceKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signingKey = await crypto.subtle.sign('HMAC', kSigning, encoder.encode('aws4_request'));
  
  const finalKey = await crypto.subtle.importKey(
    'raw',
    signingKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', finalKey, encoder.encode(stringToSign));
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  console.log('🔗 Upload presigned function called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier les variables d'environnement
    const config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '',
      accessKeyId: Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || '',
      secretAccessKey: Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || '',
      bucketName: Deno.env.get('CLOUDFLARE_BUCKET_NAME') || '',
      publicUrl: Deno.env.get('CLOUDFLARE_PUBLIC_URL') || ''
    };

    console.log('🔧 Environment check:', {
      hasAccountId: !!config.accountId,
      hasAccessKey: !!config.accessKeyId,
      hasSecretKey: !!config.secretAccessKey,
      hasBucketName: !!config.bucketName,
      hasPublicUrl: !!config.publicUrl
    });

    // Vérifier si toutes les variables sont présentes
    const missingVars = {
      CLOUDFLARE_ACCOUNT_ID: !config.accountId,
      CLOUDFLARE_ACCESS_KEY_ID: !config.accessKeyId,
      CLOUDFLARE_SECRET_ACCESS_KEY: !config.secretAccessKey,
      CLOUDFLARE_BUCKET_NAME: !config.bucketName,
      CLOUDFLARE_PUBLIC_URL: !config.publicUrl
    };

    const hasMissingVars = Object.values(missingVars).some(missing => missing);

    if (hasMissingVars) {
      console.warn('⚠️ Missing environment variables:', missingVars);
      const missingList = Object.entries(missingVars)
        .filter(([_, missing]) => missing)
        .map(([varName]) => varName);

      return new Response(JSON.stringify({
        fallback: true,
        error: 'Missing Cloudflare R2 configuration',
        message: `Environment variables missing in Supabase Edge Functions: ${missingList.join(', ')}`,
        missingVars,
        instructions: {
          step1: 'Go to your Supabase project dashboard',
          step2: 'Navigate to Edge Functions > Environment Variables',
          step3: 'Add the missing variables with your Cloudflare R2 credentials (WITHOUT VITE_ prefix)',
          variables: missingList
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lire les données de la requête
    const requestBody = await req.json();
    const { filename, contentType } = requestBody;

    if (!filename || !contentType) {
      return new Response(JSON.stringify({
        fallback: true,
        error: 'Missing required parameters',
        message: 'Filename and contentType are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📝 Creating presigned URL for:', { filename, contentType });

    // Configuration pour R2
    const region = 'auto';
    const service = 's3';
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

    // Créer les paramètres de la requête
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
    const credential = `${config.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': timeStamp,
      'X-Amz-Expires': '3600',
      'X-Amz-SignedHeaders': 'host'
    });

    // Créer l'URL canonique
    const canonicalUri = `/${config.bucketName}/${filename}`;
    const canonicalQueryString = params.toString();
    const canonicalHeaders = `host:${config.accountId}.r2.cloudflarestorage.com\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    // Créer la requête canonique
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Hash de la requête canonique
    const encoder = new TextEncoder();
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Créer la chaîne à signer
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timeStamp,
      `${dateStamp}/${region}/${service}/aws4_request`,
      canonicalRequestHashHex
    ].join('\n');

    // Créer la signature
    const signature = await createSignature(stringToSign, config.secretAccessKey, region, service, dateStamp);

    // Ajouter la signature aux paramètres
    params.set('X-Amz-Signature', signature);

    // Construire l'URL finale
    const uploadUrl = `${endpoint}${canonicalUri}?${params.toString()}`;
    const publicUrl = `${config.publicUrl}/${filename}`;

    console.log('✅ Presigned URL created successfully');

    return new Response(JSON.stringify({
      uploadUrl,
      publicUrl,
      filename,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in upload-presigned function:', error);
    
    return new Response(JSON.stringify({
      fallback: true,
      error: error.message || 'Unknown error',
      message: 'Error generating presigned URL',
      details: {
        errorType: error.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});