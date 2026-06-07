/* Cockpit · Pulsation — lit les compteurs analytics anonymes */
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth-guard.js';
import { collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); logout(); });

const SITES = [
  { id: 'lavoiedudedans',   nom: 'La <em>voie du dedans</em>',  url: 'https://lavoiedudedans.fr' },
  { id: 'lemiroirinterieur',nom: 'Le <em>miroir intérieur</em>', url: 'https://lemiroirinterieur.fr' }
];

const DAYS = 30;

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayKey() { return dateKey(new Date()); }

requireAdmin(async () => {

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (const site of SITES) {
    const snap = await getDocs(collection(db, 'analytics', site.id, 'jours'));
    const data = {};
    snap.forEach(s => data[s.id] = s.data());

    // Construire série 30 jours + agrégat des pages
    const cells = [];
    let totalPV = 0, totalU = 0;
    const pagesAggregate = {};  // path -> total count sur la période
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const day = data[k] || {};
      cells.push({ k, pv: day.pageviews || 0, u: day.uniques || 0 });
      totalPV += day.pageviews || 0;
      totalU  += day.uniques || 0;
      // Pages
      if (day.pages && typeof day.pages === 'object') {
        for (const [path, count] of Object.entries(day.pages)) {
          pagesAggregate[path] = (pagesAggregate[path] || 0) + count;
        }
      }
    }
    const topPages = Object.entries(pagesAggregate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    function prettyPath(p) {
      if (p === 'home') return '/  (accueil)';
      return '/' + p.replace(/_/g, '/');
    }

    const today = todayKey();
    const todayD = data[today] || {};
    const maxPV = Math.max(...cells.map(c => c.pv), 1);

    // 7 derniers jours
    const last7 = cells.slice(-7);
    const last7PV = last7.reduce((s, c) => s + c.pv, 0);
    const last7U  = last7.reduce((s, c) => s + c.u, 0);

    grid.insertAdjacentHTML('beforeend', `
      <div class="pulse-card">
        <h2 class="pulse-card__title">${site.nom}</h2>

        <div class="pulse-stats">
          <div class="pulse-stat">
            <span class="pulse-stat__num">${todayD.pageviews || 0}</span>
            <div class="pulse-stat__lbl">Aujourd'hui</div>
            <div class="pulse-stat__sub">pageviews</div>
          </div>
          <div class="pulse-stat">
            <span class="pulse-stat__num">${todayD.uniques || 0}</span>
            <div class="pulse-stat__lbl">Aujourd'hui</div>
            <div class="pulse-stat__sub">visiteurs uniques</div>
          </div>
          <div class="pulse-stat">
            <span class="pulse-stat__num">${last7PV}</span>
            <div class="pulse-stat__lbl">7 derniers j.</div>
            <div class="pulse-stat__sub">pageviews</div>
          </div>
          <div class="pulse-stat">
            <span class="pulse-stat__num">${last7U}</span>
            <div class="pulse-stat__lbl">7 derniers j.</div>
            <div class="pulse-stat__sub">visiteurs uniques</div>
          </div>
        </div>

        <p class="chart-line">Pageviews sur ${DAYS} derniers jours</p>
        <div class="chart">
          ${cells.map(c => `
            <div class="chart__bar ${c.k === today ? 'today' : ''}"
                 style="height:${Math.max((c.pv / maxPV) * 100, 2)}%"
                 title="${c.k} : ${c.pv} pv · ${c.u} uniques"></div>
          `).join('')}
        </div>
        <div class="chart-legend">
          <span>il y a ${DAYS}j</span>
          <span>aujourd'hui</span>
        </div>

        <p style="margin-top:1.2rem;font-style:italic;color:var(--ink-mute);font-size:.9rem;font-family:'Cormorant Garamond',serif;">
          Total sur la période : <strong style="color:var(--ink-soft)">${totalPV}</strong> pageviews ·
          <strong style="color:var(--ink-soft)">${totalU}</strong> visiteurs uniques.
        </p>

        ${topPages.length ? `
          <div class="top-pages">
            <div class="top-pages__head">Pages les plus visitées (30 jours)</div>
            ${topPages.map(([path, count]) => `
              <div class="top-pages__row">
                <span class="top-pages__path">${prettyPath(path)}</span>
                <span class="top-pages__count">${count}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `);
  }
});
