const http = require('node:http');
const handler = require('serve-handler');
const config = require('./serve.json');

const legalBase = 'https://web-production-c8fc6.up.railway.app/static/legal/';
const legalPages = { privacy: 'privacy.html', terms: 'terms.html', refunds: 'refund.html', faq: 'faq.html' };

const server = http.createServer((request, response) => {
  const host = (request.headers.host || '').split(':')[0].toLowerCase();
  const path = new URL(request.url, 'http://localhost').pathname;
  const phoneDomain = process.env.SITE === 'phone-munshi' || host === 'phonemunshi.com' || host === 'www.phonemunshi.com';
  if (host === 'www.phonemunshi.com') {
    response.writeHead(301, { Location: `https://phonemunshi.com${request.url}` });
    return response.end();
  }
  const legal = path.match(/^\/phone-munshi\/(privacy|terms|refunds|faq)\/?$/)
    || (phoneDomain && path.match(/^\/(privacy|terms|refunds|faq)\/?$/));
  if (legal) {
    response.writeHead(302, { Location: legalBase + legalPages[legal[1]] });
    return response.end();
  }
  if (phoneDomain && path === '/robots.txt') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('User-agent: *\nAllow: /\nSitemap: https://phonemunshi.com/sitemap.xml\n');
  }
  if (phoneDomain && path === '/sitemap.xml') {
    response.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return response.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://phonemunshi.com/</loc></url></urlset>');
  }
  const phoneHome = phoneDomain && path === '/';
  if (phoneHome) request.url = '/phone-munshi/index.html';
  return handler(request, response, { ...config, public: __dirname, directoryListing: false, ...(phoneHome ? { cleanUrls: false } : {}) }).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});

if (require.main === module) server.listen(process.env.PORT || 3000, '0.0.0.0');
module.exports = server;
