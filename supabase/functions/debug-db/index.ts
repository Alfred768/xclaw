import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query all users with their yunwu_api_key status
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, yunwu_api_key, subscription_tier, subscription_ends_at')
      .limit(10);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mask API keys for security
    const maskedProfiles = profiles?.map(p => ({
      id: p.id,
      has_api_key: !!p.yunwu_api_key,
      api_key_preview: p.yunwu_api_key ? p.yunwu_api_key.substring(0, 15) + '...' : null,
      subscription_tier: p.subscription_tier,
      subscription_ends_at: p.subscription_ends_at,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        count: maskedProfiles?.length || 0,
        profiles: maskedProfiles,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
