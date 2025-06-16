// Edge Function pour supprimer des fichiers de Cloudflare R2
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
    console.log('🗑️ Delete file function called');

    // Vérifier les variables d'environnement
    const config: CloudflareConfig = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '',
      accessKeyId: Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || '',
      secretAccessKey: Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || '',
      bucketName: Deno.env.get('CLOUDFLARE_BUCKET_NAME') || '',
    };

    const missingVars = Object.entries(config).filter(([_, value]) => !value);
    
    if (missingVars.length > 0) {
      console.warn('⚠️ Missing environment variables for R2 deletion');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Cloudflare R2 configuration',
          missingVars: missingVars.map(([key]) => key),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { filename } = await req.json();

    if (!filename) {
      throw new Error('Filename is required');
    }

    console.log('🗑️ Deleting file:', filename);

    // Pour l'instant, on simule la suppression
    // Dans un vrai environnement, vous utiliseriez l'API S3 compatible de Cloudflare R2
    console.log('✅ File deletion simulated (R2 API integration needed)');

    return new Response(
      JSON.stringify({
        success: true,
        message: `File ${filename} deletion requested`,
        filename,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in delete-file function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});