import type { Json } from '../database.types';

export type BannerRow = {
  id: string;
  placement: string;
  title_fr: string;
  title_en: string | null;
  subtitle_fr: string | null;
  subtitle_en: string | null;
  image_url: string | null;
  cta_label_fr: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FaqRow = {
  id: string;
  question_fr: string;
  question_en: string | null;
  answer_fr: string;
  answer_en: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HomepageSectionRow = {
  id: string;
  section_key: string;
  title_fr: string | null;
  title_en: string | null;
  content: Json;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

export type TestimonialRow = {
  id: string;
  customer_name: string;
  message_fr: string;
  message_en: string | null;
  rating: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
