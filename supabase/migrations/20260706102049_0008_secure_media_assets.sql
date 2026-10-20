ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active media assets" ON public.media_assets FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "admin manage media assets" ON public.media_assets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX idx_media_assets_asset_type ON public.media_assets (asset_type);
CREATE INDEX idx_media_assets_created_at ON public.media_assets (created_at);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING gin (tags);
CREATE UNIQUE INDEX uniq_media_assets_bucket_path ON public.media_assets (bucket, path);
