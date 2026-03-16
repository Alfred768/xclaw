/**
 * Get Session Edge Function
 * Returns session token and user info after successful authentication
 * Generates a fresh session token each time
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[get-session] Processing request for token:', token?.substring(0, 12) + '...');

  try {
    // Get auth session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('login_token', token)
      .single();

    if (sessionError || !session) {
      console.error('[get-session] Session not found:', sessionError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[get-session] Found session:', {
      status: session.status,
      userId: session.supabase_user_id,
    });

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('auth_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id);

      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return new Response(
        JSON.stringify({
          status: session.status,
          message: 'Authentication not completed yet',
        }),
        {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the user's email from auth.users
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(
      session.supabase_user_id
    );

    if (userError || !authUser?.user) {
      console.error('[get-session] Failed to get user:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = authUser.user.email;
    console.log('[get-session] User email:', userEmail);

    // Generate a fresh magic link token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail!,
    });

    if (linkError || !linkData) {
      console.error('[get-session] Failed to generate link:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the hashed token from properties
    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      console.error('[get-session] No hashed_token in generateLink response');
      return new Response(JSON.stringify({ error: 'Failed to get session token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[get-session] Generated fresh hashed token');

    // Call verify endpoint to get a real session
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=magiclink`;
    console.log('[get-session] Calling verify endpoint...');

    const verifyResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      },
      redirect: 'manual',
    });

    console.log('[get-session] Verify response status:', verifyResponse.status);

    // Check for redirect with session in URL
    const redirectLocation = verifyResponse.headers.get('location');
    if (redirectLocation) {
      try {
        const redirectUrl = new URL(redirectLocation);
        const fragment = redirectUrl.hash.substring(1);
        const params = new URLSearchParams(fragment);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = params.get('expires_in');

        if (accessToken) {
          console.log('[get-session] Got fresh access token from redirect!');

          // Get user profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.supabase_user_id)
            .single();

          // Delete the auth session (one-time use)
          await supabase.from('auth_sessions').delete().eq('id', session.id);

          return new Response(
            JSON.stringify({
              sessionToken: accessToken,
              refreshToken: refreshToken,
              expiresIn: expiresIn,
              user: {
                id: session.supabase_user_id,
                email: userEmail,
                display_name: session.user_info?.nickname || profile?.display_name || 'User',
                avatar_url: session.user_info?.avatar || profile?.avatar_url,
                subscription_tier: profile?.subscription_tier || 'free',
                is_trial: profile?.is_trial ?? true,
                trial_ends_at: profile?.trial_ends_at || null,
                alipay_user_id: profile?.alipay_user_id || null,
                wechat_openid: profile?.wechat_openid || null,
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (e) {
        console.error('[get-session] Error parsing redirect URL:', e);
      }
    }

    // If redirect didn't work, try POST
    console.log('[get-session] Trying POST verify...');
    const postVerifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      },
      body: JSON.stringify({
        token: hashedToken,
        type: 'magiclink',
      }),
    });

    const verifyData = await postVerifyResponse.json();
    console.log('[get-session] POST verify response status:', postVerifyResponse.status);

    if (verifyData.access_token) {
      console.log('[get-session] Got access token from POST!');

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.supabase_user_id)
        .single();

      // Delete the auth session (one-time use)
      await supabase.from('auth_sessions').delete().eq('id', session.id);

      return new Response(
        JSON.stringify({
          sessionToken: verifyData.access_token,
          refreshToken: verifyData.refresh_token,
          expiresIn: verifyData.expires_in,
          user: {
            id: session.supabase_user_id,
            email: userEmail,
            display_name: session.user_info?.nickname || profile?.display_name || 'User',
            avatar_url: session.user_info?.avatar || profile?.avatar_url,
            subscription_tier: profile?.subscription_tier || 'free',
            is_trial: profile?.is_trial ?? true,
            trial_ends_at: profile?.trial_ends_at || null,
            alipay_user_id: profile?.alipay_user_id || null,
            wechat_openid: profile?.wechat_openid || null,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('[get-session] Failed to get session from verify endpoint');
    return new Response(JSON.stringify({
      error: 'Failed to create session',
      message: 'Please try logging in again'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-session] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
