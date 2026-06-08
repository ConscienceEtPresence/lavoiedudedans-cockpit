/* ============================================================
   Auth Guard — DÉSACTIVÉ
   Le cockpit n'a plus de connexion Google. Le carnet est ouvert
   sans mot de passe, le cockpit est accessible directement.
   Cette fonction est conservée pour ne pas casser les imports.
   ============================================================ */

export function requireAdmin(onReady) {
  // Plus de blocage : on appelle directement le callback
  document.body.classList.remove('cockpit-loading');
  if (typeof onReady === 'function') {
    // Simule un "user" minimal pour compat
    onReady({ email: 'admin@local', uid: 'admin' });
  }
}

export function logout() {
  // Plus de logout — le cockpit est ouvert
  window.location.href = './index.html';
}
