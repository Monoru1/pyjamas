export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          collection_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          metadata: Json
          product_id: string | null
          session_id: string | null
          variant_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          cta_label_en: string | null
          cta_label_fr: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle_en: string | null
          subtitle_fr: string | null
          title_en: string | null
          title_fr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label_en?: string | null
          cta_label_fr?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          title_en?: string | null
          title_fr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label_en?: string | null
          cta_label_fr?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          title_en?: string | null
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description_en: string | null
          description_fr: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_en: string | null
          name_fr: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en?: string | null
          name_fr: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en?: string | null
          name_fr?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description_en: string | null
          description_fr: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          decimals: number
          is_active: boolean
          is_default: boolean
          name: string
          symbol: string
        }
        Insert: {
          code: string
          decimals?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          symbol: string
        }
        Update: {
          code?: string
          decimals?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      faq: {
        Row: {
          answer_en: string | null
          answer_fr: string
          created_at: string
          id: string
          is_active: boolean
          question_en: string | null
          question_fr: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer_en?: string | null
          answer_fr: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string | null
          question_fr: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer_en?: string | null
          answer_fr?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string | null
          question_fr?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json
          id: string
          is_active: boolean
          section_key: string
          sort_order: number
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          is_active?: boolean
          section_key: string
          sort_order?: number
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          is_active?: boolean
          section_key?: string
          sort_order?: number
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          is_active: boolean
          is_default: boolean
          name: string
        }
        Insert: {
          code: string
          is_active?: boolean
          is_default?: boolean
          name: string
        }
        Update: {
          code?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_en: string | null
          alt_fr: string | null
          asset_type: string
          bucket: string
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          is_active: boolean
          metadata: Json
          mime_type: string | null
          path: string
          size_bytes: number | null
          tags: string[]
          title: string | null
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          alt_en?: string | null
          alt_fr?: string | null
          asset_type?: string
          bucket?: string
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          alt_en?: string | null
          alt_fr?: string | null
          asset_type?: string
          bucket?: string
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_name: string | null
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size_label: string | null
          sku: string
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color_name?: string | null
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          size_label?: string | null
          sku: string
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          color_name?: string | null
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size_label?: string | null
          sku?: string
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_order_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_order_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          currency_code: string
          customer_id: string | null
          customer_note: string | null
          discount_total: number
          id: string
          order_number: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          whatsapp_message: string | null
          whatsapp_opened_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_total?: number
          id?: string
          order_number: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_opened_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_total?: number
          id?: string
          order_number?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          collection_id: string
          product_id: string
        }
        Insert: {
          collection_id: string
          product_id: string
        }
        Update: {
          collection_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_en: string | null
          alt_fr: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_en?: string | null
          alt_fr?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_en?: string | null
          alt_fr?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          audience: string | null
          color_hex: string | null
          color_name_en: string | null
          color_name_fr: string
          compare_at_price: number | null
          created_at: string
          id: string
          is_active: boolean
          low_stock_threshold: number
          price: number
          product_id: string
          size_label: string
          sku: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          audience?: string | null
          color_hex?: string | null
          color_name_en?: string | null
          color_name_fr: string
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          price: number
          product_id: string
          size_label: string
          sku: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          audience?: string | null
          color_hex?: string | null
          color_name_en?: string | null
          color_name_fr?: string
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          price?: number
          product_id?: string
          size_label?: string
          sku?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          name_en: string | null
          name_fr: string
          seo_description_en: string | null
          seo_description_fr: string | null
          seo_title_en: string | null
          seo_title_fr: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          name_en?: string | null
          name_fr: string
          seo_description_en?: string | null
          seo_description_fr?: string | null
          seo_title_en?: string | null
          seo_title_fr?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          name_en?: string | null
          name_fr?: string
          seo_description_en?: string | null
          seo_description_fr?: string | null
          seo_title_en?: string | null
          seo_title_fr?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          is_approved: boolean
          product_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          is_approved?: boolean
          product_id?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          is_approved?: boolean
          product_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_product_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          image_url: string | null
          is_active: boolean
          message_en: string | null
          message_fr: string
          rating: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message_en?: string | null
          message_fr: string
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message_en?: string | null
          message_fr?: string
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_order_overview: {
        Row: {
          created_at: string | null
          currency_code: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_whatsapp_phone: string | null
          discount_total: number | null
          id: string | null
          items_count: number | null
          order_number: string | null
          source: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      admin_product_overview: {
        Row: {
          base_price: number | null
          category_name_fr: string | null
          created_at: string | null
          currency_code: string | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          max_variant_price: number | null
          min_variant_price: number | null
          name_fr: string | null
          slug: string | null
          total_stock: number | null
          updated_at: string | null
          variants_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      dashboard_summary: {
        Row: {
          orders_pending: number | null
          orders_total: number | null
          products_total: number | null
          variants_low_stock: number | null
          variants_out_of_stock: number | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          base_price: number | null
          category_id: string | null
          category_name_en: string | null
          category_name_fr: string | null
          category_slug: string | null
          collection_slugs: string[] | null
          compare_at_price: number | null
          created_at: string | null
          currency_code: string | null
          deleted_at: string | null
          description_en: string | null
          description_fr: string | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          max_variant_price: number | null
          min_variant_compare_at_price: number | null
          min_variant_price: number | null
          name_en: string | null
          name_fr: string | null
          primary_image_url: string | null
          seo_description_en: string | null
          seo_description_fr: string | null
          seo_title_en: string | null
          seo_title_fr: string | null
          slug: string | null
          sort_order: number | null
          total_stock: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      admin_update_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "employee"
      analytics_event_type:
        | "product_view"
        | "add_to_cart"
        | "checkout_whatsapp"
        | "collection_view"
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super_admin", "admin", "employee"],
      analytics_event_type: [
        "product_view",
        "add_to_cart",
        "checkout_whatsapp",
        "collection_view",
      ],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
