import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get available models from yunwu.ai
 */
async function getAvailableModels(apiKey: string): Promise<{
  success: boolean;
  models?: Array<{ id: string; name: string; owned_by?: string }>;
  error?: string;
}> {
  const newApiBaseUrl = Deno.env.get('NEW_API_BASE_URL') || 'https://yunwu.ai';

  try {
    const response = await fetch(`${newApiBaseUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const result = await response.json();
    console.log('Yunwu models response:', result);

    if (response.ok && result.data) {
      // Extract model IDs and names
      const models = result.data.map((model: { id: string; object?: string; owned_by?: string }) => ({
        id: model.id,
        name: model.id, // Use ID as name if no separate name field
        owned_by: model.owned_by || 'unknown',
      }));

      return { success: true, models };
    } else {
      return { success: false, error: result.error?.message || 'Failed to get models' };
    }
  } catch (error) {
    console.error('Error getting models:', error);
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
        JSON.stringify({ error: 'Missing token' }),
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

    // Decode JWT payload
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
      .select('yunwu_api_key')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.yunwu_api_key) {
      return new Response(
        JSON.stringify({
          success: true,
          hasToken: false,
          models: [],
          recommendedModels: ['gpt-3.5-turbo-1106'],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get available models
    const modelsResult = await getAvailableModels(profile.yunwu_api_key);

    // Define recommended models
    const recommendedModels = [
      'gpt-3.5-turbo-1106',
      'gpt-4',
      'gpt-4-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
    ];

    if (!modelsResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          hasToken: true,
          apiKey: profile.yunwu_api_key,
          models: [],
          recommendedModels,
          error: modelsResult.error,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hasToken: true,
        apiKey: profile.yunwu_api_key,
        models: modelsResult.models,
        recommendedModels,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in yunwu-models function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
