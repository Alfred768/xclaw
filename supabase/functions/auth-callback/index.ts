import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// 静态页面托管在 Vercel
const STATIC_PAGE_URL = 'https://clawx-static.vercel.app/auth-result.html';

// ==========================================
// 🚀 核心响应函数：重定向到外部静态页面
// ==========================================
function createHtmlResponse(html: string, status = 200): Response {
  // 不再使用，保留兼容性
  return new Response('Redirecting...', { status: 302, headers: { 'Location': STATIC_PAGE_URL } });
}

// 创建成功页面重定向
function createSuccessRedirect(): Response {
  const url = `${STATIC_PAGE_URL}?type=success`;
  return Response.redirect(url, 302);
}

// 创建错误页面重定向
function createErrorRedirect(title: string, message: string): Response {
  const url = `${STATIC_PAGE_URL}?type=error&title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`;
  return Response.redirect(url, 302);
}

// ==========================================
// 业务逻辑区（与你最初的设计保持一致）
// ==========================================
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WECHAT_APP_ID = Deno.env.get('WECHAT_APP_ID');
const WECHAT_APP_SECRET = Deno.env.get('WECHAT_APP_SECRET');
const ALIPAY_APP_ID = Deno.env.get('ALIPAY_APP_ID');
const ALIPAY_PRIVATE_KEY = Deno.env.get('ALIPAY_PRIVATE_KEY');

function decodeState(state: string) {
  try { return JSON.parse(atob(state)); } catch { return null; }
}

async function rsa2Sign(params: Record<string, string>, privateKeyPem: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.filter(key => params[key] !== '' && params[key] !== undefined).map(key => `${key}=${params[key]}`).join('&');
  const privateKey = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/-----BEGIN RSA PRIVATE KEY-----/g, '').replace(/-----END RSA PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function getAlipayUserInfo(code: string) {
  if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY) return null;
  try {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const params: Record<string, string> = {
      app_id: ALIPAY_APP_ID, method: 'alipay.system.oauth.token', charset: 'utf-8', sign_type: 'RSA2', timestamp: timestamp, version: '1.0', grant_type: 'authorization_code', code,
    };
    params.sign = await rsa2Sign(params, ALIPAY_PRIVATE_KEY);
    const resp = await fetch(`https://openapi.alipay.com/gateway.do?${new URLSearchParams(params)}`);
    const data = await resp.json();
    const result = data.alipay_system_oauth_token_response;
    return result ? { user_id: result.open_id || result.user_id, nickname: '支付宝用户', avatar: '' } : null;
  } catch { return null; }
}

async function getWechatUserInfo(code: string) {
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) return null;
  try {
    const tokenResp = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`);
    const tokenData = await tokenResp.json();
    if (tokenData.errcode) return null;
    const userResp = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`);
    const userData = await userResp.json();
    return userData.errcode ? null : { openid: userData.openid, nickname: userData.nickname, headimgurl: userData.headimgurl };
  } catch { return null; }
}

async function createOrGetUser(provider: string, providerId: string, info: any, supabaseUserId?: string) {
  const field = provider === 'wechat' ? 'wechat_openid' : 'alipay_user_id';

  // 1. Check if this provider is already bound to any user
  const { data: existingProfile } = await supabase.from('user_profiles').select('id, display_name').eq(field, providerId).single();

  if (existingProfile) {
    // Provider is already bound to a user
    console.log('[createOrGetUser] Provider already bound to user:', existingProfile.id, 'current user:', supabaseUserId || 'not logged in');

    // If user is trying to BIND (supabaseUserId provided), check for conflict
    if (supabaseUserId && existingProfile.id !== supabaseUserId) {
      // Logged-in user trying to bind a provider that's already bound to a different user
      console.log('[createOrGetUser] Binding conflict: provider bound to different user');
      return null;
    }

    // ✅ Verify the profile is complete (has display_name)
    // If profile is incomplete, update it
    if (!existingProfile.display_name) {
      console.log('[createOrGetUser] Profile incomplete, updating...');
      await supabase.from('user_profiles')
        .update({
          display_name: info.nickname || '支付宝用户',
          avatar_url: info.avatar || info.headimgurl || ''
        })
        .eq('id', existingProfile.id);
    }

    // Provider is bound to this user (or user is just logging in, not binding)
    // Return the existing user - allow login
    console.log('[createOrGetUser] Returning existing user:', existingProfile.id);
    return { userId: existingProfile.id };
  }

  // 2. If user is already logged in, bind provider to their existing account
  if (supabaseUserId) {
    console.log('[createOrGetUser] Binding provider to existing user:', supabaseUserId);
    await supabase.from('user_profiles').update({ [field]: providerId }).eq('id', supabaseUserId);
    return { userId: supabaseUserId };
  }

  // 3. New user: create account and bind provider
  console.log('[createOrGetUser] Creating new user for provider:', provider);
  const email = `${provider}_${providerId}@clawx.temp`;
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { display_name: info.nickname, avatar_url: info.avatar || info.headimgurl }
  });
  if (error || !newUser.user) {
    console.error('[createOrGetUser] Failed to create user:', error);
    return null;
  }
  const userId = newUser.user.id;

  // 显式创建 profile（不依赖触发器），同时绑定 provider ID
  // 直接在 INSERT 时设置 provider ID，避免竞态条件
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: userId,
    display_name: info.nickname || '支付宝用户',
    avatar_url: info.avatar || info.headimgurl || '',
    subscription_tier: 'free',
    [field]: providerId  // 直接在 INSERT 时绑定 provider ID
  });
  if (profileError) {
    console.error('Profile creation error:', profileError);
  }

  const { data: link } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  console.log('[createOrGetUser] New user created:', userId);
  return { userId, sessionToken: link?.hashed_token };
}

serve(async (req) => {
  const url = new URL(req.url);

  // 暴露测试入口，方便你直接在浏览器验证页面是否正常
  if (url.searchParams.get('test_render') === 'success') return createSuccessRedirect();
  if (url.searchParams.get('test_render') === 'error') return createErrorRedirect('测试错误', '这是一个测试的错误页面');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'GET') return createErrorRedirect('请求错误', '仅支持 GET 请求');

  const code = url.searchParams.get('auth_code') || url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return createErrorRedirect('参数错误', '缺少必要的授权参数，请重试');

  const decoded = decodeState(state);
  if (!decoded) return createErrorRedirect('状态无效', '授权状态验证失败，请重新登录');

  const { token: loginToken, provider } = decoded;

  console.log('[auth-callback] Processing callback for loginToken:', loginToken, 'provider:', provider);

  const { data: session } = await supabase.from('auth_sessions').select('status').eq('login_token', loginToken).single();
  if (session?.status === 'completed') return createSuccessRedirect();

  // 尝试获取锁
  const { data: lock, error: lockError } = await supabase.from('auth_sessions').update({ processed_auth_code: code }).eq('login_token', loginToken).is('processed_auth_code', null).select();

  if (lockError) {
    console.error('[auth-callback] Lock acquisition error:', lockError);
  }

  if (!lock?.length) {
    // 获取锁失败，检查状态
    const { data: currentSession } = await supabase.from('auth_sessions')
      .select('status, processed_auth_code')
      .eq('login_token', loginToken)
      .single();

    console.log('[auth-callback] Lock acquisition failed, current session status:', currentSession?.status);

    // 如果已经是终态，直接返回结果
    if (currentSession?.status === 'completed') {
      return createSuccessRedirect();
    }
    if (currentSession?.status === 'error') {
      return createErrorRedirect('登录失败', '登录过程中发生错误，请重试');
    }

    // status 是 pending，说明第一次回调正在处理中
    // 轮询等待第一次回调完成（最多等待 10 秒）
    console.log('[auth-callback] First callback still processing, waiting...');

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms

      const { data: pollSession } = await supabase.from('auth_sessions')
        .select('status')
        .eq('login_token', loginToken)
        .single();

      console.log('[auth-callback] Poll attempt', i + 1, 'status:', pollSession?.status);

      if (pollSession?.status === 'completed') {
        console.log('[auth-callback] First callback completed, returning success');
        return createSuccessRedirect();
      }
      if (pollSession?.status === 'error') {
        console.log('[auth-callback] First callback failed, returning error');
        return createErrorRedirect('登录失败', '登录过程中发生错误，请重试');
      }
    }

    // 超时，返回处理中提示
    console.log('[auth-callback] Timeout waiting for first callback');
    return createErrorRedirect('处理中', '登录正在处理中，请返回应用查看结果');
  }

  console.log('[auth-callback] Lock acquired successfully for loginToken:', loginToken);

  let userInfo = provider === 'alipay' ? await getAlipayUserInfo(code) : await getWechatUserInfo(code);
  console.log('[auth-callback] User info retrieved:', userInfo ? 'success' : 'failed');

  if (!userInfo) {
    // 更新状态为 error，包含错误信息
    const { error: updateError } = await supabase.from('auth_sessions')
      .update({
        status: 'error',
        user_info: { error: '无法从授权方获取用户信息' }
      })
      .eq('login_token', loginToken);
    if (updateError) {
      console.error('[auth-callback] Failed to update status to error:', updateError);
    }
    return createErrorRedirect('授权失败', '无法从授权方获取用户信息');
  }

  // Get the supabase_user_id from auth_sessions (for binding to existing account)
  const { data: sessionData } = await supabase.from('auth_sessions').select('supabase_user_id').eq('login_token', loginToken).single();
  const supabaseUserId = sessionData?.supabase_user_id || undefined;

  const providerUserId = userInfo.user_id || userInfo.openid || '';
  const result = await createOrGetUser(provider, providerUserId, userInfo, supabaseUserId);
  console.log('[auth-callback] User created/found:', result ? 'success' : 'failed');

  if (!result) {
    // 更新状态为 error，包含用户信息和错误原因
    const { error: updateError } = await supabase.from('auth_sessions')
      .update({
        status: 'error',
        user_info: {
          ...userInfo,
          error: '该账号已被其他用户绑定'
        }
      })
      .eq('login_token', loginToken);
    if (updateError) {
      console.error('[auth-callback] Failed to update status to error:', updateError);
    }
    return createErrorRedirect('绑定失败', '该账号已被其他用户绑定');
  }

  // Build update object - only include session_token for new users (not for binding)
  const updateData: Record<string, any> = {
    status: 'completed',
    supabase_user_id: result.userId,
    completed_at: new Date().toISOString()
  };
  if (result.sessionToken) {
    updateData.session_token = result.sessionToken;
  }

  await supabase.from('auth_sessions').update(updateData).eq('login_token', loginToken);
  console.log('[auth-callback] Session status updated to completed for user:', result.userId);

  return createSuccessRedirect();
});