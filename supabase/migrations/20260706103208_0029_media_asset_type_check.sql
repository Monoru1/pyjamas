ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_asset_type_check CHECK (asset_type IN ('image','video','document','logo','banner','icon'));
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_size_check CHECK (size_bytes IS NULL OR size_bytes >= 0);
