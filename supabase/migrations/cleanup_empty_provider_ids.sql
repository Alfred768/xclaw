-- Cleanup script for empty provider_user_id values
-- These records were created during testing with empty strings

-- First, show records that will be deleted
SELECT id, alipay_user_id, wechat_openid, created_at
FROM user_profiles
WHERE alipay_user_id = '' OR wechat_openid = '';

-- Delete user_profiles records with empty alipay_user_id or wechat_openid
-- Note: You may need to delete from auth.users first if there are foreign key constraints
-- DELETE FROM auth.users WHERE id IN (
--   SELECT id FROM user_profiles WHERE alipay_user_id = '' OR wechat_openid = ''
-- );

DELETE FROM user_profiles
WHERE alipay_user_id = '' OR wechat_openid = '';
