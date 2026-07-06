import type { Json } from '../database.types';

export type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  is_default: boolean;
  is_active: boolean;
};

export type LanguageRow = {
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
};

export type SettingRow = {
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
};

export type DashboardSummaryRow = {
  products_total: number | null;
  variants_low_stock: number | null;
  variants_out_of_stock: number | null;
  orders_total: number | null;
  orders_pending: number | null;
};
