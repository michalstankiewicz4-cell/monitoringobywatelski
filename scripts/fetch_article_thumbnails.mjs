import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const approvedPath = join(__dirname, '..', 'approved_incidents.json');

const USER_AGENT = 'MonitoringObywatelski/1.0 (+https://monitoringobywatelski.pl/)';
const TIMEOUT = 15000;
const DEFAULT_THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Vector-based_example.svg/320px-Vector-based_example.svg.png';

function safeString(value) {
  return String(value || '').trim();
}

function extractOgImage(html) {
  const metaTag = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)
    || html.match(/<meta[^>]+name=["']og:image["'][^>]*>/i);
  if (!metaTag) return null;
  const urlMatch = metaTag[0].match(/content=["']([^"']+)["']/i);
  if (!urlMatch) return null;
  return urlMatch[1].trim();
}

function extractTwitterImage(html) {
  const metaTag = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*>/i);
  if (!metaTag) return null;
  const urlMatch = metaTag[0].match(/content=["']([^"']+)["']/i);
  if (!urlMatch) return null;
  return urlMatch[1].trim();
}

function normalizeUrl(url) {
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    redirect: 'follow',
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const text = await response.text();
  return text;
}

function getMaterialUrl(material) {
  if (!material) return null;
  if (material.url) return normalizeUrl(material.url);
  if (material.file && /^https?:\/\//i.test(material.file)) return normalizeUrl(material.file);
  return null;
}

function getExistingThumbnail(material) {
  return material.thumbnail || material.thumb || null;
}

async function resolveThumbnail(material) {
  if (!material) return null;
  const existing = getExistingThumbnail(material);
  if (existing) return existing;
  const url = getMaterialUrl(material);
  if (!url) return null;

  if (/youtube\.com|youtu\.be/i.test(url)) {
    const match = url.match(/(?:v=|\/youtu\.be\/)([A-Za-z0-9_\-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  }

  try {
    const html = await fetchHtml(url);
    return extractOgImage(html) || extractTwitterImage(html) || null;
  } catch (error) {
    console.warn(`Failed to fetch OG image for ${url}: ${error.message}`);
    return null;
  }
}

async function enrichMaterials(materials) {
  if (!Array.isArray(materials)) return materials;
  const enriched = [];
  for (const material of materials) {
    const url = getMaterialUrl(material);
    if (!url) {
      enriched.push(material);
      continue;
    }
    const thumb = await resolveThumbnail(material);
    enriched.push({ ...material, thumbnail: thumb || material.thumbnail || material.thumb || null });
  }
  return enriched;
}

(async () => {
  try {
    const content = await readFile(approvedPath, 'utf8');
    const data = JSON.parse(content);
    if (!Array.isArray(data)) throw new Error('approved_incidents.json musi zawierać tablicę');

    let updated = false;
    const enrichedData = [];

    for (const incident of data) {
      const materials = Array.isArray(incident.materials) ? incident.materials : [];
      if (!materials.length) {
        enrichedData.push(incident);
        continue;
      }
      const enrichedMaterials = await enrichMaterials(materials);
      const hasNewThumb = enrichedMaterials.some((mat, index) => mat.thumbnail && mat.thumbnail !== materials[index]?.thumbnail);
      if (hasNewThumb) {
        updated = true;
      }
      enrichedData.push({ ...incident, materials: enrichedMaterials });
    }

    if (!updated) {
      console.log('Brak nowych miniatur. Plik nie został zmieniony.');
      return;
    }

    await writeFile(approvedPath, JSON.stringify(enrichedData, null, 2) + '\n', 'utf8');
    console.log('Zaktualizowano approved_incidents.json z nowymi miniaturami.');
  } catch (error) {
    console.error('Błąd:', error.message);
    process.exit(1);
  }
})();
