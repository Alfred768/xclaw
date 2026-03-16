# 数据库迁移指南

## 问题
数据库缺少 `is_trial`, `trial_ends_at`, `subscription_ends_at` 列，导致 `test-token-create` Edge Function 失败。

## 解决方案

### 方法 1: 使用 Supabase Dashboard (推荐)

1. 访问 Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/zpeiuaojlprxdlakmnxg/sql/new

2. 复制并执行以下 SQL:

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
```

### 方法 2: 使用 psql 终端

1. 在 Supabase Dashboard 中获取数据库密码
   https://supabase.com/dashboard/project/zpeiuaojlprxdlakmnxg/settings/billing

2. 点击 "Database password" 旁边的 "复制" 按钮复制密码

3. 在终端中运行迁移脚本

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# 替换下面的 YOUR_PASSWORD 为你复制的密码
PGPASSWORD="YOUR_PASSWORD" psql -h db.zpeiuaojlprxdlakmnxg.supabase.co -p 5432 -U postgres -d postgres -c "
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
"
```

## 验证

迁移完成后，在 Supabase Dashboard SQL Editor 中运行：

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('is_trial', 'trial_ends_at', 'subscription_ends_at');
```

应该看到 3 行，3 列都已成功添加。
