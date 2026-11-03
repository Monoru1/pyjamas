import 'server-only';
export async function sendOrderWhatsApp(phone:string,orderNumber:string,total:number,fetcher:typeof fetch=fetch) {
 const env=process.env;
 if(env.ORDER_NOTIFICATIONS_ENABLED!=='true'||env.ORDER_WHATSAPP_ENABLED!=='true')throw new Error('whatsapp_disabled');
 const version=env.WHATSAPP_GRAPH_VERSION;const sender=env.WHATSAPP_PHONE_NUMBER_ID;
 if(!/^v\d+\.\d+$/.test(version||'')||!/^\d+$/.test(sender||'')||!env.WHATSAPP_ACCESS_TOKEN||!env.WHATSAPP_ORDER_TEMPLATE||!env.WHATSAPP_TEMPLATE_LANGUAGE)throw new Error('whatsapp_not_configured');
 const recipient=phone.replace(/^\+/,'');if(!/^[1-9]\d{8,14}$/.test(recipient))throw new Error('invalid_recipient');
 if((env.PAYMENT_BUILD_CONTEXT||env.CONTEXT)!=='production'&&!(env.ORDER_TEST_PHONES||'').split(',').map(x=>x.trim().replace(/^\+/, '')).includes(recipient))throw new Error('test_recipient_not_allowed');
 const response=await fetcher(`https://graph.facebook.com/${version}/${sender}/messages`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:recipient,type:'template',template:{name:env.WHATSAPP_ORDER_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[{type:'text',text:orderNumber},{type:'text',text:`${total} XOF`}]}]}})});
 if(!response.ok)throw new Error('whatsapp_delivery_failed');const result=await response.json();const id=result.messages?.[0]?.id;
 if(typeof id!=='string'||!id.trim())throw new Error('whatsapp_acknowledgement_invalid');return id;
}
