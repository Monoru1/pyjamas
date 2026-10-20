ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_width_check CHECK (width IS NULL OR width >= 0);
