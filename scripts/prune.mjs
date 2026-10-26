// Bersihkan cache: hapus hasil lebih dari 24 jam, dan sisakan paling banyak 40 hasil terbaru.
import { readdirSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'cache/r';
if (!existsSync(dir)) process.exit(0);
const DAY = 24 * 3600 * 1000, KEEP = 40, now = Date.now();
const files = readdirSync(dir);
const items = files.filter(f => f.endsWith('.json')).map(f => {
  let created = 0; try { created = +JSON.parse(readFileSync(join(dir, f), 'utf8')).created || 0; } catch { /* rusak: dianggap lama */ }
  return { key: f.slice(0, -5), created };
}).sort((a, b) => b.created - a.created);
const drop = new Set(items.filter((it, i) => now - it.created > DAY || i >= KEEP).map(it => it.key));
const known = new Set(items.map(it => it.key));
for (const f of files) {
  const key = f.replace(/\.(json|p\d{3})$/, '');
  if (drop.has(key) || !known.has(key)) { try { unlinkSync(join(dir, f)); } catch { /* abaikan */ } }
}
console.log('prune: hapus', drop.size, 'hasil lama; tersisa', items.length - drop.size);
