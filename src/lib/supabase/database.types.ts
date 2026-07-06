// Partial generated types from Supabase project pukvrerdloudfiphomsj.
// This file covers the storefront/catalog/checkout foundation.
// Replace with the full generated output after the official baseline migration is committed.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      product_variants: {
        Row: {
          audience: string | null;
          color_hex: string | null;
          color_name_en: string | null;
          color_name_fr: string;
          compare_at_price: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          low_stock_threshold: number;
          price: number;
          product_id: string;
          size_label: string;
          sku: string;
          stock_quantity: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      product_images: {
        Row: {
          alt_en: string | null;
          alt_fr: string | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          product_id: string;
          sort_order: number;
          url: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      product_catalog: {
        Row: {
          base_price: number | null;
          category_id: string | null;
          category_name_en: string | null;
          category_name_fr: string | null;
          category_slug: string | null;
          compare_at_price: number | null;
          created_at: string | null;
          currency_code: string | null;
          deleted_at: string | null;
          description_en: string | null;
          description_fr: string | null;
          id: string | null;
          is_active: boolean | null;
          is_featured: boolean | null;
          is_new: boolean | null;
          max_variant_price: number | null;
          min_variant_price: number | null;
          name_en: string | null;
          name_fr: string | null;
          primary_image_url: string | null;
          seo_description_en: string | null;
          seo_description_fr: string | null;
          seo_title_en: string | null;
          seo_title_fr: string | null;
          slug: string | null;
          sort_order: number | null;
          total_stock: number | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      admin_role: 'super_admin' | 'admin' | 'employee';
      analytics_event_type: 'product_view' | 'add_to_cart' | 'checkout_whatsapp' | 'collection_view';
      discount_type: 'percentage' | 'fixed';
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};
