# 头像功能实现文档

本文档记录了头像显示和头像上传功能的完整实现方案，以及遇到的问题和解决方案。

## 目录

1. [架构概述](#架构概述)
2. [头像显示功能](#头像显示功能)
3. [头像上传功能](#头像上传功能)
4. [Edge Function 实现](#edge-function-实现)
5. [数据库和存储配置](#数据库和存储配置)
6. [遇到的问题和解决方案](#遇到的问题和解决方案)

---

## 架构概述

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend      │      │  Edge Function   │      │  Supabase       │
│   (React)       │─────▶│  (upload-avatar) │─────▶│  Storage        │
│                 │      │                  │      │  (avatars bucket)│
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                                                   │
        │                                                   │
        ▼                                                   ▼
┌─────────────────┐                                ┌─────────────────┐
│  Zustand Store  │                                │  user_profiles  │
│  (account.ts)   │                                │  (avatar_url)   │
└─────────────────┘                                └─────────────────┘
```

### 关键技术点

- **自定义认证系统**：使用 `sessionToken` 而非 Supabase 标准 JWT
- **Storage Bucket**：公开读取的 `avatars` bucket
- **Edge Function**：使用 service_role 绕过 RLS 进行文件上传
- **文件命名规则**：`{userId}/avatar`（固定文件名，覆盖旧头像）

---

## 头像显示功能

### 1. 数据流

```
OAuth 登录 → get-session Edge Function → auth store → account store → UI 显示
```

### 2. 核心代码

#### `src/stores/account.ts` - fetchProfile 函数

```typescript
fetchProfile: async () => {
  set({ isLoading: true });

  try {
    // 从 auth store 获取用户信息（OAuth 登录时设置）
    const authUser = useAuthStore.getState().user;
    if (!authUser?.id) {
      set({ profile: null, isLoading: false });
      return;
    }

    // 获取头像 URL - 优先使用 auth store 中的，否则从 Storage 构造公开 URL
    let avatarUrl = authUser.avatarUrl || '';
    if (!avatarUrl) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        // 固定路径：{userId}/avatar
        avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${authUser.id}/avatar`;
      }
    }

    // 构建 profile 对象
    const profile: UserProfile = {
      id: authUser.id,
      display_name: authUser.displayName || 'User',
      avatar_url: avatarUrl,
      subscription_tier: authUser.subscriptionTier || 'free',
      alipay_user_id: authUser.alipayUserId || null,
      wechat_openid: authUser.wechatOpenid || null,
      preferences: null,
      created_at: new Date().toISOString(),
    };

    set({ profile, isLoading: false });
  } catch (error) {
    console.error('Error building profile from auth store:', error);
    set({ isLoading: false });
  }
}
```

### 3. UI 组件

#### `src/pages/Account/ProfileSection.tsx`

```tsx
{/* Avatar Display */}
<div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
  {profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.display_name || 'User'}
      className="h-full w-full object-cover"
    />
  ) : (
    <User className="h-10 w-10 text-muted-foreground" />
  )}
</div>
```

---

## 头像上传功能

### 1. 上传流程

```
用户选择文件 → 前端验证 → 调用 upload-avatar Edge Function
→ 删除旧头像 → 上传新头像 → 更新数据库 → 返回新 URL
```

### 2. 前端实现

#### `src/stores/account.ts` - uploadAvatar 函数

```typescript
uploadAvatar: async (file: File): Promise<string | null> => {
  const { profile } = get();
  const accessToken = useAuthStore.getState().accessToken;
  if (!profile) return null;

  set({ isLoading: true });

  try {
    const formData = new FormData();
    formData.append('file', file);

    // 设置请求头
    const headers: Record<string, string> = {
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    // 如果有 token 则添加 Authorization
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // 调用 Edge Function，通过 URL 参数传递 user_id
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar?user_id=${profile.id}`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Error uploading avatar:', error);
      set({ isLoading: false });
      return null;
    }

    const result = await response.json();

    // 更新本地 profile 状态
    set({
      profile: { ...profile, avatar_url: result.avatarUrl },
      isLoading: false,
    });

    // 同步到 auth store
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      useAuthStore.getState().setUser({
        ...authUser,
        avatarUrl: result.avatarUrl,
      });
    }

    return result.avatarUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    set({ isLoading: false });
    return null;
  }
}
```

### 3. 前端文件验证

#### `src/pages/Account/ProfileSection.tsx`

```typescript
const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 验证文件类型
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    return;
  }

  // 验证文件大小 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File size must be less than 2MB.');
    return;
  }

  const result = await uploadAvatar(file);
  if (result) {
    toast.success('Avatar updated successfully');
  } else {
    toast.error('Failed to upload avatar');
  }
};
```

---

## Edge Function 实现

### 文件位置

`supabase/functions/upload-avatar/index.ts`

### 完整代码

```typescript
/**
 * Upload Avatar Edge Function
 * Handles avatar image upload to Supabase Storage
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Service client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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
    // Get user_id from URL query parameter
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user exists in database (using service_role to bypass RLS)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 2MB.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use fixed filename without extension (Supabase handles content-type)
    const filename = `${userId}/avatar`;

    // Read file content
    const fileBuffer = await file.arrayBuffer();

    // Delete old avatars for this user (cleanup)
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload avatar' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filename);

    // Add cache-busting query param to ensure fresh load
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ avatarUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 关键设计点

1. **使用 service_role key**：绕过 RLS 进行数据库和存储操作
2. **通过 URL 参数验证用户**：`?user_id={userId}`
3. **固定文件名**：`{userId}/avatar`，避免文件堆积
4. **cache-busting**：返回 URL 时添加 `?t={timestamp}` 确保浏览器刷新
5. **清理旧文件**：上传前先删除用户的旧头像

---

## 数据库和存储配置

### 1. Storage Bucket 创建

文件：`supabase/migrations/20250307000001_create_avatars_bucket.sql`

```sql
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access (avatars are visible to everyone)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow service role writes (upload via Edge Function)
CREATE POLICY "Allow service role writes"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND auth.role() = 'service_role');
```

### 2. Edge Function JWT 配置

文件：`supabase/config.toml`

```toml
[functions.upload-avatar]
verify_jwt = false
```

**重要**：由于使用自定义认证系统（sessionToken 而非 Supabase JWT），必须设置 `verify_jwt = false`。

---

## 遇到的问题和解决方案

### 问题 1：头像不显示

**现象**：登录后头像显示为默认图标

**原因**：
1. `avatars` bucket 未设置为 public
2. `fetchProfile` 没有正确构造头像 URL

**解决方案**：
1. 在 Supabase Dashboard 中将 `avatars` bucket 设置为 public
2. 修改 `fetchProfile` 函数，当没有 `avatarUrl` 时从 Storage 构造公开 URL

```typescript
// 构造公开 URL
avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${authUser.id}/avatar`;
```

---

### 问题 2：头像上传返回 401 错误

**现象**：
```json
{ "code": 401, "message": "Missing authorization header" }
```

**排查过程**：

1. **错误格式分析**：错误格式 `{code: 401, message: '...'}` 与 Edge Function 代码中的 `{error: '...'}` 不同，说明错误来自 Supabase 基础设施而非我们的代码

2. **尝试添加 apikey header**：无效

3. **尝试添加 Authorization header**：无效

4. **检查部署的代码**：确认远程代码与本地一致，Edge Function 代码本身没有 JWT 验证

5. **最终发现**：`config.toml` 中其他 Edge Functions 都配置了 `verify_jwt = false`，但 `upload-avatar` 没有这个配置

**根本原因**：

Supabase Edge Functions 默认会验证 JWT。由于项目使用自定义认证系统（sessionToken），没有标准的 Supabase JWT，导致请求被 API Gateway 拦截。

**解决方案**：

在 `supabase/config.toml` 中添加配置：

```toml
[functions.upload-avatar]
verify_jwt = false
```

然后重新部署：

```bash
npx supabase functions deploy upload-avatar
```

---

## 总结

### 关键配置清单

| 配置项 | 位置 | 值 |
|--------|------|-----|
| Bucket 可见性 | Supabase Dashboard | Public |
| Storage 读策略 | Migration | `bucket_id = 'avatars'` |
| Storage 写策略 | Migration | `auth.role() = 'service_role'` |
| JWT 验证 | config.toml | `verify_jwt = false` |
| 文件命名 | Edge Function | `{userId}/avatar` |
| 文件大小限制 | Edge Function | 2MB |
| 允许的文件类型 | Edge Function | JPEG, PNG, WebP |

### 部署步骤

1. 运行 migration 创建 bucket 和策略
2. 确保 `config.toml` 中 `verify_jwt = false`
3. 部署 Edge Function：`npx supabase functions deploy upload-avatar`
4. 在 Dashboard 确认 bucket 为 public

### 文件结构

```
supabase/
├── config.toml                          # Edge Function 配置
├── migrations/
│   └── 20250307000001_create_avatars_bucket.sql
└── functions/
    ├── _shared/
    │   └── cors.ts
    └── upload-avatar/
        └── index.ts

src/
├── stores/
│   └── account.ts                       # uploadAvatar 函数
└── pages/Account/
    └── ProfileSection.tsx               # UI 组件
```
