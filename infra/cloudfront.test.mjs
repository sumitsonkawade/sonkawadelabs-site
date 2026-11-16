import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {edgeCode,files,template} from './build-cloudfront.mjs';

function route(phone,uri,host=phone?'phonemunshi.com':'sonkawadelabs.in',querystring={}) {
  const context=vm.createContext({});vm.runInContext(edgeCode(phone),context);
  return context.handler({request:{uri,headers:{host:{value:host}},querystring}});
}
test('edge preserves both homepages, public paths, legal links, and query strings',()=>{
  for(const phone of [false,true]) {
    assert.equal(route(phone,'/').uri,'/index.html');
    for(const file of files) assert.notEqual(route(phone,'/'+encodeURI(file)).statusCode,404,file);
    assert.equal(route(phone,'/contact').headers.location.value,'https://sonkawadelabs.in/#contact');
    assert.equal(route(phone,'/arzi/privacy/').statusCode,410);
    assert.equal(route(phone,'/phone-munshi/terms/index.html').headers.location.value,'/static/legal/terms.html');
    assert.equal(route(phone,'/does-not-exist').statusCode,404);
    assert.equal(route(phone,'/server.js').statusCode,404);
    assert.equal(route(phone,'/invoice-template.html').statusCode,404);
    assert.equal(route(phone,'/phone-munshi/terms/').headers.location.value,'/static/legal/terms.html');
  }
  assert.equal(route(false,'/privacy').headers.location.value,'/phone-munshi/privacy/');
  assert.equal(route(true,'/privacy').headers.location.value,'/static/legal/privacy.html');
  assert.equal(route(true,'/','www.phonemunshi.com',{hello:{value:'1'}}).headers.location.value,'https://phonemunshi.com/?hello=1');
  assert.equal(route(false,'/products','sonkawadelabs.in',{x:{value:'a b'}}).headers.location.value,'https://sonkawadelabs.in/?x=a%20b#phone-munshi');
  assert.equal(template.Resources.StudioFreePlan.Properties.PlanTier,'FREE');
  assert.equal(template.Resources.PhoneFreePlan.Properties.PlanTier,'FREE');
});

test('legal pages use an HTTPS Google Cloud origin without leaving website domains',()=>{
  for (const phone of [false,true]) {
    for (const file of ['privacy.html','terms.html','refund.html','faq.html','index.html','legal.css','metadata.json']) {
      assert.equal(route(phone,'/static/legal/'+file).uri,'/static/legal/'+file);
    }
    assert.equal(route(phone,'/static/legal/private.txt').statusCode,404);
    assert.equal(route(phone,'/static/legal/../server.js').statusCode,404);
  }
  for (const name of ['Studio','Phone']) {
    const config=template.Resources[name+'Distribution'].Properties.DistributionConfig;
    const legal=config.CacheBehaviors.find(b=>b.PathPattern==='/static/legal/*');
    assert.equal(legal.TargetOriginId,'legal');
    assert.deepEqual(legal.CachePolicyId,{Ref:'LegalCachePolicyId'});
    assert.equal(config.Origins.find(o=>o.Id==='legal').CustomOriginConfig.OriginProtocolPolicy,'https-only');
  }
});
