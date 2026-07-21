/* ============================================================
   COCKPIT v2 — module de données partagé
   Firebase + analytics + agrégat carnet + nommage des pages.
   ============================================================ */
import { db } from './firebase-init.js';
import { collection, getDocs, doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export const SITES = {
  dedans: {
    key: 'dedans', id: 'lavoiedudedans', nom: 'La voie du dedans',
    site: 'lavoiedudedans.fr', col: 'carnets', accent: '#1f8f6f',
  },
  miroir: {
    key: 'miroir', id: 'lemiroirinterieur', nom: 'Le miroir intérieur',
    site: 'lemiroirinterieur.fr', col: 'carnets-type', accent: '#6d5ab8',
  },
  jaspers: {
    key: 'jaspers', id: 'karl-jaspers', nom: 'Karl Jaspers',
    site: 'conscienceetpresence.github.io/karl-jaspers', col: null, accent: '#B8860B',
  },
  essence: {
    key: 'essence', id: 'lessenceretrouvee', nom: "L'essence retrouvée",
    site: 'conscienceetpresence.github.io/lessenceretrouvee', col: null, accent: '#c99a3a',
  },
};

/* col: null = ce site n'a pas de carnet. Les fonctions carnet renvoient null,
   et les blocs correspondants du cockpit ne s'affichent pas. */

const DATA_DEDANS = 'https://lavoiedudedans.fr/data/carnet/';

export const dKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const tsToMs = ts => ts && ts.toMillis ? ts.toMillis() : (ts ? +new Date(ts) : 0);
export const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- Nommage humain des pages ---------- */
const PAGE_LABELS = {
  home: 'Accueil',
  index: 'Accueil',
  'pages_noms-divins_index': 'Les 99 Noms divins',
  'pages_carnet_index': 'Carnet · entrée',
  'pages_carnet': 'Carnet · entrée',
  'pages_carnet_aujourdhui': 'Carnet · Aujourd’hui',
  'pages_carnet_poser': 'Carnet · Poser sa journée',
  'pages_carnet_relire': 'Carnet · Relire le soir',
  'pages_carnet_historique': 'Carnet · Mes journées',
  'pages_carnet_miroir': 'Carnet · Le miroir du chemin',
  'pages_iskandari': 'Sagesses · accueil',
  'pages_iskandari_hikam': 'Les Sagesses (sommaire)',
  'pages_iskandari_hikam_par-chapitre': 'Sagesses · par chapitre',
  'pages_iskandari_hikam_par-theme': 'Sagesses · par thème',
  'pages_iskandari_hikma': 'Sagesse · une fiche',
  'pages_mot-du-jour': 'Le mot du jour',
  'pages_coran': 'Coran · accueil',
  'pages_coran_index': 'Coran · accueil',
  'pages_dictionnaire_index': 'Dictionnaire',
  'pages_racines_index': 'Racines',
  'pages_decouvrir': 'Découvrir',
  'pages_cheminer': 'Cheminer',
  'pages_rencontrer': 'Rencontrer',
  'pages_metaphysique_index': 'Métaphysique',
  'pages_poesie_index': 'Poésie',
  'pages_contes_index': 'Contes',
  'pages_voyage_index': 'Le Voyage du Seuil',
  'pages_voyage': 'Le Voyage du Seuil',

  /* ---- Karl Jaspers ---- */
  'chemin': 'Entrer dans Jaspers',
  'situer': 'Où situer Jaspers',
  'lhomme': 'L’homme, sa vie',
  'glossaire': 'Glossaire',
  'citations': 'Citations',
  'lire': 'Lire Jaspers',
  'quotidien': 'Jaspers au quotidien',
  'dossiers': 'Les dossiers',
  'dossiers_origines': 'Dossier · Origines',
  'dossiers_englobant': 'Dossier · L’Englobant',
};
/* ---- Labels propres à un site (évite les collisions de noms de pages entre sites) ---- */
const SITE_LABELS = {
  'lessenceretrouvee': {
    home: 'Accueil',
    lhomme: 'L’homme',
    'etre-ou-lon-est': 'Être où l’on est',
    'le-juge-interieur': 'Le juge intérieur',
    'les-trous': 'Les trous',
    lessence: 'La question de l’essence',
    'les-visages-de-lessence': 'Les visages de l’essence',
    'la-perle': 'La Perle',
    'le-point': 'Le Point',
    'l-immensite': 'L’immensité',
    pratiquer: 'Pratiquer',
    'enneagramme-essence': 'L’ennéagramme de l’essence',
    'le-chemin-de-lamour': 'Le chemin de l’amour',
    glossaire: 'Glossaire bilingue',
    ouvrages: 'La bibliothèque',
    'lire-almaas': 'Lire Almaas',
    sommaire: 'Sommaire',
    'la-carte': 'La carte',
    'schemas-oeuvre': 'Les schémas de l’œuvre',
    'douze-notions': '12 notions clés',
    'l-intelligence': 'L’intelligence',
    'parcours-decouverte': 'Parcours découverte',
    'lexiques-ouvrages': 'Lexiques par ouvrage',
    situer: 'Situer Almaas',
    lapproche: 'L’approche Diamant',
    'approfondir-almaas': 'Approfondir Almaas',
    chemin: 'Le chemin (porte)',
    causeries: 'Les causeries',
    'causeries-premiere-serie': 'Causeries · 1re série',
    'causeries-deuxieme-serie': 'Causeries · 2e série',
    'causeries-troisieme-serie': 'Causeries · 3e série',
    'causeries-quatrieme-serie': 'Causeries · 4e série',
    'causeries-cinquieme-serie': 'Causeries · 5e série',
  },
};
export function labelPage(pathKey, siteId) {
  if (!pathKey) return '—';
  const site = (siteId && SITE_LABELS[siteId]) ? SITE_LABELS[siteId] : null;
  const lookup = k => (site && site[k]) || PAGE_LABELS[k];
  const hit = lookup(pathKey);
  if (hit) return hit;
  let en = '';
  let k = pathKey;
  if (k.startsWith('en_')) { en = ' · EN'; k = k.slice(3); const h = lookup(k); if (h) return h + en; }
  // fallback : nettoie le chemin
  const parts = k.replace(/^pages_/, '').split('_').filter(Boolean);
  if (!parts.length) return 'Accueil' + en;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
  return parts.map(cap).join(' › ') + en;
}
export function rawPath(pathKey) {
  if (pathKey === 'home') return '/';
  return '/' + String(pathKey).replace(/_/g, '/');
}

function readCounters(day, flatPrefix, nestedKey) {
  const out = {};
  for (const [field, val] of Object.entries(day || {})) {
    if (typeof val === 'number' && field.startsWith(flatPrefix)) {
      out[field.slice(flatPrefix.length)] = (out[field.slice(flatPrefix.length)] || 0) + val;
    }
  }
  if (day?.[nestedKey] && typeof day[nestedKey] === 'object') {
    for (const [key, val] of Object.entries(day[nestedKey])) {
      if (typeof val === 'number') out[key] = (out[key] || 0) + val;
    }
  }
  return out;
}

/* ---------- Analytics d'un site ---------- */
export async function loadAnalytics(siteId, days = 30) {
  const snap = await getDocs(collection(db, 'analytics', siteId, 'jours'));
  const byDate = {}; snap.forEach(s => byDate[s.id] = s.data());
  const labels = [], uniques = [], pageviews = [], dayRows = [];
  let pv30 = 0, u30 = 0, pv7 = 0, u7 = 0, pvToday = 0, uToday = 0;
  const pages = {};
  const today = dKey(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const k = dKey(d);
    const day = byDate[k] || {}; const pv = day.pageviews || 0, u = day.uniques || 0;
    const viewsByPage = readCounters(day, 'pages.', 'pages');
    const uniquesByPage = readCounters(day, 'upages.', 'upages');
    const periods = readCounters(day, 'periods.', 'periods');
    const uniquePeriods = readCounters(day, 'uperiods.', 'uperiods');
    const hours = readCounters(day, 'hours.', 'hours');
    const sources = readCounters(day, 'sources.', 'sources');
    const devices = readCounters(day, 'devices.', 'devices');
    const langs = readCounters(day, 'langs.', 'langs');
    const visitors = readCounters(day, 'visitors.', 'visitors');
    const deepPages = readCounters(day, 'deeppages.', 'deeppages');
    const pageRows = Object.entries(viewsByPage).sort((a, b) => b[1] - a[1])
      .map(([page, views]) => ({ page, views, uniques: uniquesByPage[page] ?? null }));
    labels.push(`${d.getDate()}/${d.getMonth()+1}`); uniques.push(u); pageviews.push(pv);
    dayRows.push({
      date: k,
      label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
      shortLabel: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      uniques: u,
      pageviews: pv,
      pages: pageRows,
      periods,
      uniquePeriods,
      hours,
      sources,
      devices,
      langs,
      visitors,
      deepPages,
      engaged: day.engaged || 0,
      deep: day.deep || 0,
    });
    pv30 += pv; u30 += u; if (i < 7) { pv7 += pv; u7 += u; } if (k === today) { pvToday = pv; uToday = u; }
    for (const [p, c] of Object.entries(viewsByPage)) pages[p] = (pages[p] || 0) + c;
  }
  const allPages = Object.entries(pages).sort((a, b) => b[1] - a[1]);
  return { labels, uniques, pageviews, pv30, u30, pv7, u7, pvToday, uToday,
           dayRows, weekRows: dayRows.slice(-7),
           topPages: allPages.slice(0, 8), allPages,
           totalPv: allPages.reduce((n, [, c]) => n + c, 0) };
}

/* ---------- Doc du mois : distincts + personnes distinctes par page ---------- */
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
export async function loadMonthly(siteId) {
  const ref = doc(db, 'analytics', siteId, 'jours', '_mois_' + monthKey());
  let snap; try { snap = await getDoc(ref); } catch (e) { return null; }
  if (!snap.exists()) return null;
  const d = snap.data();
  const views = {}, uniques = {};
  for (const [f, v] of Object.entries(d)) {
    if (typeof v !== 'number') continue;
    if (f.startsWith('upages.')) uniques[f.slice(7)] = v;
    else if (f.startsWith('pages.')) views[f.slice(6)] = v;
  }
  const viewsArr = Object.entries(views).sort((a, b) => b[1] - a[1]);
  return {
    uniques: d.uniques || 0, pageviews: d.pageviews || 0,
    views, pageUniques: uniques, viewsArr,
    totalViews: viewsArr.reduce((n, [, c]) => n + c, 0),
  };
}

/* ---------- Regroupement par section ---------- */
const SECTION_LABELS = {
  accueil: 'Accueil', iskandari: 'Les Sagesses', carnet: 'Le Carnet', coran: 'Coran',
  'noms-divins': 'Les 99 Noms', dictionnaire: 'Dictionnaire', racines: 'Racines',
  metaphysique: 'Métaphysique', poesie: 'Poésie', contes: 'Contes', voyage: 'Le Voyage',
  'mot-du-jour': 'Mot du jour', decouvrir: 'Découvrir', cheminer: 'Cheminer',
  rencontrer: 'Rencontrer', en: 'Pages anglaises', auteurs: 'Auteurs', auteur: 'Auteurs',
  /* Karl Jaspers */
  concepts: 'Les concepts', notions: 'Les notions', dossiers: 'Les dossiers',
  glossaire: 'Glossaire', citations: 'Citations', lire: 'Lire Jaspers',
  chemin: 'Entrer dans Jaspers', situer: 'Où le situer', lhomme: 'L’homme, sa vie',
  quotidien: 'Au quotidien',
};
export function sectionOf(pathKey) {
  if (pathKey === 'home' || pathKey === 'index') return 'accueil';
  let k = pathKey;
  if (k.startsWith('en_')) return 'en';
  k = k.replace(/^pages_/, '');
  return k.split('_')[0] || 'accueil';
}
export function sectionLabel(sec) {
  return SECTION_LABELS[sec] || sec.charAt(0).toUpperCase() + sec.slice(1).replace(/-/g, ' ');
}
// map = { pathKey: count } ; uniqMap optionnel = { pathKey: distinct }
export function aggBySection(map, uniqMap) {
  const views = {}, uniq = {};
  for (const [pk, n] of Object.entries(map || {})) { const s = sectionOf(pk); views[s] = (views[s] || 0) + n; }
  if (uniqMap) for (const [pk, n] of Object.entries(uniqMap)) { const s = sectionOf(pk); uniq[s] = (uniq[s] || 0) + n; }
  return Object.entries(views).sort((a, b) => b[1] - a[1])
    .map(([s, n]) => ({ sec: s, label: sectionLabel(s), views: n, uniques: uniq[s] || null }));
}

/* ---------- Données de libellés (dedans) ---------- */
let _dedansData = null;
async function dedansData() {
  if (_dedansData) return _dedansData;
  const [vig, obj] = await Promise.all([
    fetch(DATA_DEDANS + 'vigilances.json').then(r => r.json()).catch(() => ({})),
    fetch(DATA_DEDANS + 'objectifs.json').then(r => r.json()).catch(() => ({})),
  ]);
  const vigById = {}; for (const v of (vig.vigilances || [])) vigById[v.id] = v;
  const objById = {}; for (const o of (obj.objectifs || [])) objById[o.id] = o;
  _dedansData = { vigById, objById };
  return _dedansData;
}

/* ---------- Liste des carnets (profils) ---------- */
export async function loadCarnetsList(siteKey) {
  const S = SITES[siteKey];
  if (!S || !S.col) return [];
  const snap = await getDocs(collection(db, S.col));
  const out = [];
  for (const d of snap.docs) {
    let prof = d.data() || {};
    if (prof.prenom === undefined && prof.firstSeen === undefined && prof.lastSeen === undefined) {
      try { const m = await getDoc(doc(db, S.col, d.id, '_meta', 'profil')); if (m.exists()) prof = m.data(); } catch (e) {}
    }
    out.push({ id: d.id, prenom: prof.prenom || '', type: prof.type || null,
               first: tsToMs(prof.firstSeen), last: tsToMs(prof.lastSeen) });
  }
  out.sort((a, b) => b.last - a.last);
  return out;
}

/* ---------- Agrégat carnet : entonnoir + top vigilances/objectifs ---------- */
export async function loadCarnetAggregate(siteKey) {
  const S = SITES[siteKey];
  if (!S || !S.col) return null;
  const snap = await getDocs(collection(db, S.col));
  const now = Date.now(), weekAgo = now - 7 * 86400000;
  let total = 0, actifs7 = 0, posers = 0, deposers = 0, joursTotal = 0;
  const vigCount = {}, objCount = {};

  for (const d of snap.docs) {
    total++;
    let prof = d.data() || {};
    if (prof.lastSeen === undefined && prof.firstSeen === undefined) {
      try { const m = await getDoc(doc(db, S.col, d.id, '_meta', 'profil')); if (m.exists()) prof = m.data(); } catch (e) {}
    }
    if (tsToMs(prof.lastSeen) >= weekAgo) actifs7++;
    // jours
    let aPose = false, aDepose = false;
    try {
      const js = await getDocs(collection(db, S.col, d.id, 'jours'));
      js.forEach(j => {
        const data = j.data() || {}; const matin = data.matin || {}; const soir = data.soir || {};
        if (matin.poseLe) { aPose = true; joursTotal++; }
        if (soir.fermeLe) aDepose = true;
        // vigilances + objectifs (dedans, nouveau modèle)
        const objs = (matin.objectifs && matin.objectifs.length)
          ? matin.objectifs
          : (matin.objectifsIds || []).map(id => ({ id, vigilance: matin.vigilanceId }));
        const vigs = new Set(objs.map(o => o.vigilance).filter(Boolean));
        for (const v of vigs) vigCount[v] = (vigCount[v] || 0) + 1;
        for (const o of objs) if (o.id) objCount[o.id] = (objCount[o.id] || 0) + 1;
      });
    } catch (e) {}
    if (aPose) posers++;
    if (aDepose) deposers++;
  }

  // résolution des libellés (dedans uniquement)
  let topVigilances = [], topObjectifs = [];
  if (siteKey === 'dedans') {
    const { vigById, objById } = await dedansData();
    topVigilances = Object.entries(vigCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, n]) => ({ label: vigById[id]?.label || id, n }));
    topObjectifs = Object.entries(objCount).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([id, n]) => ({ label: objById[id]?.matin?.libelle || id, n }));
  }
  return { total, actifs7, posers, deposers, joursTotal, topVigilances, topObjectifs };
}

/* ---------- Suggestions ---------- */
export async function loadSuggestions() {
  const snap = await getDocs(collection(db, 'suggestions'));
  const out = [];
  snap.forEach(d => { const x = d.data() || {}; out.push({ id: d.id, ...x, _ms: tsToMs(x.createdAt || x.date) }); });
  out.sort((a, b) => b._ms - a._ms);
  return out;
}
