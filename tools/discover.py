#!/usr/bin/env python3
"""Bounded, read-only discovery of public official Life Makeover download links."""
import datetime, hashlib, html, http.client, ipaddress, json, pathlib, re, socket, ssl, time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

ROOT = 'https://mystyle.archosaur.com/'
ALLOWED = ('archosaur.com', 'zulong.com')
MAX_BYTES = 2 * 1024 * 1024
MAX_REQUESTS = 32
OUT = pathlib.Path('out')
(OUT / 'raw').mkdir(parents=True, exist_ok=True)
count = 0

def checked(raw):
    p = urlsplit(raw)
    h = (p.hostname or '').lower()
    if p.scheme != 'https' or p.username or p.password or p.port not in (None, 443):
        raise ValueError('HTTPS/default-port/no-credentials required')
    if not any(h == r or h.endswith('.' + r) for r in ALLOWED):
        raise ValueError('host_not_allowed: ' + h)
    addresses = socket.getaddrinfo(h, 443, type=socket.SOCK_STREAM)
    ips = list(dict.fromkeys(x[4][0] for x in addresses))
    if not ips or any(not ipaddress.ip_address(x).is_global for x in ips):
        raise ValueError('non_public_address')
    return p, ips[0]

class PinnedTLS(http.client.HTTPSConnection):
    def __init__(self, host, ip):
        super().__init__(host, timeout=12, context=ssl.create_default_context())
        self.target_ip = ip
    def connect(self):
        sock = socket.create_connection((self.target_ip, 443), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)

def request(url, method='GET', sample=False):
    global count
    original = url
    trail = []
    for hop in range(3):
        if count >= MAX_REQUESTS:
            raise RuntimeError('request_budget_exhausted')
        p, ip = checked(url)
        count += 1
        c = PinnedTLS(p.hostname, ip)
        started = time.monotonic()
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (compatible; YSL-Resource-Inspector/0.1)', 'Accept-Encoding': 'identity', 'Accept': '*/*'}
            if sample:
                headers['Range'] = 'bytes=0-127'
            path = urlunsplit(('', '', p.path or '/', p.query, ''))
            c.request(method, path, headers=headers)
            r = c.getresponse()
            hs = {k.lower(): v for k, v in r.getheaders()}
            trail.append({'url': url, 'status': r.status})
            if r.status in (301, 302, 303, 307, 308) and hs.get('location'):
                url = urljoin(url, hs['location'])
                if hop == 2:
                    raise ValueError('redirect_limit')
                continue
            cap = 128 if sample else MAX_BYTES
            data = b''
            if method != 'HEAD':
                # A sample always stops after 128 bytes, even when Range is ignored.
                pieces = []
                remaining = cap if sample else cap + 1
                while remaining:
                    if time.monotonic() - started > 20:
                        raise TimeoutError('body_deadline')
                    part = r.read(min(65536, remaining))
                    if not part:
                        break
                    pieces.append(part)
                    remaining -= len(part)
                data = b''.join(pieces)
                if not sample and len(data) > cap:
                    raise ValueError('response_too_large')
            return {'url': original, 'finalUrl': url, 'status': r.status, 'headers': hs, 'redirects': trail, 'sampleOnly': sample, 'rangeHonored': r.status == 206 if sample else None}, data
        finally:
            c.close()
    raise RuntimeError('unreachable')

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.attrs = []
    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if v and k in ('src', 'href', 'data-href', 'data-url', 'data-src', 'data-download', 'onclick'):
                self.attrs.append((tag, k, v))

def clean(s):
    s = html.unescape(s).replace('\\/', '/')
    s = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m[1], 16)), s)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m[1], 16)), s)
    return s.strip()

def candidates(text, base):
    parser = Links()
    try: parser.feed(text)
    except Exception: pass
    vals = [(v, tag + ':' + k) for tag, k, v in parser.attrs]
    for m in re.finditer(r'''["']([^"'\r\n]{1,2048})["']''', text):
        s = clean(m[1])
        if s.startswith(('https://', 'http://', '//', '/', './', '../')) or re.search(r'\.(?:js|apk|xapk|apks|exe|zip|7z|json|ini|manifest)(?:\?|$)', s, re.I):
            vals.append((s, text[max(0, m.start()-80):m.start()].replace('\n', ' ')))
    result = {}
    for value, context in vals:
        value = clean(value)
        if any(c in value for c in ('\x00', '\n', '<', '>')) or len(value) > 2048:
            continue
        u = urljoin(base, value)
        p = urlsplit(u)
        if p.scheme not in ('https', 'http'):
            continue
        if p.username or p.password:
            continue
        u = urlunsplit((p.scheme, p.netloc, p.path, p.query, ''))
        if u not in result:
            result[u] = {'url': u, 'discoveredFrom': base, 'context': context[-100:]}
    return list(result.values())

def main():
    result = {'schemaVersion': 1, 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'root': ROOT, 'sources': [], 'downloads': [], 'manifestCandidates': [], 'otherHosts': [], 'gameCatalog': {'state': 'not_obtained', 'items': [], 'coverage': 'unknown'}, 'errors': []}
    todo = [ROOT]
    visited = set(); found = {}
    while todo and len(visited) < 9 and count < MAX_REQUESTS:
        u = todo.pop(0)
        if u in visited: continue
        visited.add(u)
        try:
            meta, data = request(u)
            name = hashlib.sha256(u.encode()).hexdigest()[:16] + ('.html' if u == ROOT else '.js')
            (OUT / 'raw' / name).write_bytes(data)
            meta.update({'bytesRead': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'localEvidence': 'raw/' + name})
            result['sources'].append(meta)
            if meta['status'] != 200: continue
            text = data.decode('utf-8', 'replace')
            if u == ROOT:
                title = re.search(r'<title[^>]*>(.*?)</title>', text, re.I | re.S)
                result['websiteTitleNotResourceVersion'] = html.unescape(title[1].strip()) if title else None
            for item in candidates(text, meta['finalUrl']):
                v = item['url']; found.setdefault(v, item)
                p = urlsplit(v); host = (p.hostname or '').lower()
                allowed = p.scheme == 'https' and any(host == r or host.endswith('.'+r) for r in ALLOWED)
                if p.path.lower().endswith('.js') and allowed and v not in visited:
                    if not re.search(r'jquery|swiper|analytics|hm\.baidu|gtag|eruda', p.path, re.I):
                        todo.append(v)
            print('SOURCE', meta['status'], len(data), u, flush=True)
        except Exception as e:
            result['errors'].append({'url': u, 'error': str(e)})
            print('ERROR', u, str(e), flush=True)
    for v, item in found.items():
        p = urlsplit(v)
        if re.search(r'\.(?:apk|xapk|apks|exe|zip|7z|rar|msi)(?:$)', p.path, re.I) or re.search(r'download|apkurl|pcurl|androidurl', item['context'], re.I):
            result['downloads'].append(item)
        elif re.search(r'\.(?:json|ini|manifest|xml|txt)$', p.path, re.I) and re.search(r'version|patch|update|manifest|config', v + item['context'], re.I):
            result['manifestCandidates'].append(item)
        if not any((p.hostname or '').lower() == r or (p.hostname or '').lower().endswith('.'+r) for r in ALLOWED):
            if re.search(r'\.(?:apk|exe|zip|js|json)$', p.path, re.I):
                result['otherHosts'].append(item)
    for item in result['downloads'][:6]:
        if count + 2 > MAX_REQUESTS: break
        try:
            meta, _ = request(item['url'], method='HEAD')
            item['head'] = meta
            sample, data = request(item['url'], sample=True)
            item['probe'] = sample
            item['first128Hex'] = data.hex()
            item['magic'] = 'ZIP' if data[:4] in (b'PK\x03\x04', b'PK\x05\x06') else 'PE executable' if data[:2] == b'MZ' else 'PNG' if data[:8] == b'\x89PNG\r\n\x1a\n' else 'unknown'
        except Exception as e:
            item['probeError'] = str(e)
        print('DOWNLOAD', json.dumps(item, ensure_ascii=False), flush=True)
    result['requestsUsed'] = count
    (OUT / 'discovery.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('SUMMARY', json.dumps({k: v for k, v in result.items() if k not in ('sources', 'downloads')}, ensure_ascii=False), flush=True)
    print('ALL_LINKS', json.dumps(list(found.values()), ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
