import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export type ShopQuote = { amount_xof:number; shipping_xof:number; currency:'XOF'; items:{variantId:string;quantity:number;unitPrice:number;name:string;maxStock:number}[] };
export function quoteFingerprint(quote: ShopQuote) {
  return createHash('sha256').update(JSON.stringify({currency:quote.currency,amount:quote.amount_xof,shipping:quote.shipping_xof,items:[...quote.items].sort((a,b)=>a.variantId.localeCompare(b.variantId)).map(i=>({id:i.variantId,quantity:i.quantity,price:i.unitPrice}))})).digest('hex');
}
function secret(value?:string) { if(!value || value.length<32)throw new Error('Signature de devis non configurée.');return value; }
export function createQuoteToken(quote:ShopQuote,key=process.env.PAYMENT_RECONCILE_SECRET,now=Math.floor(Date.now()/1000)) {
  const payload=Buffer.from(JSON.stringify({hash:quoteFingerprint(quote),expires:now+300})).toString('base64url');
  return `${payload}.${createHmac('sha256',secret(key)).update(payload).digest('hex')}`;
}
export function verifyQuoteToken(token:unknown,quote:ShopQuote,key=process.env.PAYMENT_RECONCILE_SECRET,now=Math.floor(Date.now()/1000)) {
  if(typeof token!=='string'||token.length>1000)return false;
  const [payload,signature,...extra]=token.split('.');
  if(extra.length||!payload||!/^[a-f0-9]{64}$/.test(signature||''))return false;
  const expected=createHmac('sha256',secret(key)).update(payload).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return false;
  try {const parsed=JSON.parse(Buffer.from(payload,'base64url').toString());return parsed.hash===quoteFingerprint(quote)&&Number.isInteger(parsed.expires)&&parsed.expires>now&&parsed.expires<=now+300;}catch{return false;}
}
