export type AdminRole = 'super_admin' | 'admin' | 'employee';
export type AnalyticsEventType = 'product_view' | 'add_to_cart' | 'checkout_whatsapp' | 'collection_view';
export type DiscountType = 'percentage' | 'fixed';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export const SUPABASE_ENUMS = {
  admin_role: ['super_admin', 'admin', 'employee'],
  analytics_event_type: ['product_view', 'add_to_cart', 'checkout_whatsapp', 'collection_view'],
  discount_type: ['percentage', 'fixed'],
  order_status: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
} as const;
