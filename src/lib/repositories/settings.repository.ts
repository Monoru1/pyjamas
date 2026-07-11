import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';

export interface StoreSettings {
  siteName: string;
  defaultCurrency: string;
  defaultLanguage: string;
  whatsappPhone: string;
  whatsappDefaultMessage: string;
  instagramUrl: string;
  tiktokUrl: string;
  heroImage: string;
  loungeImage: string;
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
  instagramUrl: 'https://www.instagram.com/lamaisondespyjamas?igsh=MTlicHVteTN0MTJvcw==',
  tiktokUrl: 'https://www.tiktok.com/@lamaison_des_pyjamas?is_from_webapp=1&sender_device=pc',
  heroImage: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1600&q=85',
  loungeImage: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1000&q=85',
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
    const homepage = settings.get('homepage') ?? {};
    const social = settings.get('social') ?? {};

    return {
      siteName: asString(site.name, DEFAULT_STORE_SETTINGS.siteName),
      defaultCurrency: asString(site.defaultCurrency, DEFAULT_STORE_SETTINGS.defaultCurrency),
      defaultLanguage: asString(site.defaultLanguage, DEFAULT_STORE_SETTINGS.defaultLanguage),
      whatsappPhone: asString(whatsapp.phone, DEFAULT_STORE_SETTINGS.whatsappPhone),
      whatsappDefaultMessage: asString(
        whatsapp.defaultMessage,
        DEFAULT_STORE_SETTINGS.whatsappDefaultMessage,
      ),
      instagramUrl: asString(social.instagram, DEFAULT_STORE_SETTINGS.instagramUrl),
      tiktokUrl: asString(social.tiktok, DEFAULT_STORE_SETTINGS.tiktokUrl),
      heroImage: asString(homepage.heroImage, DEFAULT_STORE_SETTINGS.heroImage),
      loungeImage: asString(homepage.loungeImage, DEFAULT_STORE_SETTINGS.loungeImage),
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
