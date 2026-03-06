-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own auth sessions" ON auth_sessions;
DROP POLICY IF EXISTS "Service role can manage auth sessions" ON auth_sessions;
DROP POLICY IF EXISTS "Allow anonymous session creation" ON auth_sessions;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow anonymous profile creation" ON user_profiles;

-- RLS Policies for auth_sessions
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth sessions"
  ON auth_sessions FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Service role can manage auth sessions"
  ON auth_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow anonymous session creation"
  ON auth_sessions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow anonymous profile creation"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- User trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, preferences)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->'preferences' || '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
