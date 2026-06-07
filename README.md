# Cockpit — Le carnet du dedans

Espace privé d'intendance pour le carnet du dedans.

**Accès** : authentification Google via Firebase Auth.
**Données** : projet Firebase `la-voie-du-dedans` (partagé avec le site public).

## Structure

```
/index.html              ← page de connexion Google
/tableau-de-bord.html    ← vue d'ensemble (clés, demandes, suggestions)
/demandes.html           ← demandes en attente, créer une clé
/codes.html              ← liste des clés actives, dernière activité
/suggestions.html        ← messages reçus des utilisateurs
/assets/css/cockpit.css
/assets/js/
  ├── cockpit-firebase.js   ← config + auth + helpers
  ├── cockpit-auth.js       ← garde-fou : redirige si non connecté
  └── cockpit-dashboard.js  ← logique du tableau de bord
```

## Ce que voit Brahms

- Nombre de clés actives, silencieuses, demandes en attente
- Le souffle collectif (intentions choisies, pratiques le plus cochées) — anonymisé
- Liste des codes avec dernière activité

## Ce que Brahms NE voit jamais

- Le contenu des carnets individuels (notes libres, réponses, intentions personnelles)
- Les textes intimes des utilisateurs

## Déploiement

GitHub Pages (repo privé) — sur un sous-domaine ou URL distincte de `lavoiedudedans.fr`.
