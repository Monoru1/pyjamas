import {expect,it} from 'vitest';
import {createQuoteToken,verifyQuoteToken,reservedPaymentQuote,type ShopQuote} from './quotes';
const quote:ShopQuote={amount_xof:2000,shipping_xof:500,currency:'XOF',items:[{variantId:'test',quantity:1,unitPrice:1500,name:'Fixture',maxStock:5}]};
const secret='fixture-reconcile-secret-32-characters';
it('accepts a current signed server quote, rejects changed prices, quantities and expiration',()=>{
 const token=createQuoteToken(quote,secret,1000);expect(verifyQuoteToken(token,quote,secret,1001)).toBe(true);
 expect(verifyQuoteToken(token,{...quote,amount_xof:2001},secret,1001)).toBe(false);
 expect(verifyQuoteToken(token,{...quote,items:[{...quote.items[0],quantity:2}]},secret,1001)).toBe(false);
 expect(verifyQuoteToken(token,quote,secret,1300)).toBe(false);
 expect(verifyQuoteToken(token+'a',quote,secret,1001)).toBe(false);
 expect(verifyQuoteToken(token,quote,'other-secret-with-at-least-32-characters',1001)).toBe(false);
});
it('reviews immutable order prices on retry without requiring unreserved public stock',()=>{
 const reserved=reservedPaymentQuote({amount_xof:2000,items:quote.items});
 expect(reserved).toMatchObject({reserved:true,amount_xof:2000,shipping_xof:500});
 expect(reserved.items[0].maxStock).toBe(1);
 expect(verifyQuoteToken(createQuoteToken(quote,secret,1000),reserved,secret,1001)).toBe(true);
 expect(()=>reservedPaymentQuote({amount_xof:1,items:quote.items})).toThrow();
});
