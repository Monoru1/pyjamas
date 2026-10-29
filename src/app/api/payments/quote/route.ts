import { checkoutSchema } from '@/lib/payments/checkout-input';
import { createQuoteToken } from '@/lib/payments/quotes';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { readLimitedBody, requireBrowserOrigin, requireJsonRequest, HttpInputError } from '@/lib/payments/read-body';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    requireJsonRequest(request);requireBrowserOrigin(request,trustedSiteOrigin(process.env.SITE_ORIGIN||process.env.DEPLOY_PRIME_URL||process.env.PAYMENT_SITE_URL));
    // Live preview quotes stay staff-only even while financial admission is off.
    if(process.env.FEDAPAY_ENVIRONMENT==='live'&&process.env.CONTEXT!=='production') {
      const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
      if(!user || !(await auth.rpc('is_admin')).data)return Response.json({error:'Accès test réservé au personnel.'},{status:403});
    }
    const input=checkoutSchema.pick({lines:true}).safeParse(JSON.parse(await readLimitedBody(request,8000)));
    const shipping=Number(process.env.PAYMENT_SHIPPING_XOF);
    if(!input.success || !process.env.PAYMENT_SHIPPING_XOF || !Number.isSafeInteger(shipping) || shipping<0 || shipping>1_000_000)return Response.json({error:'Panier ou livraison à vérifier.'},{status:400});
    const {data,error}=await createPublicClient().rpc('quote_shop_basket',{p_lines:input.data.lines,p_shipping:shipping});
    if(error||!data)return Response.json({error:'Un article est indisponible. Actualisez votre panier.'},{status:409});
    return Response.json({quote:data,quoteToken:createQuoteToken(data as never)},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {if(error instanceof HttpInputError)return Response.json({error:error.message},{status:error.status});return Response.json({error:'Vérification des prix momentanément indisponible.'},{status:503});}
}
