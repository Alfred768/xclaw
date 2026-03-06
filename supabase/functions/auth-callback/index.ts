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

async function createOrGetUser(provider: string, providerId: string, info: any) {
  const field = provider === 'wechat' ? 'wechat_openid' : 'alipay_user_id';
  const { data: profile } = await supabase.from('user_profiles').select('id').eq(field, providerId).single();
  let userId = profile?.id;
  let email = profile ? null : `${provider}_${providerId}@clawx.temp`;

  if (!userId) {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { display_name: info.nickname, avatar_url: info.avatar || info.headimgurl }
    });
    if (error || !newUser.user) return null;
    userId = newUser.user.id;
    await supabase.from('user_profiles').update({ [field]: providerId }).eq('id', userId);
  }

  const { data: link } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: email || `${provider}_${providerId}@clawx.temp` });
  return { userId, sessionToken: link?.hashed_token };
}

serve(async (req) => {
  const url = new URL(req.url);

  // 暴露测试入口，方便你直接在浏览器验证页面是否正常
  if (url.searchParams.get('test_render') === 'success') return createSuccessRedirect();
  if (url.searchParams.get('test_render') === 'error') return createErrorRedirect('测试错误', '这是一个测试的错误页面');

  if (req.method !== 'GET') return createErrorRedirect('请求错误', '仅支持 GET 请求');

  const code = url.searchParams.get('auth_code') || url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return createErrorRedirect('参数错误', '缺少必要的授权参数，请重试');

  const decoded = decodeState(state);
  if (!decoded) return createErrorRedirect('状态无效', '授权状态验证失败，请重新登录');

  const { token: loginToken, provider } = decoded;

  const { data: session } = await supabase.from('auth_sessions').select('status').eq('login_token', loginToken).single();
  if (session?.status === 'completed') return createSuccessRedirect();

  // 尝试获取锁
  const { data: lock } = await supabase.from('auth_sessions').update({ processed_auth_code: code }).eq('login_token', loginToken).is('processed_auth_code', null).select();

  if (!lock?.length) {
    // 获取锁失败，可能是因为：
    // 1. 登录正在处理中
    // 2. 登录已经完成
    // 需要再次检查状态
    const { data: currentSession } = await supabase.from('auth_sessions')
      .select('status')
      .eq('login_token', loginToken)
      .single();

    if (currentSession?.status === 'completed') {
      return createSuccessRedirect();
    }

    return createErrorRedirect('重复请求', '该登录正在处理中，请稍后重试');
  }

  let userInfo = provider === 'alipay' ? await getAlipayUserInfo(code) : await getWechatUserInfo(code);
  if (!userInfo) return createErrorRedirect('授权失败', '无法从授权方获取用户信息');

  const providerUserId = userInfo.user_id || userInfo.openid || '';
  const result = await createOrGetUser(provider, providerUserId, userInfo);
  if (!result) return createErrorRedirect('系统错误', '用户同步失败');

  await supabase.from('auth_sessions').update({
    status: 'completed',
    supabase_user_id: result.userId,
    session_token: result.sessionToken,
    completed_at: new Date().toISOString()
  }).eq('login_token', loginToken);

  return createSuccessRedirect();
});