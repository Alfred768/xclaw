@ -0,0 +1,597 @@
# 支付宝/微信登录流程完整文档

本文档详细记录了 ClawX 应用的第三方登录（支付宝/微信）与 Supabase 的完整交互流程。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端 (React)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  AuthContent.tsx          auth.ts (Zustand)           supabase.ts           │
│  (登录 UI 组件)            (状态管理)                  (Supabase 客户端)      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Supabase Edge Functions                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth-init        →        auth-callback        →        get-session        │
│  (初始化会话)              (OAuth 回调处理)               (获取会话信息)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Supabase 数据库                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth_sessions (登录会话表)          user_profiles (用户信息表)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 一、数据库表结构

### 1.1 `auth_sessions` 登录会话表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | uuid | 主键 |
| `login_token` | string | 登录令牌 (64位随机十六进制) |
| `provider` | string | 提供商: `wechat` / `alipay` |
| `status` | string | 状态: `pending` / `completed` / `expired` / `error` |
| `provider_user_id` | string | 第三方用户ID (支付宝 open_id / 微信 openid) |
| `user_info` | jsonb | 第三方用户信息 `{ nickname, avatar }` |
| `supabase_user_id` | uuid | Supabase 用户ID |
| `session_token` | string | Supabase 会话令牌 |
| `processed_auth_code` | string | 已处理的授权码 (用于防重放) |
| `created_at` | timestamp | 创建时间 |
| `expires_at` | timestamp | 过期时间 (5分钟后) |
| `completed_at` | timestamp | 完成时间 |

### 1.2 `user_profiles` 用户信息表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | uuid | 主键 (与 auth.users 关联) |
| `display_name` | string | 显示名称 |
| `avatar_url` | string | 头像 URL |
| `subscription_tier` | string | 订阅等级: `free` / `pro` / `enterprise` |
| `alipay_user_id` | string | 支付宝用户ID (open_id) |
| `wechat_openid` | string | 微信 openid |
| `email` | string | 邮箱 |

---

## 二、完整登录流程

### 流程图

```
用户点击登录
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: 初始化 (auth-init)                                 │
│ ─────────────────────────────────────────────────────────── │
│ 1. 前端调用 initAuthFlow(provider)                          │
│ 2. POST /api/auth-init { provider, userId? }                │
│ 3. 后端生成 loginToken (64位随机)                           │
│ 4. 创建 auth_sessions 记录 (status: pending)                │
│ 5. 生成 OAuth URL (包含 state 参数)                         │
│ 6. 返回 { loginToken, oauthUrl }                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: 用户扫码授权                                        │
│ ─────────────────────────────────────────────────────────── │
│ 1. 前端显示 OAuth URL 的二维码                               │
│ 2. 用户使用支付宝/微信扫码                                   │
│ 3. 用户在第三方应用中确认授权                                │
│ 4. 第三方重定向到 auth-callback                             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: 回调处理 (auth-callback)                           │
│ ─────────────────────────────────────────────────────────── │
│ 1. GET /auth-callback?auth_code=xxx&state=xxx               │
│ 2. 解码 state 获取 loginToken 和 provider                   │
│ 3. 使用 processed_auth_code 实现乐观锁防重放                 │
│ 4. 用 auth_code 换取用户信息                                │
│ 5. 创建或查找用户 (createOrGetUser)                         │
│ 6. 更新 auth_sessions (status: completed)                   │
│ 7. 重定向到静态成功页面                                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: 状态监听 (Realtime + Polling)                      │
│ ─────────────────────────────────────────────────────────── │
│ 1. 前端订阅 auth_sessions 表变更 (Realtime)                 │
│ 2. 同时启动轮询作为备份 (1秒间隔)                           │
│ 3. 检测到 status 变为 completed                             │
│ 4. 触发 onComplete 回调                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: 获取会话 (get-session)                             │
│ ─────────────────────────────────────────────────────────── │
│ 1. 前端调用 completeAuthFlow()                              │
│ 2. GET /api/get-session?token=xxx                           │
│ 3. 验证 session 状态                                        │
│ 4. 查询 user_profiles 获取完整用户信息                      │
│ 5. 删除 auth_sessions 记录 (一次性使用)                     │
│ 6. 返回 { sessionToken, user }                              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
用户登录完成
```

---

## 三、详细交互数据

### 3.1 Phase 1: 初始化

**前端调用:**
```typescript
// AuthContent.tsx
await initAuthFlow(provider);  // provider = 'alipay' | 'wechat'

// auth.ts (Zustand Store)
const result = await initAuthSession(provider);
// 返回 { loginToken, oauthUrl }
```

**请求:**
```http
POST /api/auth-init
Content-Type: application/json

{
  "provider": "alipay",
  "userId": null  // 可选，绑定已有账户时传入
}
```

**后端处理 (auth-init/index.ts):**
```typescript
// 1. 生成 64 位随机 token
const loginToken = generateToken();  // 32 字节 = 64 个十六进制字符

// 2. 计算过期时间 (5分钟)
const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

// 3. 插入 auth_sessions 记录
await supabase.from('auth_sessions').insert({
  login_token: loginToken,
  provider: 'alipay',
  status: 'pending',
  expires_at: expiresAt,
  supabase_user_id: userId || null,  // 绑定已有账户时使用
});

// 4. 生成 OAuth URL
// 支付宝: https://openauth.alipay.com/oauth2/publicAppAuthorize.htm
//         ?app_id=xxx&scope=auth_user&redirect_uri=xxx&state=xxx
// 微信:   https://open.weixin.qq.com/connect/qrconnect
//         ?appid=xxx&redirect_uri=xxx&response_type=code&scope=snsapi_login&state=xxx

// state = base64(JSON.stringify({ token: loginToken, provider: 'alipay' }))
```

**响应:**
```json
{
  "loginToken": "a1b2c3d4e5f6...（64位）",
  "oauthUrl": "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?...",
  "expiresIn": 300
}
```

**前端状态更新:**
```typescript
// auth.ts
set({
  loginToken: result.loginToken,
  oauthUrl: result.oauthUrl,
  authProvider: provider,
  authStatus: 'pending',
  isLoading: false,
});
```

---

### 3.2 Phase 2: 用户扫码授权

**前端显示:**
```typescript
// AuthContent.tsx
<QRCodeSVG value={oauthUrl} size={200} level="H" />
```

**用户操作:**
1. 使用支付宝 App 扫描二维码
2. 在支付宝中确认授权
3. 支付宝重定向到回调 URL

---

### 3.3 Phase 3: 回调处理

**第三方重定向:**
```http
GET https://xxx.supabase.co/functions/v1/auth-callback
    ?auth_code=xxx
    &state=eyJ0b2tlbiI6ImExYjJjM2Q0Li4uIiwicHJvdmlkZXIiOiJhbGlwYXkifQ==
```

**后端处理 (auth-callback/index.ts):**

```typescript
// 1. 解码 state
const decoded = JSON.parse(atob(state));
// decoded = { token: loginToken, provider: 'alipay' }

// 2. 检查是否已完成
const { data: session } = await supabase
  .from('auth_sessions')
  .select('status')
  .eq('login_token', loginToken)
  .single();
if (session?.status === 'completed') return createSuccessRedirect();

// 3. 乐观锁防重放 (使用 processed_auth_code)
const { data: lock } = await supabase
  .from('auth_sessions')
  .update({ processed_auth_code: code })
  .eq('login_token', loginToken)
  .is('processed_auth_code', null)  // 只有没有处理过的才能更新
  .select();

if (!lock?.length) {
  // 锁获取失败，轮询等待第一次回调完成
  // 最多等待 10 秒 (20 次 × 500ms)
}

// 4. 用 auth_code 换取用户信息 (支付宝)
const userInfo = await getAlipayUserInfo(code);
// 调用 alipay.system.oauth.token API
// 返回 { user_id: open_id, nickname: '支付宝用户', avatar: '' }

// 5. 创建或获取用户
const result = await createOrGetUser('alipay', open_id, userInfo, supabaseUserId);
```

**createOrGetUser 逻辑:**
```typescript
// 情况 1: provider 已绑定到某用户
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('id, display_name')
  .eq('alipay_user_id', providerId)
  .single();

if (existingProfile) {
  // 如果是绑定操作且冲突，返回 null
  // 否则返回已存在的用户
  return { userId: existingProfile.id };
}

// 情况 2: 已登录用户绑定 provider
if (supabaseUserId) {
  await supabase
    .from('user_profiles')
    .update({ alipay_user_id: providerId })
    .eq('id', supabaseUserId);
  return { userId: supabaseUserId };
}

// 情况 3: 新用户注册
const email = `alipay_${providerId}@clawx.temp`;
const { data: newUser } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
  user_metadata: {
    display_name: info.nickname,
    avatar_url: info.avatar
  }
});

await supabase.from('user_profiles').insert({
  id: userId,
  display_name: info.nickname,
  avatar_url: info.avatar,
  subscription_tier: 'free',
  alipay_user_id: providerId  // 直接绑定
});

// 生成会话令牌
const { data: link } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email
});

return { userId, sessionToken: link?.hashed_token };
```

**更新会话状态:**
```typescript
await supabase
  .from('auth_sessions')
  .update({
    status: 'completed',
    supabase_user_id: result.userId,
    session_token: result.sessionToken,  // 新用户才有
    completed_at: new Date().toISOString()
  })
  .eq('login_token', loginToken);
```

**响应:**
```typescript
// 重定向到静态成功页面
return Response.redirect(
  'https://clawx-static.vercel.app/auth-result.html?type=success',
  302
);
```

---

### 3.4 Phase 4: 状态监听

**前端订阅 (supabase.ts):**
```typescript
// 双重机制: Realtime + Polling

// 1. 立即检查当前状态
supabase
  .from('auth_sessions')
  .select('*')
  .eq('login_token', loginToken)
  .single()
  .then(({ data }) => {
    if (['completed', 'expired', 'error'].includes(data.status)) {
      handleUpdate(data);
    }
  });

// 2. Realtime 订阅
const channel = supabase
  .channel(`auth-session-${loginToken}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'auth_sessions',
      filter: `login_token=eq.${loginToken}`,
    },
    (payload) => {
      handleUpdate(payload.new);
    }
  )
  .subscribe();

// 3. 轮询备份 (1秒间隔，最多5分钟)
const poll = async () => {
  const { data } = await supabase
    .from('auth_sessions')
    .select('*')
    .eq('login_token', loginToken)
    .single();

  if (data) {
    handleUpdate(data);
    if (['completed', 'expired', 'error'].includes(data.status)) {
      stopped = true;
      return;
    }
  }

  if (!stopped) setTimeout(poll, 1000);
};
```

**状态更新回调 (auth.ts):**
```typescript
const unsubscribe = subscribeToAuthSession(loginToken, (status) => {
  if (status.status === 'completed') {
    set({ authStatus: 'completed' });
    onComplete(status);  // 触发完成回调
  } else if (status.status === 'expired') {
    set({ authStatus: 'expired' });
  } else if (status.status === 'error') {
    set({ authStatus: 'error' });
  }
});
```

**控制台日志示例:**
```
[Supabase] Setting up realtime subscription + polling for token: 0c780e61...
[Supabase] Subscription status: SUBSCRIBED
[Poll] Session status: pending
[Poll] Session status: pending
[Poll] Session status: completed
[AuthStore] Auth completed, calling onComplete callback
[AuthContent] Auth callback triggered
```

---

### 3.5 Phase 5: 获取会话

**前端调用:**
```typescript
// AuthContent.tsx
const fullUser = await completeAuthFlow();

// auth.ts
const result = await getSessionToken(loginToken);
```

**请求:**
```http
GET /api/get-session?token=a1b2c3d4e5f6...
```

**后端处理 (get-session/index.ts):**
```typescript
// 1. 查询 auth_sessions
const { data: session } = await supabase
  .from('auth_sessions')
  .select('*')
  .eq('login_token', token)
  .single();

// 2. 检查过期
if (new Date(session.expires_at) < new Date()) {
  await supabase
    .from('auth_sessions')
    .update({ status: 'expired' })
    .eq('id', session.id);
  return { error: 'Token expired' };
}

// 3. 检查状态
if (session.status !== 'completed') {
  return { status: session.status, message: 'Authentication not completed yet' };
}

// 4. 查询用户信息
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', session.supabase_user_id)
  .single();

// 5. 删除会话 (一次性使用)
await supabase
  .from('auth_sessions')
  .delete()
  .eq('id', session.id);

// 6. 返回结果
return {
  sessionToken: session.session_token,
  user: {
    id: session.supabase_user_id,
    display_name: session.user_info?.nickname || profile?.display_name,
    avatar_url: session.user_info?.avatar || profile?.avatar_url,
    subscription_tier: profile?.subscription_tier || 'free',
    alipay_user_id: profile?.alipay_user_id || null,
    wechat_openid: profile?.wechat_openid || null,
  },
};
```

**响应:**
```json
{
  "sessionToken": "hashed_token_value",
  "user": {
    "id": "uuid-of-user",
    "display_name": "支付宝用户",
    "avatar_url": "",
    "subscription_tier": "free",
    "alipay_user_id": "2088xxx",
    "wechat_openid": null
  }
}
```

**前端状态更新:**
```typescript
// auth.ts
set({
  user: {
    id: result.user.id,
    email: result.user.email,
    displayName: result.user.display_name,
    avatarUrl: result.user.avatar_url,
    subscriptionTier: result.user.subscription_tier || 'free',
    alipayUserId: result.user.alipay_user_id,
    wechatOpenid: result.user.wechat_openid,
  },
  accessToken: result.sessionToken,
  isAuthenticated: true,
  authStatus: 'completed',
  // 清除临时数据
  oauthUrl: null,
  loginToken: null,
});
```

---

## 四、关键文件索引

| 文件路径 | 职责 |
|----------|------|
| `src/pages/Setup/AuthContent.tsx` | 登录 UI 组件，显示二维码和状态 |
| `src/stores/auth.ts` | Zustand 状态管理，认证流程控制 |
| `src/lib/supabase.ts` | Supabase 客户端，Realtime 订阅和轮询 |
| `supabase/functions/auth-init/index.ts` | 初始化登录会话，生成 OAuth URL |
| `supabase/functions/auth-callback/index.ts` | OAuth 回调处理，创建/查找用户 |
| `supabase/functions/get-session/index.ts` | 获取会话信息和用户数据 |

---

## 五、安全机制

1. **防重放攻击**: 使用 `processed_auth_code` 字段实现乐观锁
2. **会话过期**: 5 分钟有效期
3. **一次性令牌**: `loginToken` 使用后立即删除
4. **CORS 保护**: 所有 Edge Function 都有 CORS 头配置
5. **状态参数**: OAuth state 参数使用 base64 编码的 JSON

---

## 六、错误处理

| 错误类型 | 触发条件 | 用户提示 |
|----------|----------|----------|
| `expired` | 超过 5 分钟未完成 | "二维码已过期" |
| `error` | 无法获取用户信息 | "授权失败" |
| `error` | 账号已被其他用户绑定 | "该账号已被其他用户绑定" |
| `error` | 创建用户失败 | "登录失败" |

---

## 七、绑定已有账户流程

当用户已登录并想绑定支付宝/微信时:

```typescript
// 前端调用
await initAuthFlow(provider);  // 不传 userId

// 实际上应该在 auth.ts 中获取当前用户 ID
const currentUserId = get().user?.id;
await initAuthSession(provider, currentUserId);

// auth-init 会将 supabase_user_id 存入 auth_sessions
await supabase.from('auth_sessions').insert({
  login_token: loginToken,
  provider,
  status: 'pending',
  supabase_user_id: userId,  // 已登录用户的 ID
});

// auth-callback 中会绑定到已有账户
if (supabaseUserId) {
  await supabase
    .from('user_profiles')
    .update({ alipay_user_id: providerId })
    .eq('id', supabaseUserId);
}
```