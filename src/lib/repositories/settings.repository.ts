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
  const supabase = await createClient();

  const { data, error } = await supabase.from('settings').select('*');

  if (error) {
    throw new Error(`Unable to load store settings: ${error.message}`);
  }

  const settings = new Map((data ?? []).map((row) => [row.key, asRecord(row.value)]));
  const site = settings.get('site') ?? {};
  const whatsapp = settings.get('whatsapp') ?? {};
  const theme = settings.get('theme') ?? {};

  return {
    siteName: asString(site.name, 'La Maison des Pyjamas'),
    defaultCurrency: asString(site.defaultCurrency, 'XOF'),
    defaultLanguage: asString(site.defaultLanguage, 'fr'),
    whatsappPhone: asString(whatsapp.phone, ''),
    whatsappDefaultMessage: asString(whatsapp.defaultMessage, 'Bonjour, je souhaite passer une commande.'),
    theme: {
      primary: asString(theme.primary, '#7A1F2B'),
      accent: asString(theme.accent, '#D4AF37'),
      background: asString(theme.background, '#FFF8F1'),
    },
  };
}
