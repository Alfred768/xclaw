-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access (avatars are visible to everyone)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow all writes (upload will be handled by Edge Function with service role)
-- This is safe because we only upload via Edge Function which validates user
CREATE POLICY "Allow service role writes"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND auth.role() = 'service_role');
