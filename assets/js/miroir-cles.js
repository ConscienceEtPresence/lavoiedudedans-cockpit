/* Cockpit · Miroir intérieur · Clés (codes-type) */
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth-guard.js';
import {
  collection, getDocs, getDoc, setDoc, doc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); logout(); });

const COL_CODES = 'codes-type';

/* === Codes MÉMORISABLES — mot évocateur + nombre court === */
const MOTS_CLES = [
  'aube', 'seuil', 'clarte', 'silence', 'oasis',
  'sentier', 'lumiere', 'rivage', 'eveil', 'instant',
  'origine', 'patience', 'douceur', 'horizon', 'sereine',
  'jardin', 'fleuve', 'colline', 'ruisseau', 'fontaine',
  'etoile', 'lune', 'aurore', 'crepuscule', 'pleine',
  'flamme', 'braise', 'cendre', 'argile', 'cristal',
  'perle', 'racine', 'feuille', 'graine', 'fruit',
  'matin', 'midi', 'soir', 'nuit', 'veille',
  'paix', 'joie', 'ferveur', 'grace', 'essence',
  'present', 'naissance', 'passage', 'eclat', 'echo',
  'roseau', 'cedre', 'tilleul', 'olivier', 'amandier',
  'colombe', 'hirondelle', 'cigale', 'biche', 'tortue'
];

function generateCode() {
  const mot = MOTS_CLES[Math.floor(Math.random() * MOTS_CLES.length)];
  const num = Math.floor(Math.random() * 900) + 10; // 10–909
  return `${mot}-${num}`;
}

async function generateUniqueCode(maxTries = 8) {
  for (let i = 0; i < maxTries; i++) {
    const candidate = generateCode();
    const snap = await getDoc(doc(db, COL_CODES, candidate));
    if (!snap.exists()) return candidate;
  }
  // si vraiment collision, on étend le nombre
  return `${MOTS_CLES[0]}-${Date.now().toString().slice(-6)}`;
}

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
    // Code éditable par l'admin : si vide, on génère un code mémorisable
    let codeId = document.getElementById('code-custom')?.value.trim();
    if (codeId) {
      codeId = codeId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
      // Vérifier que ce code n'existe pas déjà
      const existing = await getDoc(doc(db, COL_CODES, codeId));
      if (existing.exists()) {
        alert(`Le code "${codeId}" est déjà pris. Choisissez-en un autre ou laissez vide pour génération automatique.`);
        btn.disabled = false; btn.textContent = 'Créer la clé';
        return;
      }
    } else {
      codeId = await generateUniqueCode();
    }

    await setDoc(doc(db, COL_CODES, codeId), {
      prenom,
      prenomNorm: normPrenom(prenom),
      type: selectedType,
      langue,
      actif: true,
      creeLe: serverTimestamp()
    });
    document.getElementById('result').style.display = 'block';
    document.getElementById('result-id').textContent = codeId;
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
          <button class="codes-row__action" data-act="edit" title="Modifier">✏️</button>
          <button class="codes-row__action" data-act="copy" title="Copier le code">📋</button>
          <button class="codes-row__action" data-act="toggle" title="${c.actif === false ? 'Réactiver' : 'Désactiver'}">${c.actif === false ? '↻' : '⏸'}</button>
          <button class="codes-row__action" data-act="delete" title="Supprimer">🗑</button>
        </div>
      </div>
      <div class="codes-edit" id="edit-${esc(c.id)}" hidden></div>
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
        } else if (act === 'edit') {
          openEditForm(id, codes);
        } else if (act === 'delete') {
          if (!confirm(`Supprimer définitivement la clé de ${row.querySelector('.codes-row__prenom').textContent.trim()} ?\n(Les entrées du carnet ne sont PAS effacées.)`)) return;
          await deleteDoc(doc(db, COL_CODES, id));
          await refresh();
        }
      });
    });
  });
}

// === ÉDITION : prénom + type + renommage du code (préserve l'historique) ===
function openEditForm(id, codes) {
  const code = codes.find(c => c.id === id);
  if (!code) return;
  const box = document.getElementById(`edit-${id}`);
  if (!box) return;
  // Fermer si déjà ouvert
  if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `
    <div style="background:linear-gradient(170deg,#FFFDF4,#F7F1DC);border:1.5px solid var(--gold);border-radius:14px;padding:1.2rem 1.3rem;margin:.5rem 0 1rem;">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:var(--ink-title);margin:0 0 1rem;font-weight:500;">
        Modifier la clé <em style="color:var(--gold);font-style:italic">${esc(code.prenom)}</em>
      </h3>

      <div class="ck-field">
        <label class="ck-field__label" for="ed-prenom-${esc(id)}">Prénom</label>
        <input class="ck-input" id="ed-prenom-${esc(id)}" type="text" value="${esc(code.prenom)}" maxlength="60">
      </div>

      <div class="ck-field">
        <label class="ck-field__label" for="ed-type-${esc(id)}">Type ennéagramme</label>
        <select class="ck-input" id="ed-type-${esc(id)}">
          ${[1,2,3,4,5,6,7,8,9].map(t => `<option value="${t}" ${code.type==t?'selected':''}>Type ${t} — ${esc(TYPES_INFO[t].nom)}</option>`).join('')}
        </select>
      </div>

      <div class="ck-field">
        <label class="ck-field__label" for="ed-code-${esc(id)}">Code (l'identifiant que la personne saisit)</label>
        <input class="ck-input" id="ed-code-${esc(id)}" type="text" value="${esc(id)}" maxlength="40">
        <p style="font-size:.85rem;color:var(--ink-mute);font-style:italic;margin-top:.4rem;font-family:'Cormorant Garamond',serif;">
          Si vous changez le code, l'historique du carnet sera <strong style="color:var(--gold);font-style:normal">automatiquement transféré</strong> sur le nouveau code (aucune entrée perdue).
        </p>
      </div>

      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem;">
        <button class="ck-btn ck-btn--gold" id="ed-save-${esc(id)}">Enregistrer</button>
        <button class="ck-btn" id="ed-cancel-${esc(id)}">Annuler</button>
        <span id="ed-status-${esc(id)}" style="font-style:italic;color:var(--ink-mute);font-family:'Cormorant Garamond',serif;align-self:center;"></span>
      </div>
    </div>
  `;

  document.getElementById(`ed-cancel-${id}`).addEventListener('click', () => {
    box.hidden = true; box.innerHTML = '';
  });

  document.getElementById(`ed-save-${id}`).addEventListener('click', async () => {
    const newPrenom = document.getElementById(`ed-prenom-${id}`).value.trim();
    const newType   = parseInt(document.getElementById(`ed-type-${id}`).value, 10);
    let newCode     = document.getElementById(`ed-code-${id}`).value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const status    = document.getElementById(`ed-status-${id}`);

    if (!newPrenom) { alert('Le prénom est requis.'); return; }
    if (!newType || newType < 1 || newType > 9) { alert('Type invalide.'); return; }
    if (!newCode || newCode.length < 3) { alert('Le code doit faire au moins 3 caractères.'); return; }

    const sameCode = (newCode === id);
    status.textContent = 'Un instant…';

    try {
      if (sameCode) {
        // Mise à jour simple
        await updateDoc(doc(db, COL_CODES, id), {
          prenom: newPrenom,
          prenomNorm: normPrenom(newPrenom),
          type: newType
        });
      } else {
        // Renommage : créer le nouveau, copier l'historique, supprimer l'ancien
        const exists = await getDoc(doc(db, COL_CODES, newCode));
        if (exists.exists()) {
          alert(`Le code "${newCode}" est déjà pris. Choisissez-en un autre.`);
          status.textContent = '';
          return;
        }
        status.textContent = 'Création du nouveau code…';
        await setDoc(doc(db, COL_CODES, newCode), {
          prenom: newPrenom,
          prenomNorm: normPrenom(newPrenom),
          type: newType,
          langue: code.langue || 'fr',
          actif: code.actif !== false,
          creeLe: code.creeLe || null,
          ancienCode: id  // trace pour mémoire
        });

        // Copier la sous-collection 'jours/' de l'ancien vers le nouveau
        status.textContent = 'Transfert de l\'historique…';
        const joursSnap = await getDocs(collection(db, 'carnets-type', id, 'jours'));
        let copied = 0;
        for (const jd of joursSnap.docs) {
          await setDoc(doc(db, 'carnets-type', newCode, 'jours', jd.id), jd.data());
          copied++;
        }
        status.textContent = `${copied} jour${copied>1?'s':''} transféré${copied>1?'s':''}…`;

        // Supprimer les anciens documents : d'abord les jours, puis le code
        for (const jd of joursSnap.docs) {
          await deleteDoc(doc(db, 'carnets-type', id, 'jours', jd.id));
        }
        await deleteDoc(doc(db, COL_CODES, id));
      }
      status.textContent = '✓ enregistré';
      setTimeout(async () => { await refresh(); }, 500);
    } catch (err) {
      console.error(err);
      status.textContent = '';
      alert('Erreur : ' + err.message);
    }
  });
}

await refresh();

}); // fin requireAdmin async callback
