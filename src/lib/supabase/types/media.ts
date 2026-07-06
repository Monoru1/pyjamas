import type { Json } from '../database.types';

export type MediaAssetRow = {
  id: string;
  bucket: string;
  path: string;
  url: string;
  title: string | null;
  alt_fr: string | null;
  alt_en: string | null;
  asset_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  metadata: Json;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
