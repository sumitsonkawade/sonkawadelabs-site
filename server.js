const http = require('node:http');
const handler = require('serve-handler');
const config = require('./serve.json');

const legalBase = 'https://phone-munshi-1062783566405.asia-south1.run.app/static/legal/';
const legalPages = { privacy: 'privacy.html', terms: 'terms.html', refunds: 'refund.html', faq: 'faq.html' };

const server = http.createServer(async (request, response) => {
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
  if (legal || path === '/phone-munshi/legal.css') {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      return response.end();
    }
    try {
      const file = legal ? legalPages[legal[1]] : 'legal.css';
      const upstream = await fetch(legalBase + file, { signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (!upstream.ok) throw new Error('Policy unavailable');
      let body = await upstream.text();
      if (legal) {
        const links = { 'index.html': '/', 'legal.css': '/phone-munshi/legal.css' };
        for (const [slug, filename] of Object.entries(legalPages)) links[filename] = `/phone-munshi/${slug}/`;
        body = body.replace(/href="(index\.html|legal\.css|privacy\.html|terms\.html|refund\.html|faq\.html)(#[^"]*)?"/g,
          (_, filename, fragment = '') => `href="${links[filename]}${fragment}"`);
      }
      response.writeHead(200, {
        'Content-Type': legal ? 'text/html; charset=utf-8' : 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      return response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end('This page is temporarily unavailable. Please try again.');
    }
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
