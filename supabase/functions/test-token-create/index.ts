import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create API token on yunwu.ai
 */
async function createYunwuToken(
  userId: string,
  remainQuota: number,
  expiredTime: number
): Promise<{ success: boolean; key?: string; error?: string; data?: unknown }> {
  const newApiUser = Deno.env.get('NEW_API_USER');
  const newApiAuth = Deno.env.get('NEW_API_AUTHORIZATION');
  const newApiBaseUrl = Deno.env.get('NEW_API_BASE_URL') || 'https://yunwu.ai';

  if (!newApiUser || !newApiAuth) {
    console.error('Yunwu API credentials not configured');
    return { success: false, error: 'API credentials not configured' };
  }

  try {
    const response = await fetch(`${newApiBaseUrl}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'new-api-user': newApiUser,
        'Authorization': newApiAuth,
      },
      body: JSON.stringify({
        name: `clawx_${userId.substring(0, 8)}`,
        remain_quota: remainQuota,
        expired_time: expiredTime,
        unlimited_quota: false,
        model_limits_enabled: false,
        model_limits: '',
        allow_ips: '',
        group: '企业级高可用大模型',
        selected_groups: ['企业级高可用大模型'],
        mj_image_mode: '企业级高可用大模型',
        mj_custom_proxy: '',
      }),
    });

    const result = await response.json();
    console.log('[createYunwuToken] Yunwu API response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success !== false) {
      // Yunwu API returns: { data: 'sk-xxx', success: true } or { data: { key: 'sk-xxx' } }
      const apiKey = result.data?.key || result.key || result.data;
      console.log('[createYunwuToken] Extracted API key:', apiKey ? apiKey.substring(0, 15) + '...' : 'undefined');
      return { success: true, key: apiKey, data: result };
    } else {
      return { success: false, error: result.message || 'Failed to create token', data: result };
    }
  } catch (error) {
    console.error('Error creating yunwu token:', error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

    // Parse request body first
    const body = await req.json();

    // Get token from body (preferred) or header (fallback)
    let token = body.token;
    const authHeader = req.headers.get('authorization');

    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token. Provide in body.token or Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[test-token-create] Received token preview:', token?.substring(0, 30) + '...');
    console.log('[test-token-create] Token length:', token?.length);

    // Validate JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[test-token-create] Invalid token format, parts:', parts.length);
      return new Response(
        JSON.stringify({ error: 'Invalid token format', partsCount: parts.length }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload;
    try {
      // JWT uses base64url encoding, need to convert to base64 first
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const paddedPayload = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4);
      payload = JSON.parse(atob(paddedPayload));
      console.log('[test-token-create] JWT payload:', {
        sub: payload.sub,
        exp: payload.exp,
        expDate: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        now: new Date().toISOString(),
        aud: payload.aud,
        role: payload.role,
      });
    } catch (e) {
      console.error('[test-token-create] Failed to decode JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Failed to decode JWT', details: String(e) }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.error('[test-token-create] Token expired at:', new Date(payload.exp * 1000).toISOString());
      return new Response(
        JSON.stringify({
          error: 'Token expired',
          expiredAt: new Date(payload.exp * 1000).toISOString(),
          now: new Date().toISOString(),
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = payload.sub;
    if (!userId) {
      console.error('[test-token-create] No user ID in token payload');
      return new Response(
        JSON.stringify({ error: 'No user ID in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan_id from body (already parsed above)
    const planId = body.plan_id || 'monthly'; // Default to monthly

    console.log('Test token create request:', { userId, planId });

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate duration based on plan
    const durationMonths = planId === 'yearly' ? 12 : 1;
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + durationMonths);

    // Token quota based on plan
    const tokensQuota = planId === 'yearly' ? 100000000 : 1000000; // 100M or 1M

    console.log('Plan details:', {
      planId,
      durationMonths,
      tokensQuota,
      subscriptionEndsAt: subscriptionEndsAt.toISOString(),
    });

    // Update user profile subscription
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: planId,
        is_trial: false,
        trial_ends_at: null,
        subscription_ends_at: subscriptionEndsAt.toISOString(),
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateProfileError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update usage quota
    const { error: quotaError } = await supabase
      .from('usage_quotas')
      .upsert({
        user_id: userId,
        total_tokens_quota: tokensQuota,
        tokens_used: 0,
        billing_cycle_start: new Date().toISOString(),
        billing_cycle_end: subscriptionEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (quotaError) {
      console.error('Error updating quota:', quotaError);
    }

    // Create yunwu API token for the user
    const expiredTime = Math.floor(subscriptionEndsAt.getTime() / 1000); // Convert to Unix timestamp

    console.log('Creating yunwu token...');
    const tokenResult = await createYunwuToken(userId, tokensQuota, expiredTime);

    if (tokenResult.success) {
      console.log('Yunwu token created successfully:', tokenResult.key);

      // Save the API key to user profile
      console.log('[test-token-create] Saving API key to user profile:', {
        userId,
        apiKeyPreview: tokenResult.key?.substring(0, 10) + '...',
      });

      const { data: updateResult, error: keyError } = await supabase
        .from('user_profiles')
        .update({
          yunwu_api_key: tokenResult.key,
        })
        .eq('id', userId)
        .select('id, yunwu_api_key');

      console.log('[test-token-create] Update result:', {
        success: !keyError,
        error: keyError?.message,
        updatedRows: updateResult?.length,
        updatedData: updateResult?.[0] ? {
          id: updateResult[0].id,
          apiKeyPreview: updateResult[0].yunwu_api_key?.substring(0, 10) + '...',
        } : null,
      });

      if (keyError) {
        console.error('Error saving yunwu API key:', keyError);
      }

      // Return success with token info
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Token created successfully (TEST MODE)',
          apiKey: tokenResult.key,
          subscription: {
            tier: planId,
            endsAt: subscriptionEndsAt.toISOString(),
            tokensQuota,
          },
          tokenData: tokenResult.data,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Failed to create yunwu token:', tokenResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create yunwu token',
          details: tokenResult.error,
          apiResponse: tokenResult.data,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in test-token-create function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
