import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const APPROVED_PATH = 'data/approved_incidents.json';

async function loadArray(path) {
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseIds(value) {
  return (value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  const ids = parseIds(process.env.INCIDENT_IDS);
  if (!ids.length) {
    throw new Error('Brak INCIDENT_IDS. Podaj listę id po przecinku.');
  }

  const approved = await loadArray(APPROVED_PATH);
  const idSet = new Set(ids);

  const found = approved.filter((x) => idSet.has(x.id));
  if (!found.length) {
    throw new Error('Nie znaleziono pasujących id w approved_incidents.json');
  }

  const remaining = approved.filter((x) => !idSet.has(x.id));

  await writeFile(APPROVED_PATH, `${JSON.stringify(remaining, null, 2)}\n`, 'utf8');

  console.log(`Usunięto ${found.length} incydentów. Pozostało na mapie: ${remaining.length}`);

  if (!process.env.GITHUB_ACTIONS) {
    try {
      execSync(`git add ${APPROVED_PATH}`, { stdio: 'inherit' });
      execSync(
        `git commit -m "Remove incidents: ${ids.join(', ')}"`,
        { stdio: 'inherit' }
      );
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('Zmiany wysłane na GitHub.');
    } catch (err) {
      console.error('git push nieudany:', err.message);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('BŁĄD:', err.message);
  process.exit(1);
});
