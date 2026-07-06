import type { OrderStatus } from './enums';

export type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  source: string;
  currency_code: string;
  subtotal: number;
  discount_total: number;
  total: number;
  coupon_code: string | null;
  customer_note: string | null;
  whatsapp_message: string | null;
  whatsapp_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string;
  size_label: string | null;
  color_name: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};
