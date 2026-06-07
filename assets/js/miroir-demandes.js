/* Cockpit · Miroir intérieur · Demandes (demandes-type) */
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth-guard.js';
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); logout(); });

function normPrenom(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(t) {
  if (!t?.seconds) return '—';
  return new Date(t.seconds * 1000).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

// Construit un lien mailto: avec sujet + corps préremplis pour envoyer le code
function buildMailto(d) {
  const subject = encodeURIComponent(`Le miroir intérieur — votre clé personnelle`);
  const body = encodeURIComponent(
`Bonjour ${d.prenom},

Merci pour votre demande d'accès au Miroir intérieur.

Voici votre clé personnelle :

    ${d.codeAttribue}

Pour entrer dans votre carnet :
1. Rendez-vous sur https://lemiroirinterieur.fr/pages/carnet/entrer/
2. Saisissez votre prénom (${d.prenom}) et la clé ci-dessus
3. Vous arriverez sur votre carnet personnalisé pour le type ${d.typeDeclare}

Le carnet vous propose chaque jour un travail doux et précis sur votre type. Trois manières d'y entrer selon votre énergie : Léger, Posé, ou « Aujourd'hui était lourd ». Une page « Un instant » vous permet aussi de noter ce qui se passe à toute heure.

À très vite,
Brahms`
  );
  return `mailto:${encodeURIComponent(d.contact)}?subject=${subject}&body=${body}`;
}

let currentFilter = 'en-attente';
let allDemandes = [];

requireAdmin(async () => {

document.querySelectorAll('.filter-tab').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    currentFilter = b.dataset.f;
    renderList();
  });
});

async function load() {
  const snap = await getDocs(collection(db, 'demandes-type'));
  allDemandes = [];
  snap.forEach(s => allDemandes.push({ id: s.id, ...s.data() }));
  // tri par date desc
  allDemandes.sort((a,b) => (b.creeLe?.seconds || 0) - (a.creeLe?.seconds || 0));

  document.getElementById('cnt-en-attente').textContent = allDemandes.filter(d => d.statut === 'en-attente').length;
  document.getElementById('cnt-accepte').textContent    = allDemandes.filter(d => d.statut === 'accepte').length;
  document.getElementById('cnt-refuse').textContent     = allDemandes.filter(d => d.statut === 'refuse').length;
  document.getElementById('cnt-all').textContent        = allDemandes.length;

  renderList();
}

function renderList() {
  const list = document.getElementById('list');
  const filtered = currentFilter === 'all'
    ? allDemandes
    : allDemandes.filter(d => d.statut === currentFilter);

  if (!filtered.length) {
    list.innerHTML = `<p style="text-align:center;color:var(--ink-mute);font-style:italic;padding:2rem">Aucune demande ${currentFilter === 'en-attente' ? 'en attente' : currentFilter === 'all' ? '' : currentFilter}.</p>`;
    return;
  }

  list.innerHTML = filtered.map(d => `
    <div class="demande-card ${esc(d.statut)}" data-id="${esc(d.id)}">
      <div class="demande-card__head">
        <div>
          <span class="demande-card__nom">${esc(d.prenom)}</span>
          <span class="demande-card__type">Type ${d.typeDeclare}</span>
        </div>
        <span class="demande-card__date">${fmtDate(d.creeLe)}</span>
      </div>
      <div class="demande-card__contact">${esc(d.contact)}</div>
      ${d.message ? `<blockquote class="demande-card__message">${esc(d.message)}</blockquote>` : ''}
      <span class="demande-card__statut ${esc(d.statut)}">${d.statut === 'en-attente' ? 'en attente' : d.statut}</span>
      ${d.codeAttribue ? `
        <div class="key-result">
          <div class="key-result__label">Clé attribuée</div>
          <div class="key-result__id">${esc(d.codeAttribue)}</div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;">
            <button class="demande-card__actions button" data-act="copy-key" data-key="${esc(d.codeAttribue)}">📋 Copier la clé</button>
            ${d.contact && d.contact.includes('@') ? `
              <a class="demande-card__actions button" style="text-decoration:none;display:inline-flex;align-items:center;"
                 data-act="mail"
                 href="${buildMailto(d)}"
                 target="_blank" rel="noopener">📧 Envoyer le code par email</a>
            ` : ''}
          </div>
          <p class="key-result__hint">À transmettre à ${esc(d.prenom)} via ${esc(d.contact)}.</p>
        </div>
      ` : ''}
      <div class="demande-card__actions">
        ${d.statut === 'en-attente' ? `
          <button class="primary" data-act="accept">Accepter → créer la clé</button>
          <button data-act="refuse">Refuser</button>
        ` : ''}
        ${d.statut === 'accepte' && !d.envoye ? `
          <button data-act="mark-sent">Marquer "envoyé"</button>
        ` : ''}
        <button data-act="delete">Supprimer</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.demande-card').forEach(card => {
    const id = card.dataset.id;
    const demande = allDemandes.find(x => x.id === id);

    card.querySelectorAll('button[data-act]').forEach(b => {
      b.addEventListener('click', async () => {
        const act = b.dataset.act;

        if (act === 'copy-key') {
          try {
            await navigator.clipboard.writeText(b.dataset.key);
            b.textContent = '✓ copiée';
            setTimeout(() => b.textContent = '📋 Copier la clé', 1800);
          } catch {}
          return;
        }

        if (act === 'accept') {
          // 1. Créer le code dans codes-type
          // 2. Mettre à jour la demande avec statut accepte + codeAttribue
          if (!confirm(`Créer une clé pour ${demande.prenom} (Type ${demande.typeDeclare}) ?`)) return;
          b.disabled = true;
          b.textContent = 'Un instant…';
          try {
            const codeRef = await addDoc(collection(db, 'codes-type'), {
              prenom: demande.prenom,
              prenomNorm: normPrenom(demande.prenom),
              type: demande.typeDeclare,
              langue: demande.langue || 'fr',
              actif: true,
              demandeId: id,
              creeLe: serverTimestamp()
            });
            await updateDoc(doc(db, 'demandes-type', id), {
              statut: 'accepte',
              codeAttribue: codeRef.id,
              traiteeLe: serverTimestamp()
            });
            await load();
          } catch (err) {
            console.error(err);
            alert('Erreur : ' + err.message);
            b.disabled = false; b.textContent = 'Accepter → créer la clé';
          }
          return;
        }

        if (act === 'refuse') {
          if (!confirm(`Refuser la demande de ${demande.prenom} ?`)) return;
          await updateDoc(doc(db, 'demandes-type', id), {
            statut: 'refuse', traiteeLe: serverTimestamp()
          });
          await load();
          return;
        }

        if (act === 'mark-sent') {
          await updateDoc(doc(db, 'demandes-type', id), {
            envoye: true, envoyeLe: serverTimestamp()
          });
          await load();
          return;
        }

        if (act === 'delete') {
          if (!confirm(`Supprimer définitivement la demande de ${demande.prenom} ?`)) return;
          await deleteDoc(doc(db, 'demandes-type', id));
          await load();
        }
      });
    });
  });
}

await load();

}); // fin requireAdmin
