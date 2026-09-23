// Serveur de la pétition : page statique, API de collecte et export PDF.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from './storage.js';
import { renderPetitionPdf } from './pdf.js';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const MAX_BODY = 512 * 1024;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'",
};

let store;
try {
  store = createStore(DATA_DIR);
} catch (err) {
  console.error(`[fatal] Dossier de données inaccessible en écriture : ${DATA_DIR} (${err.code})`);
  process.exit(1);
}
if (!ADMIN_PASSWORD) console.warn('[warn] ADMIN_PASSWORD non défini : export PDF désactivé');
console.log(`[storage] ${store.count()} signature(s) chargée(s) depuis ${store.file}`);

// Fichiers statiques chargés une fois au démarrage
const staticFiles = new Map();
for (const name of fs.readdirSync(PUBLIC_DIR)) {
  const ext = path.extname(name);
  if (MIME[ext]) staticFiles.set(`/${name}`, { body: fs.readFileSync(path.join(PUBLIC_DIR, name)), type: MIME[ext] });
}
staticFiles.set('/', staticFiles.get('/index.html'));

// Limitation simple des envois par IP (anti-spam)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 60;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    return false;
  }
  return ++entry.n > RATE_MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of hits) if (now - e.start > RATE_WINDOW_MS) hits.delete(ip);
}, RATE_WINDOW_MS).unref();

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

function clientIp(req) {
  return (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .toString().split(',')[0].trim();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validateSignature(input) {
  const sig = {
    id: str(input.id, 64),
    nom: str(input.nom, 100),
    prenom: str(input.prenom, 100),
    adresse: str(input.adresse, 300),
    telephone: str(input.telephone, 30),
    email: str(input.email, 200),
    signature: typeof input.signature === 'string' ? input.signature : '',
    createdAt: str(input.createdAt, 40),
  };
  if (!/^[\w-]{8,64}$/.test(sig.id)) return 'Identifiant invalide';
  if (!sig.nom || !sig.prenom || !sig.adresse || !sig.telephone) return 'Champs obligatoires manquants';
  if (sig.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sig.email)) return 'Email invalide';
  if (!sig.signature.startsWith('data:image/png;base64,') || sig.signature.length > 400 * 1024) return 'Signature invalide';
  const created = Date.parse(sig.createdAt);
  // Date de signature fournie par la tablette (peut être antérieure si signée hors-ligne)
  if (Number.isNaN(created) || created > Date.now() + 5 * 60 * 1000) sig.createdAt = new Date().toISOString();
  sig.receivedAt = new Date().toISOString();
  return sig;
}

function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const expected = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`);
  const given = Buffer.from(Buffer.from(encoded, 'base64').toString('utf8'));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /health') return send(res, 200, 'ok\n', { 'Content-Type': 'text/plain' });

  if (route === 'GET /api/stats') return json(res, 200, { count: store.count() });

  if (route === 'POST /api/signatures') {
    if (rateLimited(clientIp(req))) return json(res, 429, { error: 'Trop de requêtes, réessayez plus tard' });
    let input;
    try {
      input = JSON.parse(await readBody(req));
    } catch (err) {
      return json(res, err.status || 400, { error: 'Requête invalide' });
    }
    const sig = validateSignature(input || {});
    if (typeof sig === 'string') return json(res, 400, { error: sig });
    const created = store.add(sig);
    return json(res, created ? 201 : 200, { ok: true, count: store.count() });
  }

  if (route === 'GET /admin/export.pdf') {
    if (!ADMIN_PASSWORD) return send(res, 503, 'Export désactivé : définir ADMIN_PASSWORD\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    if (!isAdmin(req)) {
      await new Promise((r) => setTimeout(r, 1000));
      return send(res, 401, 'Authentification requise\n', {
        'Content-Type': 'text/plain; charset=utf-8',
        'WWW-Authenticate': 'Basic realm="Export petition", charset="UTF-8"',
      });
    }
    const day = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="petition-agro-bioenergies-${day}.pdf"`,
      'Cache-Control': 'no-store',
    });
    return renderPetitionPdf(store.all(), res);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const file = staticFiles.get(url.pathname);
    if (file) return send(res, 200, req.method === 'HEAD' ? undefined : file.body, { 'Content-Type': file.type, 'Cache-Control': 'no-cache' });
  }

  return send(res, 404, 'Not found\n', { 'Content-Type': 'text/plain' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('[error]', err);
    if (!res.headersSent) json(res, 500, { error: 'Erreur serveur' });
    else res.destroy();
  });
});

server.listen(PORT, () => console.log(`[server] http://0.0.0.0:${PORT}`));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
