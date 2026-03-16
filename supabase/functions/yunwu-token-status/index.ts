import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YunwuTokenStatus {
  name: string;
  total_granted: number;
  total_used: number;
  total_available: number;
  unlimited_quota: boolean;
  model_limits: Record<string, boolean>;
  model_limits_enabled: boolean;
  expires_at: number;
  status: string;
}

/**
 * Query yunwu token usage status
 * Uses the user's yunwu_api_key as Bearer token
 * API: GET https://yunwu.ai/api/usage/token/
 */
async function getYunwuTokenUsage(tokenKey: string): Promise<{
  success: boolean;
  data?: YunwuTokenStatus;
  error?: string;
}> {
  const newApiBaseUrl = Deno.env.get('NEW_API_BASE_URL') || 'https://yunwu.ai';

  try {
    // Use the user's yunwu_api_key as Bearer token
    const response = await fetch(`${newApiBaseUrl}/api/usage/token/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenKey}`,
      },
    });

    const result = await response.json();
    console.log('[getYunwuTokenUsage] API response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success !== false) {
      return {
        success: true,
        data: result.data || result,
      };
    } else {
      return { success: false, error: result.message || 'Failed to get token usage' };
    }
  } catch (error) {
    console.error('[getYunwuTokenUsage] Error:', error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Get token from body (POST) or query param (GET)
    let token: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json();
      token = body.token;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    }

    // Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token. Provide in body.token, query param, or Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT payload (handle base64url)
    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4);
    const payload = JSON.parse(atob(paddedPayload));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = payload.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'No user ID in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's yunwu API key from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('yunwu_api_key, subscription_tier, subscription_ends_at')
      .eq('id', userId)
      .single();

    console.log('[yunwu-token-status] Query result:', {
      userId,
      profileError: profileError?.message,
      profileExists: !!profile,
      hasApiKey: !!profile?.yunwu_api_key,
      apiKeyPreview: profile?.yunwu_api_key?.substring(0, 10) + '...',
    });

    if (profileError || !profile) {
      console.error('[yunwu-token-status] Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no yunwu API key, return basic info
    if (!profile.yunwu_api_key) {
      console.log('[yunwu-token-status] No API key found for user:', userId);
      return new Response(
        JSON.stringify({
          success: true,
          hasToken: false,
          subscription: {
            tier: profile.subscription_tier,
            endsAt: profile.subscription_ends_at,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query yunwu token usage
    const tokenStatus = await getYunwuTokenUsage(profile.yunwu_api_key);

    if (!tokenStatus.success) {
      return new Response(
        JSON.stringify({
          success: true,
          hasToken: true,
          apiKey: profile.yunwu_api_key,
          error: tokenStatus.error,
          subscription: {
            tier: profile.subscription_tier,
            endsAt: profile.subscription_ends_at,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hasToken: true,
        apiKey: profile.yunwu_api_key,
        token: tokenStatus.data,
        subscription: {
          tier: profile.subscription_tier,
          endsAt: profile.subscription_ends_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in yunwu-token-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
