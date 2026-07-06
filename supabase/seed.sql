-- supabase/seed.sql — données de référence + contenu de démarrage
-- Fidèle à l'état connu de la base au 2026-07-06. Idempotent.

insert into public.languages (code, name, is_default, is_active) values
  ('fr', 'Français', true,  true),
  ('en', 'English',  false, true)
on conflict (code) do nothing;

insert into public.currencies (code, name, symbol, decimals, is_default, is_active) values
  ('XOF', 'Franc CFA BCEAO', 'FCFA', 0, true,  true),
  ('EUR', 'Euro',            '€',    2, false, true),
  ('USD', 'US Dollar',       '$',    2, false, true),
  ('GBP', 'British Pound',   '£',    2, false, true)
on conflict (code) do nothing;

insert into public.settings (key, value, description) values
  ('site',     '{"name":"La Maison des Pyjamas","defaultCurrency":"XOF","defaultLanguage":"fr"}'::jsonb, 'General website settings'),
  ('business', '{"city":"Cotonou","country":"Bénin","address":"Boutique 1371, face marché de Kindonou, Cotonou"}'::jsonb, 'Physical shop information'),
  ('theme',    '{"primary":"#7A1F2B","accent":"#D4AF37","background":"#FFF8F1"}'::jsonb, 'Brand theme settings'),
  ('whatsapp', '{"phone":"","defaultMessage":"Bonjour, je souhaite passer une commande."}'::jsonb, 'WhatsApp checkout settings')
on conflict (key) do nothing;

insert into public.categories (id, parent_id, slug, name_fr, name_en, sort_order, is_active) values
  ('3dbdcb61-0b17-4fb5-9d75-49640de9d87b', null, 'femme',   'Femme',   'Women',  10, true),
  ('93311a5c-7359-43e6-8ae5-81f89c3544f1', null, 'homme',   'Homme',   'Men',    20, true),
  ('98751019-005a-417b-a847-69527c0ef16c', null, 'enfant',  'Enfant',  'Kids',   30, true),
  ('93b36f8e-e7b6-45e7-86e2-533e3a6aa72d', null, 'famille', 'Famille', 'Family', 40, true),
  ('8952a280-0f7f-410b-8da1-eb720e26b233', null, 'couple',  'Couple',  'Couple', 50, true)
on conflict (id) do nothing;

insert into public.collections (id, slug, name_fr, name_en, description_fr, description_en, sort_order, is_featured, is_active) values
  ('5b56515a-0d36-4f12-be34-88bc164dd710', 'noel',       'Noël',       'Christmas',    'La collection festive pour toute la famille.', 'Festive collection for the whole family.', 10, true,  true),
  ('b97740a6-affa-4708-8bc4-f1ebab815040', 'nouveautes', 'Nouveautés', 'New arrivals', 'Les derniers modèles disponibles.',            'Latest available styles.',                 20, true,  true),
  ('1a75b926-63a1-482e-bb87-01af8d119842', 'promotions', 'Promotions', 'Promotions',   'Offres et prix réduits.',                      'Offers and discounted prices.',            30, false, true)
on conflict (id) do nothing;

insert into public.homepage_sections (id, section_key, title_fr, title_en, content, sort_order, is_active) values
  ('868c0652-1bbd-44cd-99c1-9646d674d755', 'hero',                 'Préparez Noël avec La Maison des Pyjamas', 'Get ready for Christmas with La Maison des Pyjamas', '{"cta":"Découvrir la collection"}'::jsonb, 10, true),
  ('b753d37e-eb75-43ec-bcb9-7ba48318de35', 'featured_collections', 'Collections en vedette',                   'Featured collections',                              '{}'::jsonb,                                20, true),
  ('f33c6954-51ad-4501-9c36-6b2d105c954c', 'how_to_order',         'Comment commander',                        'How to order',                                      '{"steps":["Choisissez vos articles","Validez votre panier","Confirmez sur WhatsApp"]}'::jsonb, 30, true)
on conflict (id) do nothing;

insert into public.faq (id, question_fr, question_en, answer_fr, answer_en, sort_order, is_active) values
  ('73e3fc41-07fb-443d-bfa0-b831cf95a9f8', 'Comment passer commande ?', 'How do I place an order?', 'Ajoutez vos articles au panier puis validez. Un message WhatsApp complet sera généré automatiquement.', 'Add items to your cart then checkout. A complete WhatsApp message will be generated automatically.', 10, true),
  ('2693eb28-12b2-4d74-8315-25bfd6314af9', 'Les articles en rupture restent-ils visibles ?', 'Are out-of-stock items still visible?', 'Oui, ils restent visibles avec la mention rupture.', 'Yes, they remain visible with an out-of-stock label.', 20, true)
on conflict (id) do nothing;
