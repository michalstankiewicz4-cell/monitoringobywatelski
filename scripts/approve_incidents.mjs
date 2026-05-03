import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PENDING_PATH = 'data/pending_incidents.json';
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

  const [pending, approved] = await Promise.all([
    loadArray(PENDING_PATH),
    loadArray(APPROVED_PATH)
  ]);

  const toApprove = pending.filter((item) => ids.includes(item.id));
  if (!toApprove.length) {
    throw new Error('Nie znaleziono pasujących id w pending_incidents.json');
  }

  const approvedIds = new Set(approved.map((x) => x.id));
  const actor = process.env.GITHUB_ACTOR || 'manual-review';

  const promoted = toApprove
    .filter((item) => !approvedIds.has(item.id))
    .map((item) => ({
      ...item,
      needsReview: false,
      approvedAt: new Date().toISOString(),
      approvedBy: actor
    }));

  const remaining = pending.filter((item) => !ids.includes(item.id));
  const nextApproved = [...promoted, ...approved]
    .sort((a, b) => new Date(b.date || b.approvedAt) - new Date(a.date || a.approvedAt));

  await Promise.all([
    writeFile(PENDING_PATH, `${JSON.stringify(remaining, null, 2)}\n`, 'utf8'),
    writeFile(APPROVED_PATH, `${JSON.stringify(nextApproved, null, 2)}\n`, 'utf8')
  ]);

  console.log(`Approved ${promoted.length} incidents, remaining pending: ${remaining.length}`);

  // Jeśli nie jesteśmy w CI (GitHub Actions robi push sam przez workflow),
  // commituj i pushuj lokalnie.
  if (!process.env.GITHUB_ACTIONS) {
    try {
      execSync(`git add ${PENDING_PATH} ${APPROVED_PATH}`, { stdio: 'inherit' });
      execSync(
        `git commit -m "Approve incidents: ${ids.join(', ')}"`,
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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
