/* Cockpit · Miroir intérieur · Clés (codes-type) */
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth-guard.js';
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); logout(); });

const COL_CODES = 'codes-type';

const TYPES_INFO = {
  1: { nom: "L'Idéaliste / Le Perfectionniste",       centre: 'instinctif' },
  2: { nom: "Le Donneur / L'Altruiste",               centre: 'émotionnel' },
  3: { nom: "Le Performeur / Le Battant",             centre: 'émotionnel' },
  4: { nom: "L'Individualiste / Le Romantique",       centre: 'émotionnel' },
  5: { nom: "L'Observateur / L'Investigateur",        centre: 'mental' },
  6: { nom: "Le Loyaliste / Le Sceptique",            centre: 'mental' },
  7: { nom: "L'Enthousiaste / L'Épicurien",           centre: 'mental' },
  8: { nom: "Le Meneur / Le Protecteur",              centre: 'instinctif' },
  9: { nom: "Le Médiateur / Le Pacifique",            centre: 'instinctif' }
};

function normPrenom(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let selectedType = null;

requireAdmin(async () => {

// === Sélecteur de type sur le diagramme ===
document.querySelectorAll('.ennea-picker__node').forEach(g => {
  g.addEventListener('click', () => {
    document.querySelectorAll('.ennea-picker__node').forEach(n => n.classList.remove('is-active'));
    g.classList.add('is-active');
    selectedType = parseInt(g.dataset.type, 10);
    const info = TYPES_INFO[selectedType];
    document.getElementById('type-nom').innerHTML = `Type <em>${selectedType}</em> — ${esc(info.nom)}`;
    document.getElementById('type-sub').textContent = `Centre ${info.centre}`;
  });
});

// === Création ===
document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prenom = document.getElementById('prenom').value.trim();
  const langue = document.getElementById('langue').value;
  if (!prenom)        { alert('Saisissez le prénom.'); return; }
  if (!selectedType)  { alert('Cliquez sur un type dans le diagramme.'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Un instant…';

  try {
    const ref = await addDoc(collection(db, COL_CODES), {
      prenom,
      prenomNorm: normPrenom(prenom),
      type: selectedType,
      langue,
      actif: true,
      creeLe: serverTimestamp()
    });
    document.getElementById('result').style.display = 'block';
    document.getElementById('result-id').textContent = ref.id;
    document.getElementById('prenom').value = '';
    selectedType = null;
    document.querySelectorAll('.ennea-picker__node').forEach(n => n.classList.remove('is-active'));
    document.getElementById('type-nom').innerHTML = '— choisissez un type —';
    document.getElementById('type-sub').textContent = '';
    await refresh();
  } catch (err) {
    console.error(err);
    alert('Erreur : ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Créer la clé';
  }
});

document.getElementById('copy-btn').addEventListener('click', async () => {
  const id = document.getElementById('result-id').textContent;
  try {
    await navigator.clipboard.writeText(id);
    document.getElementById('copy-btn').textContent = '✓ copié';
    setTimeout(() => document.getElementById('copy-btn').textContent = 'Copier le code', 1800);
  } catch {
    alert('Sélectionnez le code à la main pour le copier.');
  }
});

// === Liste + distribution ===
async function refresh() {
  const distribEl = document.getElementById('distrib');
  const listEl = document.getElementById('codes-list');

  const snap = await getDocs(collection(db, COL_CODES));
  const codes = [];
  snap.forEach(s => codes.push({ id: s.id, ...s.data() }));

  // Distribution
  const counts = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
  codes.forEach(c => { if (c.actif !== false && counts[c.type] !== undefined) counts[c.type]++; });
  distribEl.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const has = counts[i] > 0;
    distribEl.innerHTML += `
      <div class="ck-distrib__cell ${has?'has':''}">
        <div class="ck-distrib__num">Type ${i}</div>
        <div class="ck-distrib__count">${counts[i]}</div>
      </div>
    `;
  }

  // Liste
  codes.sort((a,b) => (b.creeLe?.seconds || 0) - (a.creeLe?.seconds || 0));
  if (!codes.length) {
    listEl.innerHTML = '<p style="text-align:center;color:var(--ink-mute);font-style:italic">Aucune clé créée pour l\'instant.</p>';
    return;
  }
  listEl.innerHTML = codes.map(c => {
    const date = c.creeLe ? new Date(c.creeLe.seconds * 1000).toLocaleDateString('fr-FR') : '—';
    const visite = c.derniereVisite ? new Date(c.derniereVisite.seconds * 1000).toLocaleDateString('fr-FR') : 'jamais';
    return `
      <div class="codes-row" data-id="${esc(c.id)}">
        <div class="codes-row__prenom">${esc(c.prenom)} ${c.actif === false ? '<em style="color:var(--ink-mute);font-size:.8rem">(désactivé)</em>' : ''}</div>
        <div class="codes-row__type">T${c.type || '?'}</div>
        <div class="codes-row__date">${date} · vu ${visite}</div>
        <div class="codes-row__code" title="${esc(c.id)}">${esc(c.id)}</div>
        <div class="codes-row__actions">
          <button class="codes-row__action" data-act="copy">📋</button>
          <button class="codes-row__action" data-act="toggle">${c.actif === false ? '↻' : '⏸'}</button>
          <button class="codes-row__action" data-act="delete">🗑</button>
        </div>
      </div>
    `;
  }).join('');

  // Actions par ligne
  listEl.querySelectorAll('.codes-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelectorAll('.codes-row__action').forEach(b => {
      b.addEventListener('click', async () => {
        const act = b.dataset.act;
        if (act === 'copy') {
          try { await navigator.clipboard.writeText(id); b.textContent = '✓'; setTimeout(() => b.textContent = '📋', 1500); } catch {}
        } else if (act === 'toggle') {
          const code = codes.find(c => c.id === id);
          await updateDoc(doc(db, COL_CODES, id), { actif: code.actif === false });
          await refresh();
        } else if (act === 'delete') {
          if (!confirm(`Supprimer définitivement la clé de ${row.querySelector('.codes-row__prenom').textContent.trim()} ?\n(Les entrées du carnet ne sont PAS effacées.)`)) return;
          await deleteDoc(doc(db, COL_CODES, id));
          await refresh();
        }
      });
    });
  });
}

await refresh();

}); // fin requireAdmin async callback
