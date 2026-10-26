// Mengambil paket "projectfiles.zip" dari link bagikan Alight Motion DI SERVER GitHub (tanpa batas CORS browser).
// Hasil ditulis ke ./out : <rid>.json (status + info) dan <rid>.p000, .p001, ... (potongan ZIP maks PART byte).
// Skrip ini TIDAK PERNAH gagal keras untuk masalah biasa: kegagalan ditulis sebagai <rid>.json {status:'error'} agar MotionLyn bisa menampilkannya.
import { writeFileSync, mkdirSync } from 'node:fs';

const FB = process.env.AM_FB || 'https://firebasestorage.googleapis.com';
const CF = process.env.AM_CF || 'https://us-central1-alight-creative.cloudfunctions.net';
const BUCKET = 'alight-creative.appspot.com';
const MAX_TOTAL = +process.env.AM_MAX || 300 * 1024 * 1024;   // batas total paket
const PART = +process.env.AM_PART || 40 * 1024 * 1024;        // ukuran tiap potongan (batas aman file Git: 100 MB)
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const SAFE = /^[A-Za-z0-9_-]{6,120}$/;

const LINK = String(process.env.AM_LINK || '').trim();
let RID = String(process.env.AM_RID || '').trim();
if (!SAFE.test(RID)) RID = '';
mkdirSync('out', { recursive: true });

const parse = s => {
  s = String(s || '').trim();
  let m = s.match(/\/u\/([^\/?#\s]+)\/p\/([^\/?#\s]+)/); if (m) return { uid: dec(m[1]), pid: dec(m[2]) };
  m = s.match(/^([A-Za-z0-9]{20,40}):([A-Za-z0-9_-]{10,60})$/); if (m) return { uid: m[1], pid: m[2] };
  return null;
};
const dec = v => { try { return decodeURIComponent(v); } catch { return v; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mb = n => (n / 1048576).toFixed(1);

async function retry(fn, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { err = e; if (e.fatal) throw e; await sleep(1500 * (i + 1)); } }
  throw err;
}

async function resolveShort(u) {
  u = u.replace(/^(?!https?:)/, 'https://');
  const res = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': UA } });
  return parse(res.url) || parse(res.headers.get('x-final-url') || '') || parse(await res.text());
}

async function getMeta({ uid, pid }) { // opsional
  try {
    const res = await fetch(CF + '/getProjectMetadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { uid, pid } }) });
    if (!res.ok) return null;
    const j = await res.json(), r = j && j.result, i = r && r.info; if (!i) return null;
    const max = r.freeUserMaxDownloadSize || 5242880;
    return { title: i.title || '', size: +i.size || 0, free: (+i.size || 0) <= max, max, downloads: i.downloads || 0,
      scenes: (i.projects || []).map(p => ({ title: p.title || '', size: +p.size || 0 })),
      effects: (i.requiredEffects || []).map(e => String(e).replace(/^com\.alightcreative\.(effects|internal)\./, '')) };
  } catch { return null; }
}

async function getPackage({ uid, pid }) {
  const path = encodeURIComponent('share/u/' + uid + '/p/' + pid + '/projectfiles.zip');
  const base = FB + '/v0/b/' + BUCKET + '/o/' + path;
  const mres = await retry(async () => {
    const r = await fetch(base, { headers: { 'User-Agent': UA } });
    if (r.status === 404 || r.status === 403) { const e = new Error('Paket tidak ditemukan / privat (HTTP ' + r.status + '). Pastikan link bagikan masih aktif.'); e.fatal = true; throw e; }
    if (!r.ok) throw new Error('Info paket: HTTP ' + r.status);
    return r.json();
  });
  const tok = mres && mres.downloadTokens && String(mres.downloadTokens).split(',')[0];
  if (!tok) { const e = new Error('Paket ini tidak punya token unduhan (mungkin privat atau bukan paket proyek)'); e.fatal = true; throw e; }
  if (+mres.size > MAX_TOTAL) { const e = new Error('Paket ' + mb(+mres.size) + ' MB melebihi batas server (' + mb(MAX_TOTAL) + ' MB)'); e.fatal = true; throw e; }
  return retry(async () => {
    const r = await fetch(base + '?alt=media&token=' + tok, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('Unduh paket: HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) throw new Error('respons kosong');
    return buf;
  });
}

const write = (key, obj) => writeFileSync('out/' + key + '.json', JSON.stringify(obj));

let key = RID || ('e' + Date.now().toString(36));
try {
  let ids = parse(LINK);
  if (!ids && /alight\.link|alightcreative\.com/i.test(LINK)) ids = await resolveShort(LINK);
  if (!ids) throw Object.assign(new Error('Link tidak dikenali. Pakai link bagikan lengkap (…/am/share/u/…/p/…) atau link alight.link.'), { fatal: true });
  if (!SAFE.test(ids.uid) || !SAFE.test(ids.pid)) throw Object.assign(new Error('uid/pid pada link tidak valid'), { fatal: true });
  key = RID || (ids.uid + '_' + ids.pid);
  if (!SAFE.test(key)) key = 'k' + Date.now().toString(36);

  console.log('Mengambil paket', ids.uid, ids.pid);
  const meta = await getMeta(ids);
  const buf = await getPackage(ids);
  if (buf.length > MAX_TOTAL) throw Object.assign(new Error('Paket ' + mb(buf.length) + ' MB melebihi batas server'), { fatal: true });

  const parts = Math.max(1, Math.ceil(buf.length / PART));
  for (let i = 0; i < parts; i++) writeFileSync('out/' + key + '.p' + String(i).padStart(3, '0'), buf.subarray(i * PART, Math.min(buf.length, (i + 1) * PART)));
  write(key, { status: 'ok', key, parts, size: buf.length, created: Date.now(), ids, meta });
  console.log('Selesai:', mb(buf.length), 'MB,', parts, 'potongan');
} catch (e) {
  console.error('GAGAL:', e && e.message);
  write(key, { status: 'error', key, message: String(e && e.message || e).slice(0, 400), created: Date.now() });
}
