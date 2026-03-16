import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Admin endpoint to create/test tokens
 * Uses service role key for authentication (passed in x-service-key header)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify service key from header or body
    const body = await req.json();
    const providedKey = req.headers.get('x-service-key') || body.service_key;

    // Simple verification - check if the provided key matches
    if (providedKey !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid service key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const action = body.action || 'test';
    const userId = body.user_id;
    const planId = body.plan_id || 'monthly';

    console.log('[token-admin] Action:', action, 'User:', userId, 'Plan:', planId);

    if (action === 'get_user_id') {
      // Get user ID from email
      const email = body.email;
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required for get_user_id action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        return new Response(
          JSON.stringify({ error: 'Failed to list users', details: listError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found', email }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ user_id: user.id, email: user.email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'test_token_create') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'user_id required for test_token_create action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('[token-admin] Profile not found:', profileError);
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

      console.log('[token-admin] Plan details:', {
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
        console.error('[token-admin] Error updating profile:', updateProfileError);
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
        console.error('[token-admin] Error updating quota:', quotaError);
      }

      // Create yunwu API token
      const newApiUser = Deno.env.get('NEW_API_USER');
      const newApiAuth = Deno.env.get('NEW_API_AUTHORIZATION');
      const newApiBaseUrl = Deno.env.get('NEW_API_BASE_URL') || 'https://yunwu.ai';

      let apiKey = null;
      let yunwuError = null;

      if (newApiUser && newApiAuth) {
        try {
          const expiredTime = Math.floor(subscriptionEndsAt.getTime() / 1000);
          const response = await fetch(`${newApiBaseUrl}/api/token/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'new-api-user': newApiUser,
              'Authorization': newApiAuth,
            },
            body: JSON.stringify({
              name: `clawx_${userId.substring(0, 8)}`,
              remain_quota: tokensQuota,
              expired_time: expiredTime,
              unlimited_quota: false,
              model_limits_enabled: false,
              model_limits: '',
              allow_ips: '',
              group: '',
              selected_groups: [],
              mj_image_mode: 'default',
              mj_custom_proxy: '',
            }),
          });

          const result = await response.json();
          console.log('[token-admin] Yunwu API response:', result);

          if (response.ok && result.success !== false) {
            apiKey = result.data?.key || result.key;

            // Save API key to user profile
            await supabase
              .from('user_profiles')
              .update({ yunwu_api_key: apiKey })
              .eq('id', userId);
          } else {
            yunwuError = result.message || 'Failed to create token';
          }
        } catch (e) {
          yunwuError = String(e);
          console.error('[token-admin] Yunwu API error:', e);
        }
      } else {
        yunwuError = 'Yunwu API credentials not configured';
      }

      return new Response(
        JSON.stringify({
          success: !yunwuError,
          message: yunwuError ? 'Partial success' : 'Token created successfully',
          apiKey,
          yunwuError,
          subscription: {
            tier: planId,
            endsAt: subscriptionEndsAt.toISOString(),
            tokensQuota,
          },
          profile: {
            id: profile.id,
            subscription_tier: planId,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use: get_user_id, test_token_create' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[token-admin] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
