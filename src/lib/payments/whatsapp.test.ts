import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {prepareOrderWhatsApp,sendOrderWhatsApp} from './whatsapp';
afterEach(()=>vi.unstubAllEnvs());
it('stays disabled and refuses other recipients before any external call',async()=>{
 const fetcher=vi.fn();expect(()=>prepareOrderWhatsApp('customer_whatsapp','2290100000000')).toThrow('disabled');expect(fetcher).not.toHaveBeenCalled();
});
it('uses the approved template and persists only a real provider acknowledgement',async()=>{
 for(const [k,v]of Object.entries({ORDER_NOTIFICATIONS_ENABLED:'true',ORDER_WHATSAPP_ENABLED:'true',WHATSAPP_GRAPH_VERSION:'v25.0',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_ACCESS_TOKEN:'fixture',WHATSAPP_ORDER_TEMPLATE:'order_confirmation',WHATSAPP_TEMPLATE_LANGUAGE:'fr',ORDER_TEST_PHONES:'2290100000000'}))vi.stubEnv(k,v);
 const fetcher=vi.fn().mockResolvedValue(Response.json({messages:[{id:'wamid.fixture'}]}));
 expect(await sendOrderWhatsApp(prepareOrderWhatsApp('customer_whatsapp','2290100000000'),'TEST',1500,fetcher)).toBe('wamid.fixture');expect(fetcher.mock.calls[0][1].redirect).toBe('error');
 expect(JSON.parse(fetcher.mock.calls[0][1].body).template.components[0].parameters[1].text).toBe('1500 XOF');
 expect(()=>prepareOrderWhatsApp('customer_whatsapp','2290199999999')).toThrow('not_allowed');expect(fetcher).toHaveBeenCalledTimes(1);
});
