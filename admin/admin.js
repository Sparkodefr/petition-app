'use strict';

const $ = (id) => document.getElementById(id);
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
let signatures = [];

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) node.append(child);
  return node;
}

let messageTimer;
function showMessage(type, text) {
  const m = $('message');
  m.className = `message ${type}`;
  m.textContent = text;
  m.style.display = 'block';
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { m.style.display = 'none'; }, 6000);
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const rows = $('rows');
  rows.replaceChildren();

  // Numéro = position dans la pétition (identique au PDF), conservé lors d'une recherche
  signatures.forEach((s, i) => {
    const haystack = `${s.nom} ${s.prenom} ${s.adresse} ${s.telephone} ${s.email}`.toLowerCase();
    if (q && !haystack.includes(q)) return;

    const del = el('button', { className: 'btn btn-danger', type: 'button', textContent: 'Supprimer' });
    del.addEventListener('click', () => remove(s, del));

    rows.append(el('tr', {}, [
      el('td', { className: 'num', textContent: String(i + 1) }),
      el('td', {}, [el('strong', { textContent: s.nom.toUpperCase() }), ` ${s.prenom}`]),
      el('td', { textContent: s.adresse }),
      el('td', {}, [s.telephone, el('br'), el('span', { className: 'small', textContent: s.email || '' })]),
      el('td', { textContent: dateFmt.format(new Date(s.createdAt)) }),
      el('td', { className: 'sig' }, el('img', {
        src: `/admin/api/signatures/${encodeURIComponent(s.id)}/signature`,
        alt: `Signature de ${s.prenom} ${s.nom}`,
        loading: 'lazy',
      })),
      el('td', { className: 'actions' }, del),
    ]));
  });

  $('count').textContent = signatures.length;
  $('empty').hidden = rows.children.length > 0;
  $('empty').textContent = signatures.length ? 'Aucun résultat pour cette recherche.' : 'Aucune signature.';
}

async function load() {
  const res = await fetch('/admin/api/signatures', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  signatures = (await res.json()).signatures;
  render();
}

async function remove(sig, button) {
  const label = `${sig.nom.toUpperCase()} ${sig.prenom} – ${sig.adresse}`;
  if (!confirm(`Supprimer définitivement la signature de :\n\n${label}\n\nCette action est irréversible.`)) return;

  button.disabled = true;
  try {
    const res = await fetch(`/admin/api/signatures/${encodeURIComponent(sig.id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    signatures = signatures.filter((s) => s.id !== sig.id);
    render();
    showMessage('success', `Signature supprimée : ${label}`);
  } catch (err) {
    button.disabled = false;
    showMessage('error', `Échec de la suppression (${err.message}).`);
  }
}

$('search').addEventListener('input', render);
load().catch((err) => showMessage('error', `Impossible de charger les signatures (${err.message}).`));
