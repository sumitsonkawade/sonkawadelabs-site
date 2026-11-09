const http = require('node:http');
const handler = require('serve-handler');
const config = require('./serve.json');

const legalBase = 'https://web-production-c8fc6.up.railway.app/static/legal/';
const legalPages = { privacy: 'privacy.html', terms: 'terms.html', refunds: 'refund.html', faq: 'faq.html' };

const server = http.createServer((request, response) => {
  const host = (request.headers.host || '').split(':')[0].toLowerCase();
  let path;
  try {
    path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    return response.end('Invalid URL.');
  }
  const phoneDomain = process.env.SITE === 'phone-munshi' || host === 'phonemunshi.com' || host === 'www.phonemunshi.com';
  if (host === 'www.phonemunshi.com') {
    response.writeHead(301, { Location: `https://phonemunshi.com${request.url}` });
    return response.end();
  }
  const legal = path.match(/^\/phone-munshi\/(privacy|terms|refunds|faq)(?:\/|\/index.html)?$/)
    || (phoneDomain && path.match(/^\/(privacy|terms|refunds|faq)(?:\/|\/index.html)?$/));
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
  const redirect = config.redirects.find(item => item.source === path);
  if (redirect) {
    response.writeHead(redirect.type, { Location: redirect.destination });
    return response.end();
  }
  // Publish only the introduction and Phone Munshi content, including its policy links.
  const publicPath = /^(?:\/|\/index.html|\/robots.txt|\/sitemap.xml|\/googlef05130026d779268.html|\/phone-munshi(?:\/|\/index.html)?|\/phone-munshi\/data-deletion(?:\/|\/index.html)?|\/assets\/(?:site\.(?:css|js)|phone-munshi\.css|phone-munshi\/(?:logo\.svg|app-icon\.png|business-assistant\.webp)))$/;
  if (!publicPath.test(path)) {
    const retired = /^\/(?:arzi|csc-pro|helpora|stocksaathi|products|thank-you)(?:\/|$)/i.test(path)
      || /\.pdf$/i.test(path) || path === '/invoice-sample.html';
    response.writeHead(retired ? 410 : 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end(retired ? 'This page has been removed.' : 'Page not found.');
  }
  const phoneHome = phoneDomain && (path === '/' || path === '/index.html');
  if (phoneHome) request.url = '/phone-munshi/index.html';
  return handler(request, response, { ...config, public: __dirname, directoryListing: false, ...(phoneHome ? { cleanUrls: false } : {}) }).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});

if (require.main === module) server.listen(process.env.PORT || 3000, '0.0.0.0');
module.exports = server;
