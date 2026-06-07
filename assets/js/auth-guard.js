/* ============================================================
   Auth Guard — protège les pages du cockpit
   À utiliser sur toutes les pages SAUF index.html (la connexion).
   ============================================================ */
import { auth, ALLOWED_EMAILS } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export function requireAdmin(onReady) {
  // Bloque tant qu'on ne sait pas qui est connecté
  document.body.classList.add('cockpit-loading');

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // pas connecté → retour à la page de connexion
      window.location.href = './index.html';
      return;
    }
    if (!ALLOWED_EMAILS.includes(user.email)) {
      // connecté mais pas autorisé → refus poli
      document.body.classList.remove('cockpit-loading');
      document.body.innerHTML = `
        <div class="cockpit-deny">
          <h1>Accès réservé</h1>
          <p>Ce tableau de bord est réservé à l'intendance du carnet du dedans.</p>
          <p class="cockpit-deny__email">${user.email}</p>
          <button id="signout-deny">Se déconnecter</button>
        </div>
      `;
      document.getElementById('signout-deny').addEventListener('click', () => signOut(auth));
      return;
    }
    // OK → on passe la main à la page
    document.body.classList.remove('cockpit-loading');
    if (typeof onReady === 'function') onReady(user);
  });
}

export function logout() {
  signOut(auth).then(() => { window.location.href = './index.html'; });
}
