/**
 * Auth Init Edge Function
 * Initializes an auth session and returns OAuth URL for WeChat/Alipay
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OAuth Configuration
const WECHAT_APP_ID = Deno.env.get('WECHAT_APP_ID');
const WECHAT_APP_SECRET = Deno.env.get('WECHAT_APP_SECRET');
const ALIPAY_APP_ID = Deno.env.get('ALIPAY_APP_ID');
const ALIPAY_PRIVATE_KEY = Deno.env.get('ALIPAY_PRIVATE_KEY');

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Generate WeChat OAuth URL
function getWechatOAuthUrl(loginToken: string, redirectUri: string): string {
  if (!WECHAT_APP_ID) {
    throw new Error('WeChat App ID not configured');
  }

  const state = btoa(JSON.stringify({ token: loginToken, provider: 'wechat' }));
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  return `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
}

// Generate Alipay OAuth URL
function getAlipayOAuthUrl(loginToken: string, redirectUri: string): string {
  if (!ALIPAY_APP_ID) {
    throw new Error('Alipay App ID not configured');
  }

  const state = btoa(JSON.stringify({ token: loginToken, provider: 'alipay' }));
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${ALIPAY_APP_ID}&scope=auth_user&redirect_uri=${encodedRedirectUri}&state=${state}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { provider, userId } = body;

    if (!provider || !['wechat', 'alipay'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if provider is configured
    if (provider === 'wechat' && (!WECHAT_APP_ID || !WECHAT_APP_SECRET)) {
      return new Response(JSON.stringify({ error: 'WeChat login not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'alipay' && (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY)) {
      return new Response(JSON.stringify({ error: 'Alipay login not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique login token
    const loginToken = generateToken();

    // Session expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Create auth session record (store userId for binding provider to existing account)
    const { error: insertError } = await supabase
      .from('auth_sessions')
      .insert({
        login_token: loginToken,
        provider,
        status: 'pending',
        expires_at: expiresAt,
        supabase_user_id: userId || null,
      });

    if (insertError) {
      console.error('Error creating auth session:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create auth session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate OAuth URL
    const callbackUrl = `${supabaseUrl}/functions/v1/auth-callback`;

    let oauthUrl: string;
    if (provider === 'wechat') {
      oauthUrl = getWechatOAuthUrl(loginToken, callbackUrl);
    } else {
      oauthUrl = getAlipayOAuthUrl(loginToken, callbackUrl);
    }

    return new Response(JSON.stringify({
      loginToken,
      oauthUrl,
      expiresIn: 300, // 5 minutes in seconds
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth init error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
