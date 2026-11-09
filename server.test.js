const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const server = require('./server');

test('domains publish only the introduction, Phone Munshi plans and related links', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const get = (host, path = '/') => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path, headers: { host } }, response => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    }).on('error', reject);
  });
  try {
    const phone = await get('phonemunshi.com');
    assert.equal(phone.status, 200);
    assert.match(phone.body, /Your calls, handled/);
    assert.match(phone.body, /₹999<span>\/month/);
    assert.match(phone.body, /₹3.50<span>\/minute/);
    assert.doesNotMatch(phone.body, /₹1,299|₹1,599|₹1,799/);
    const pricing = phone.body.split('<section id="pricing"')[1].split('</section>')[0];
    assert.match(pricing, /Includes GST/);
    assert.match(pricing, /only in the app/);
    assert.match(pricing, /No call minutes included/);
    assert.doesNotMatch(pricing, /<button|<form|href=|checkout|buy now/i);
    assert.doesNotMatch(phone.body, /whatsapp/i);
    for (const asset of ['logo.svg', 'app-icon.png', 'business-assistant.webp']) {
      assert.equal((await get('phonemunshi.com', '/assets/phone-munshi/' + asset)).status, 200);
    }
    const deletion = await get('phonemunshi.com', '/phone-munshi/data-deletion/');
    assert.equal(deletion.status, 200);
    assert.doesNotMatch(deletion.body, /whatsapp|Arzi|CSC Pro|Helpora|Wearly|StockSaathi/i);
    const studio = await get('sonkawadelabs.in');
    assert.match(studio.body, /<title>Sonkawade Labs/);
    assert.match(studio.body, /I’m Sumit Sonkawade/);
    assert.match(studio.body, /LIVE PRODUCT/);
    assert.doesNotMatch(studio.body, /Arzi|CSC Pro|Helpora|Wearly|StockSaathi|widget.js/i);
    assert.equal((await get('www.phonemunshi.com', '/?hello=1')).headers.location, 'https://phonemunshi.com/?hello=1');
    assert.equal((await get('phonemunshi.com', '/assets/phone-munshi.css')).status, 200);
    assert.equal((await get('phonemunshi.com', '/privacy')).headers.location, 'https://web-production-c8fc6.up.railway.app/static/legal/privacy.html');
    assert.equal((await get('sonkawadelabs.in', '/phone-munshi/terms/')).status, 302);
    assert.equal((await get('sonkawadelabs.in', '/privacy')).headers.location, '/phone-munshi/privacy/');
    assert.equal((await get('sonkawadelabs.in', '/pricing/')).headers.location, 'https://phonemunshi.com/#pricing');
    assert.equal((await get('phonemunshi.com', '/data-deletion')).headers.location, '/phone-munshi/data-deletion/');
    for (const path of ['/arzi/privacy/', '/csc-pro/terms/', '/helpora/privacy/', '/stocksaathi/privacy/', '/products/helpora/signup/', '/Samplle%20Invoice.pdf']) {
      assert.equal((await get('sonkawadelabs.in', path)).status, 410, path);
    }
    for (const path of ['/server.js', '/package.json', '/nim-preview/', '/infra/README.md']) {
      assert.equal((await get('sonkawadelabs.in', path)).status, 404, path);
    }
    const sitemap = await get('sonkawadelabs.in', '/sitemap.xml');
    assert.doesNotMatch(sitemap.body, /arzi|csc-pro|helpora|stocksaathi|thank-you/i);
    assert.match((await get('phonemunshi.com', '/sitemap.xml')).body, /https:\/\/phonemunshi.com\//);
    assert.equal((await get('phonemunshi.com', '/does-not-exist')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
