import { describe, expect, it } from 'vitest';
import { validateChristmasRequest } from './validation';

describe('Christmas party requests', () => {
  it('accepts valid phone and 1–8 requested places without promising a ticket', () => {
    expect(validateChristmasRequest({ name:'Awa Mensah', phone:'+229 01 23 45 67 89', email:'awa@example.com', places:4, consent:true })).toEqual({
      value:{ name:'Awa Mensah', phone:'+2290123456789', email:'awa@example.com', places:4 }
    });
  });

  it('rejects invalid seat counts, missing consent and malformed contacts', () => {
    const base = {name:'Awa Mensah', phone:'+2290123456789', email:'', places:2, consent:true};
    expect(validateChristmasRequest({...base,places:9})).toHaveProperty('error');
    expect(validateChristmasRequest({...base,places:0})).toHaveProperty('error');
    expect(validateChristmasRequest({...base,places:2.5})).toHaveProperty('error');
    expect(validateChristmasRequest({...base,consent:false})).toHaveProperty('error');
    expect(validateChristmasRequest({...base,phone:'abc'})).toHaveProperty('error');
    expect(validateChristmasRequest({...base,email:'invalid'})).toHaveProperty('error');
  });

  it('normalizes guest data safely', () => {
    expect(validateChristmasRequest({name:' Awa   Mensah ', phone:'  +229.01.234.567 ',email:' AWA@Example.com ',places:1,consent:true})).toEqual({
      value:{name:'Awa Mensah',phone:'+22901234567',email:'awa@example.com',places:1}
    });
  });
});
