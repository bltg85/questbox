-- Create products storage bucket for thumbnails and files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product files
CREATE POLICY "Public can view product files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'products');

-- Allow service role full access
CREATE POLICY "Service role full access to product files"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'products')
  WITH CHECK (bucket_id = 'products');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload product files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update product files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can delete product files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');
