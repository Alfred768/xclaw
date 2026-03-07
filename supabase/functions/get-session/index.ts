/**
 * Get Session Edge Function
 * Returns session token and user info after successful authentication
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

  try {
    // Get auth session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('login_token', token)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.supabase_user_id)
      .single();

    // Delete the auth session (one-time use)
    await supabase.from('auth_sessions').delete().eq('id', session.id);

    return new Response(
      JSON.stringify({
        sessionToken: session.session_token,
        user: {
          id: session.supabase_user_id,
          display_name: session.user_info?.nickname || profile?.display_name,
          avatar_url: session.user_info?.avatar || profile?.avatar_url,
          subscription_tier: profile?.subscription_tier || 'free',
          // Include binding information from profile
          alipay_user_id: profile?.alipay_user_id || null,
          wechat_openid: profile?.wechat_openid || null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get session error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
