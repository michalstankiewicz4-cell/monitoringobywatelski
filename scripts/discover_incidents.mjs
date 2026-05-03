import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import crypto from 'node:crypto';

const PENDING_PATH = 'data/pending_incidents.json';
const APPROVED_PATH = 'data/approved_incidents.json';
const SEARCH_PHRASES_PATH = 'data/search_phrases.txt';

const DEFAULT_PHRASES = [
  'policja wypadek',
  'policyjny wypadek',
  'radiowoz wypadek',
  'policja kolizja',
  'radiowoz kolizja',
  'policja potracenie'
];

const CITY_COORDS = {
  'Warszawa': [52.2298, 21.0118],
  'Krakow': [50.0614, 19.9372],
  'Lodz': [51.7592, 19.456],
  'Wroclaw': [51.1079, 17.0385],
  'Poznan': [52.4064, 16.9252],
  'Gdansk': [54.352, 18.6466],
  'Szczecin': [53.4285, 14.5528],
  'Bydgoszcz': [53.1235, 18.0084],
  'Lublin': [51.2465, 22.5684],
  'Bialystok': [53.1325, 23.1688],
  'Katowice': [50.2649, 19.0238],
  'Gdynia': [54.5189, 18.5305],
  'Czestochowa': [50.8118, 19.1203],
  'Radom': [51.4027, 21.1471],
  'Torun': [53.0138, 18.5984],
  'Kielce': [50.8661, 20.6286],
  'Rzeszow': [50.0412, 21.9991],
  'Olsztyn': [53.7784, 20.4801],
  'Opole': [50.6751, 17.9213],
  'Zielona Gora': [51.9356, 15.5062],
  'Plock': [52.5463, 19.7065],
  'Elblag': [54.1522, 19.4045],
  'Walbrzych': [50.7714, 16.2843],
  'Wloclawek': [52.6482, 19.0678],
  'Tarnow': [50.0121, 20.9858],
  'Chorzow': [50.3058, 18.9742],
  'Koszalin': [54.1944, 16.1722],
  'Kalisz': [51.7611, 18.091],
  'Legnica': [51.207, 16.1619],
  'Siedlce': [52.1677, 22.2901],
  'Ostrowiec Swietokrzyski': [50.9299, 21.385],
  'Tychy': [50.135, 18.9951],
  'Gliwice': [50.2945, 18.6714],
  'Zabrze': [50.3249, 18.7857],
  'Sosnowiec': [50.2863, 19.1041],
  'Bielsko-Biala': [49.8224, 19.0469],
  'Slupsk': [54.4641, 17.0287],
  'Przemysl': [49.7833, 22.7673],
  'Suwalki': [54.1114, 22.9304],
  'Nowy Sacz': [49.6218, 20.6971]
};

const CITY_ALIASES = {
  'Białystok': 'Bialystok',
  'Łódź': 'Lodz',
  'Łodz': 'Lodz',
  'Wrocław': 'Wroclaw',
  'Poznań': 'Poznan',
  'Gdańsk': 'Gdansk',
  'Gdynia': 'Gdynia',
  'Szczecin': 'Szczecin',
  'Bydgoszcz': 'Bydgoszcz',
  'Lublin': 'Lublin',
  'Katowice': 'Katowice',
  'Kraków': 'Krakow',
  'Kielce': 'Kielce',
  'Rzeszów': 'Rzeszow',
  'Olsztyn': 'Olsztyn',
  'Opole': 'Opole',
  'Zielona Góra': 'Zielona Gora',
  'Toruń': 'Torun',
  'Częstochowa': 'Czestochowa',
  'Bielsko-Biała': 'Bielsko-Biala',
  'Nowy Sącz': 'Nowy Sacz',
  'Ostrowiec Świętokrzyski': 'Ostrowiec Swietokrzyski'
};

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title) {
  return normalizeSpaces((title || '').replace(/\s*[\-|–|—]\s*.*$/, ''));
}

function determineSeverity(text) {
  const value = stripDiacritics(text.toLowerCase());
  if (/(smiertel|zginal|nie zyje|ofiary smiertelne|tragedi)/.test(value)) return 3;
  if (/(rann|potrac|uderz|pijany|po poscigu|kolizj|wypadk)/.test(value)) return 2;
  return 1;
}

function pickCity(text) {
  const normalized = stripDiacritics(text);
  const entries = Object.entries(CITY_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, key] of entries) {
    const aliasNormalized = stripDiacritics(alias);
    const pattern = new RegExp(`\\b${aliasNormalized.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`, 'i');
    if (pattern.test(normalized)) return key;
  }
  return null;
}

function toIsoDate(raw) {
  if (!raw) return new Date().toISOString();
  // GDELT format: 20260501143200
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length >= 14) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const hh = digits.slice(8, 10);
    const mm = digits.slice(10, 12);
    const ss = digits.slice(12, 14);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }
  // RSS / HTTP date format: "Thu, 01 May 2026 14:32:00 GMT"
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function safeArray(filePath) {
  if (!existsSync(filePath)) return [];
  return readFile(filePath, 'utf8')
    .then((raw) => JSON.parse(raw))
    .catch(() => []);
}

async function loadSearchPhrases() {
  if (!existsSync(SEARCH_PHRASES_PATH)) return DEFAULT_PHRASES;
  try {
    const raw = await readFile(SEARCH_PHRASES_PATH, 'utf8');
    const phrases = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    return phrases.length ? phrases : DEFAULT_PHRASES;
  } catch {
    return DEFAULT_PHRASES;
  }
}

function buildId(url, title) {
  const hash = crypto.createHash('sha1').update(`${url}|${title}`).digest('hex').slice(0, 12);
  return `auto_${hash}`;
}

async function fetchGoogleNewsArticles(searchPhrases) {
  const results = [];
  // Bierzemy tylko polskie frazy — Google News PL dobrze je indeksuje
  const plPhrases = searchPhrases.filter(p => /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(p) && !/poland/i.test(p));
  for (const phrase of plPhrases.slice(0, 5)) {
    const q = encodeURIComponent(phrase);
    const url = `https://news.google.com/rss/search?q=${q}&hl=pl&gl=PL&ceid=PL:pl`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'monitoringobywatelski-bot/1.0' } });
      if (!res.ok) continue;
      const xml = await res.text();
      // Prosty parser RSS bez zewnętrznych bibliotek
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      for (const [, item] of items) {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link  = (item.match(/<link>(.*?)<\/link>/)   || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Google News';
        if (title && link) {
          results.push({ title, url: link, seendate: pubDate, domain: source, _source: 'gnews' });
        }
      }
    } catch (e) {
      console.warn(`Google News błąd dla frazy "${phrase}":`, e.message);
    }
  }
  console.log(`Google News zwrócił ${results.length} artykułów.`);
  return results;
}

async function fetchArticles(searchPhrases) {
  const phraseQuery = searchPhrases
    .map((p) => `"${p}"`)
    .join(' OR ');
  const query = encodeURIComponent(`(${phraseQuery})`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=75&format=json&sort=DateDesc`;
  console.log(`Zapytanie GDELT: ${decodeURIComponent(query).slice(0, 120)}…`);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'monitoringobywatelski-bot/1.0' }
  });
  if (!response.ok) {
    if (response.status === 429) {
      console.warn('GDELT rate limit (429). Skipping this run.');
      return null;
    }
    throw new Error(`GDELT request failed (${response.status})`);
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    console.warn('GDELT zwrócił nieprawidłowy JSON:', text.slice(0, 200));
    return [];
  }
  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  console.log(`GDELT zwrócił ${articles.length} artykułów.`);
  return articles;
}

async function main() {
  const searchPhrases = await loadSearchPhrases();

  const [pending, approved, gdeltArticles, gnewsArticles] = await Promise.all([
    safeArray(PENDING_PATH),
    safeArray(APPROVED_PATH),
    fetchArticles(searchPhrases),
    fetchGoogleNewsArticles(searchPhrases)
  ]);

  if (gdeltArticles === null && !gnewsArticles.length) {
    console.log('discover_ok');
    process.exit(0);
  }

  const articles = [...(gdeltArticles || []), ...gnewsArticles];

  const knownUrls = new Set([
    ...pending.map((x) => x.url),
    ...approved.map((x) => x.url)
  ].filter(Boolean));

  const additions = [];

  for (const article of articles) {
    const title = normalizeTitle(article.title || '');
    const url = article.url;
    if (!title || !url || knownUrls.has(url)) continue;

    const haystack = `${title} ${article.seendate || ''} ${article.domain || ''}`;
    const cityKey = pickCity(haystack);
    const coords = cityKey ? CITY_COORDS[cityKey] : [52.1, 19.4]; // fallback: centrum Polski
    const displayCity = cityKey || 'Polska (lokalizacja nieznana)';

    const severity = determineSeverity(title);
    const id = buildId(url, title);

    additions.push({
      id,
      title,
      type: 'crash',
      severity,
      date: toIsoDate(article.seendate),
      desc: `Automatycznie wykryte zgłoszenie. Lokalizacja orientacyjna: ${displayCity}.`,
      lat: coords[0],
      lng: coords[1],
      sources: [
        {
          name: article.domain || 'Artykuł',
          url
        }
      ],
      city: cityKey || null,
      needsReview: true,
      url,
      collectedAt: new Date().toISOString()
    });

    knownUrls.add(url);
  }

  if (!additions.length) {
    console.log('No new incidents discovered.');
    return;
  }

  const merged = [...additions, ...pending]
    .sort((a, b) => new Date(b.date || b.collectedAt) - new Date(a.date || a.collectedAt))
    .slice(0, 300);

  await writeFile(PENDING_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  console.log(`Discovered ${additions.length} new candidate incidents.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
