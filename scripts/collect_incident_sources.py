import urllib.parse
import urllib.request
import re
from html import unescape

queries = [
    'Śmierć Olka z Grudziądza',
    'Olek Grudziądz TVN Uwaga',
    'Olek Grudziądz śmierć 19-latka',
    'Olek Grudziądz proces',
    'Olek Grudziądz YouTube',
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}


def fetch(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='ignore')


def extract_links(html, base=None):
    urls = []
    for m in re.finditer(r'href=["\\]?([^"\s>]+)', html):
        u = m.group(1)
        if u.startswith('/url?') or 'uddg=' in u:
            q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('uddg')
            if q: u = q[0]
            else: continue
        if base and u.startswith('/'):
            u = urllib.parse.urljoin(base, u)
        if u.startswith('http'):
            urls.append(unescape(u))
    return urls


def unique(iterable):
    seen = set()
    for item in iterable:
        if item in seen: continue
        seen.add(item)
        yield item


if __name__ == '__main__':
    all_links = []
    for q in queries:
        print('QUERY:', q)
        qenc = urllib.parse.quote_plus(q)
        url = f'https://html.duckduckgo.com/html/?q={qenc}'
        html = fetch(url)
        links = extract_links(html, base=url)
        for link in unique(links):
            if any(host in link for host in ['tvn24.pl', 'uwaga.tvn.pl', 'fakt.pl', 'pomorska.pl', 'bydgoszcz.tvp.pl', 'eska.pl', 'facebook.com', 'youtube.com', 'youtu.be']):
                print(link)
        print()

    print('YOUTUBE SEARCH')
    q = 'Śmierć Olka z Grudziądza'
    url = 'https://www.youtube.com/results?search_query=' + urllib.parse.quote_plus(q)
    html = fetch(url)
    vids = re.findall(r'"url":"(/watch\?v=[^"]+)"', html)
    seen = set()
    for v in vids:
        full = 'https://www.youtube.com' + v
        if full not in seen:
            seen.add(full)
            print(full)
