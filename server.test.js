const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const server = require('./server');

test('domains serve their own homepages and preserve studio routes', async () => {
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
    assert.doesNotMatch(phone.body, /whatsapp/i);
    for (const asset of ['logo.svg', 'app-icon.png', 'business-assistant.webp']) {
      assert.equal((await get('phonemunshi.com', '/assets/phone-munshi/' + asset)).status, 200);
    }
    assert.doesNotMatch((await get('phonemunshi.com', '/phone-munshi/data-deletion/')).body, /whatsapp/i);
    assert.match((await get('sonkawadelabs.in')).body, /<title>Sonkawade Labs/);
    assert.equal((await get('www.phonemunshi.com', '/?hello=1')).headers.location, 'https://phonemunshi.com/?hello=1');
    assert.equal((await get('phonemunshi.com', '/assets/phone-munshi.css')).status, 200);
    assert.equal((await get('phonemunshi.com', '/privacy')).headers.location, 'https://web-production-c8fc6.up.railway.app/static/legal/privacy.html');
    assert.equal((await get('sonkawadelabs.in', '/phone-munshi/terms/')).status, 302);
    assert.equal((await get('sonkawadelabs.in', '/privacy')).headers.location, '/csc-pro/privacy/');
    assert.match((await get('phonemunshi.com', '/sitemap.xml')).body, /https:\/\/phonemunshi.com\//);
    assert.equal((await get('phonemunshi.com', '/does-not-exist')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
