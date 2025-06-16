// Edge Function pour nettoyer les fichiers orphelins de Cloudflare R2
import { corsHeaders } from '../_shared/cors.ts';

interface CloudflareConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Cleanup R2 function called');

    // Vérifier les variables d'environnement
    const config: CloudflareConfig = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '',
      accessKeyId: Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || '',
      secretAccessKey: Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || '',
      bucketName: Deno.env.get('CLOUDFLARE_BUCKET_NAME') || '',
    };

    const missingVars = Object.entries(config).filter(([_, value]) => !value);
    
    if (missingVars.length > 0) {
      console.warn('⚠️ Missing environment variables for R2 cleanup');
      return new Response(
        JSON.stringify({
          cleaned: 0,
          errors: ['Missing Cloudflare R2 configuration'],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userPrefix, keepUrls } = await req.json();

    console.log('🧹 Cleanup parameters:', {
      userPrefix,
      keepUrlsCount: keepUrls?.length || 0,
    });

    // Pour l'instant, on simule le nettoyage
    // Dans un vrai environnement, vous utiliseriez l'API S3 compatible de Cloudflare R2
    console.log('✅ R2 cleanup simulated (R2 API integration needed)');

    return new Response(
      JSON.stringify({
        cleaned: 0,
        errors: [],
        message: 'R2 cleanup simulation completed',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in cleanup-r2 function:', error);
    
    return new Response(
      JSON.stringify({
        cleaned: 0,
        errors: [error.message],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});