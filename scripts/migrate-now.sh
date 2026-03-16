#!/bin/bash

# 数据库迁移脚本 - 直接使用硬编码密码

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# 执行迁移
echo "正在执行迁移..."

PGPASSWORD="你的数据库密码" /opt/homebrew/opt/postgresql@17/bin/psql -h db.zpeiuaojlprxdlakmnxg.supabase.co -p 5432 -U postgres -d postgres -c "
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
" 2>&1

if [ $? -eq 0 ]; then
    echo "迁移成功！"
    exit 1
fi

echo "=========================================="
echo "迁移完成！"
echo "列已成功添加！"

# 验证
/opt/homebrew/opt/postgresql@17/bin/psql -h db.zpeiuaojlprxdlakmnxg.supabase.co -p 5432 -U postgres -d postgres -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('is_trial', 'trial_ends_at', 'subscription_ends_at');
" 2>&1

echo "=========================================="
