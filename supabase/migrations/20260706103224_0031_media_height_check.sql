ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_height_check CHECK (height IS NULL OR height >= 0);
