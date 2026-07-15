import type { CategoryRow, CollectionRow, ProductCatalogRow, ProductCollectionRow, ProductImageRow, ProductRow, ProductVariantRow } from './types/catalog';
import type { CustomerRow, OrderItemRow, OrderRow } from './types/commerce';
import type { BannerRow, FaqRow, HomepageSectionRow, TestimonialRow } from './types/cms';
import type { CurrencyRow, DashboardSummaryRow, LanguageRow, SettingRow } from './types/reference';
import type { AdminRole, AnalyticsEventType, DiscountType, OrderStatus } from './types/enums';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericRow = Record<string, Json>;
type Table<Row = GenericRow> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      activity_logs: Table;
      analytics_events: Table;
      banners: Table<BannerRow>;
      categories: Table<CategoryRow>;
      collections: Table<CollectionRow>;
      coupons: Table;
      currencies: Table<CurrencyRow>;
      customers: Table<CustomerRow>;
      faq: Table<FaqRow>;
      homepage_sections: Table<HomepageSectionRow>;
      languages: Table<LanguageRow>;
      order_items: Table<OrderItemRow>;
      orders: Table<OrderRow>;
      product_collections: Table<ProductCollectionRow>;
      product_images: Table<ProductImageRow>;
      product_variants: Table<ProductVariantRow>;
      products: Table<ProductRow>;
      profiles: Table;
      reviews: Table;
      settings: Table<SettingRow>;
      test: Table;
      testimonials: Table<TestimonialRow>;
    };
    Views: {
      dashboard_summary: { Row: DashboardSummaryRow; Relationships: [] };
      product_catalog: { Row: ProductCatalogRow; Relationships: [] };
    };
    Functions: {
      admin_update_order_status: { Args: { p_order_id: string; p_new_status: OrderStatus }; Returns: undefined };
      is_admin: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      slugify: { Args: { input: string }; Returns: string };
    };
    Enums: {
      admin_role: AdminRole;
      analytics_event_type: AnalyticsEventType;
      discount_type: DiscountType;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

type DefaultSchema = Database['public'];

export type Tables<T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      admin_role: ['super_admin', 'admin', 'employee'],
      analytics_event_type: ['product_view', 'add_to_cart', 'checkout_whatsapp', 'collection_view'],
      discount_type: ['percentage', 'fixed'],
      order_status: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    },
  },
} as const;
