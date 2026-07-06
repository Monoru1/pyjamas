import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';

export interface StoreSettings {
  siteName: string;
  defaultCurrency: string;
  defaultLanguage: string;
  whatsappPhone: string;
  whatsappDefaultMessage: string;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
}

type JsonRecord = Record<string, Json | undefined>;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  siteName: 'La Maison des Pyjamas',
  defaultCurrency: 'XOF',
  defaultLanguage: 'fr',
  whatsappPhone: '',
  whatsappDefaultMessage: 'Bonjour, je souhaite passer une commande.',
  theme: {
    primary: '#7A1F2B',
    accent: '#D4AF37',
    background: '#FFF8F1',
  },
};

function asRecord(value: Json): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function asString(value: Json | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('settings').select('*');

    if (error) {
      console.error('Unable to load store settings:', error.message);
      return DEFAULT_STORE_SETTINGS;
    }

    const settings = new Map((data ?? []).map((row) => [row.key, asRecord(row.value)]));
    const site = settings.get('site') ?? {};
    const whatsapp = settings.get('whatsapp') ?? {};
    const theme = settings.get('theme') ?? {};

    return {
      siteName: asString(site.name, DEFAULT_STORE_SETTINGS.siteName),
      defaultCurrency: asString(site.defaultCurrency, DEFAULT_STORE_SETTINGS.defaultCurrency),
      defaultLanguage: asString(site.defaultLanguage, DEFAULT_STORE_SETTINGS.defaultLanguage),
      whatsappPhone: asString(whatsapp.phone, DEFAULT_STORE_SETTINGS.whatsappPhone),
      whatsappDefaultMessage: asString(
        whatsapp.defaultMessage,
        DEFAULT_STORE_SETTINGS.whatsappDefaultMessage,
      ),
      theme: {
        primary: asString(theme.primary, DEFAULT_STORE_SETTINGS.theme.primary),
        accent: asString(theme.accent, DEFAULT_STORE_SETTINGS.theme.accent),
        background: asString(theme.background, DEFAULT_STORE_SETTINGS.theme.background),
      },
    };
  } catch (error) {
    console.error('Settings repository runtime fallback:', error);
    return DEFAULT_STORE_SETTINGS;
  }
}
