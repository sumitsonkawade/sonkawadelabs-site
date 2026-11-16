"""Verify domains against CloudFront before DNS changes, preserving TLS SNI and Host."""
import argparse
import concurrent.futures
import hashlib
import http.client
import json
from pathlib import Path
import socket
import ssl
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


def fetch(host, edge, path):
    connection = http.client.HTTPSConnection(host, timeout=30)
    if edge:
        connection.sock = ssl.create_default_context().wrap_socket(
            socket.create_connection((edge, 443), timeout=30), server_hostname=host)
    try:
        connection.request('GET', path, headers={'Host': host})
        response = connection.getresponse()
        return response.status, {key.lower(): value for key, value in response.getheaders()}, response.read()
    finally:
        connection.close()


def verify(site, host, edge):
    folder = ROOT / '.aws-build-current' / site
    def check(path):
        relative = path.relative_to(folder).as_posix()
        uri = '/' if relative == 'index.html' else '/' + quote(relative)
        status, headers, body = fetch(host, edge, uri)
        assert status == 200, (host, uri, status)
        assert hashlib.sha256(body).digest() == hashlib.sha256(path.read_bytes()).digest(), (host, uri, 'content mismatch')
        assert 'cloudfront' in headers.get('via', '').lower(), (host, uri, 'not served by CloudFront')
        return uri
    paths = list(folder.rglob('*'))
    paths = [p for p in paths if p.is_file()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        checked = list(pool.map(check, paths))
    for uri, expected in [('/privacy', '/static/legal/privacy.html' if site == 'phone' else '/phone-munshi/privacy/'),('/phone-munshi/terms/', '/static/legal/terms.html')]:
        status, headers, body = fetch(host, edge, uri)
        assert status in (301, 302) and headers.get('location') == expected, (host, uri, status, headers)
    for file in ['privacy.html', 'terms.html', 'refund.html', 'faq.html', 'index.html', 'legal.css', 'metadata.json']:
        uri = '/static/legal/' + file
        status, headers, body = fetch(host, edge, uri)
        assert status == 200 and 'location' not in headers, (host, uri, status, headers)
        assert 'cloudfront' in headers.get('via', '').lower(), (host, uri, 'not served by CloudFront')
        if file.endswith('.html'):
            assert b'<html' in body.lower(), (host, uri, 'not HTML')
            assert b'.run.app' not in body, (host, uri, 'server URL exposed')
        elif file == 'legal.css':
            assert 'text/css' in headers.get('content-type', ''), (host, uri, 'stylesheet type')
    for uri in ['/does-not-exist', '/server.js', '/invoice-template.html', '/static/legal/private.txt']:
        assert fetch(host, edge, uri)[0] == 404, (host, uri)
    status, headers, body = fetch('www.' + host, edge, '/?hello=1')
    if site == 'phone':
        assert status == 301 and headers.get('location') == 'https://phonemunshi.com/?hello=1'
    else:
        assert status == 200 and body == (folder/'index.html').read_bytes()
    return {'domain':host,'edge':edge,'filesMatched':len(checked),'redirectsAnd404s':'passed'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--studio-edge')
    parser.add_argument('--phone-edge')
    args = parser.parse_args()
    print(json.dumps([
        verify('studio','sonkawadelabs.in',args.studio_edge),
        verify('phone','phonemunshi.com',args.phone_edge),
    ],indent=2))
