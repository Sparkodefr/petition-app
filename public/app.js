'use strict';

const PENDING_KEY = 'petitionPending';
const LEGACY_KEY = 'petitionSignatures'; // stockage de la v1 (localStorage uniquement)
const REJECTED_KEY = 'petitionRejected';

const $ = (id) => document.getElementById(id);
const form = $('petitionForm');
const submitBtn = $('submitBtn');

/* ---------- Stockage local (file d'attente hors-ligne) ---------- */

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  if (list.length) localStorage.setItem(key, JSON.stringify(list));
  else localStorage.removeItem(key);
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

// "23/09/2026 14:05:03" (toLocaleString fr-FR de la v1) -> ISO
function parseFrDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\D+(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value || '');
  if (!m) return new Date().toISOString();
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).toISOString();
}

// Les signatures collectées avec la v1 sont reprises dans la file d'envoi
function migrateLegacy() {
  const legacy = readList(LEGACY_KEY);
  if (!legacy.length) return;
  const pending = readList(PENDING_KEY);
  for (const s of legacy) {
    pending.push({
      id: newId(),
      nom: s.nom, prenom: s.prenom, adresse: s.adresse,
      telephone: s.telephone, email: s.email || '',
      signature: s.signature, createdAt: parseFrDate(s.date),
    });
  }
  writeList(PENDING_KEY, pending);
  localStorage.removeItem(LEGACY_KEY);
}

/* ---------- Synchronisation avec le serveur ---------- */

let serverCount = null;
let syncing = false;

function renderStatus() {
  const pending = readList(PENDING_KEY).length;
  $('count').textContent = serverCount === null ? '–' : serverCount;
  const status = $('syncStatus');
  if (pending) {
    status.textContent = `${pending} signature(s) en attente d'envoi`;
    status.className = 'sync-status pending';
  } else {
    status.textContent = serverCount === null ? 'Hors connexion' : 'Toutes les signatures sont enregistrées';
    status.className = 'sync-status';
  }
}

async function refreshCount() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    if (res.ok) serverCount = (await res.json()).count;
  } catch { /* hors-ligne */ }
  renderStatus();
}

async function flush() {
  if (syncing) return;
  syncing = true;
  try {
    for (const sig of readList(PENDING_KEY)) {
      let res;
      try {
        res = await fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sig),
        });
      } catch {
        break; // réseau indisponible : on réessaiera plus tard
      }
      if (res.ok) {
        serverCount = (await res.json()).count;
      } else if (res.status >= 500 || res.status === 429) {
        break;
      } else {
        // Refus définitif (données invalides) : mis de côté pour ne pas bloquer la file
        writeList(REJECTED_KEY, [...readList(REJECTED_KEY), sig]);
      }
      writeList(PENDING_KEY, readList(PENDING_KEY).filter((p) => p.id !== sig.id));
    }
  } finally {
    syncing = false;
    renderStatus();
  }
}

/* ---------- Zone de signature ---------- */

const canvas = $('signatureCanvas');
const ctx = canvas.getContext('2d');
let strokes = [];
let current = null;

function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  redraw();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rect = canvas.getBoundingClientRect();
  for (const stroke of strokes) {
    ctx.beginPath();
    stroke.forEach(([x, y], i) => {
      const px = x * rect.width;
      const py = y * rect.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    if (stroke.length === 1) ctx.lineTo(stroke[0][0] * rect.width + 0.1, stroke[0][1] * rect.height);
    ctx.stroke();
  }
}

function point(e) {
  const rect = canvas.getBoundingClientRect();
  return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  current = [point(e)];
  strokes.push(current);
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!current) return;
  e.preventDefault();
  current.push(point(e));
  redraw();
});

['pointerup', 'pointercancel'].forEach((type) =>
  canvas.addEventListener(type, () => { current = null; }));

function clearSignature() {
  strokes = [];
  redraw();
}

// Image de signature à taille fixe, fond blanc (lisible dans le PDF)
function signatureImage() {
  const out = document.createElement('canvas');
  out.width = 600;
  out.height = 200;
  const o = out.getContext('2d');
  o.fillStyle = '#fff';
  o.fillRect(0, 0, out.width, out.height);
  o.strokeStyle = '#111827';
  o.lineWidth = 3;
  o.lineCap = 'round';
  o.lineJoin = 'round';
  for (const stroke of strokes) {
    o.beginPath();
    stroke.forEach(([x, y], i) => (i === 0 ? o.moveTo(x * out.width, y * out.height) : o.lineTo(x * out.width, y * out.height)));
    if (stroke.length === 1) o.lineTo(stroke[0][0] * out.width + 0.1, stroke[0][1] * out.height);
    o.stroke();
  }
  return out.toDataURL('image/png');
}

$('clearBtn').addEventListener('click', clearSignature);
window.addEventListener('resize', setupCanvas);

/* ---------- Formulaire ---------- */

let messageTimer;
function showMessage(type, text) {
  const el = $('message');
  el.className = `message ${type}`;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(messageTimer);
  if (type !== 'error') messageTimer = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = (id) => $(id).value.trim();
  const data = {
    nom: value('nom'),
    prenom: value('prenom'),
    adresse: value('adresse'),
    telephone: value('telephone'),
    email: value('email'),
  };

  if (!data.nom || !data.prenom || !data.adresse || !data.telephone || !strokes.length) {
    showMessage('error', 'Veuillez renseigner tous les champs obligatoires et signer dans le cadre.');
    return;
  }
  if (data.email && !$('email').checkValidity()) {
    showMessage('error', "L'adresse email n'est pas valide.");
    return;
  }

  submitBtn.disabled = true;
  const sig = { id: newId(), ...data, signature: signatureImage(), createdAt: new Date().toISOString() };
  // Enregistrée d'abord sur la tablette : aucune perte si le réseau coupe pendant l'envoi
  writeList(PENDING_KEY, [...readList(PENDING_KEY), sig]);

  form.reset();
  clearSignature();
  await flush();
  submitBtn.disabled = false;

  if (readList(PENDING_KEY).some((p) => p.id === sig.id)) {
    showMessage('warning', 'Signature enregistrée sur cet appareil. Elle sera transmise automatiquement dès que la connexion sera rétablie.');
  } else {
    showMessage('success', 'Merci, votre signature a bien été enregistrée.');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- Démarrage ---------- */

migrateLegacy();
setupCanvas();
renderStatus();
refreshCount().then(flush);
window.addEventListener('online', flush);
setInterval(() => { flush(); refreshCount(); }, 30000);
