/* ============================================================
   Palette des 24 mots-graines — partagée par creer-cle et demandes
   ============================================================ */
export const PALETTE = [
  ['sabr',     'patience'],
  ['shukr',    'gratitude'],
  ['hilm',     'mansuétude'],
  ['rifq',     'douceur'],
  ['huduur',   'présence'],
  ['muraqaba', 'observation'],
  ['adab',     'belle manière'],
  ['fitra',    'nature originelle'],
  ['sakina',   'quiétude'],
  ['nur',      'lumière'],
  ['sidq',     'véracité'],
  ['ikhlas',   'sincérité'],
  ['uns',      'intimité'],
  ['huda',     'guidance'],
  ['tawakkul', 'remise'],
  ['rida',     'acquiescement'],
  ['khushuu',  'humilité'],
  ['samt',     'silence'],
  ['dhikr',    'rappel'],
  ['niyya',    'intention'],
  ['tawba',    'retour'],
  ['zuhd',     'détachement'],
  ['faqr',     'simplicité'],
  ['shawq',    'désir ardent']
];

export function paletteHTML() {
  return PALETTE.map(([m, g]) =>
    `<span class="ck-palette__mot" data-mot="${m}">${m} <em>· ${g}</em></span>`
  ).join('');
}
