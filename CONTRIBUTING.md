# Contribuer

Merci de votre intérêt pour le projet ! Voici comment contribuer.

## Workflow

1. Créez une branche depuis `main` :
   ```bash
   git checkout -b feat/ma-modification
   ```
2. Faites vos modifications (page : `public/`, serveur : `server/`).
3. Testez en local :
   ```bash
   npm install
   npm run dev
   # → http://localhost:3000 (données dans ./data, export PDF : admin / admin)
   ```
4. Commitez avec un message clair (convention [Conventional Commits](https://www.conventionalcommits.org/fr/) recommandée) :
   ```
   feat: ajout d'un champ commune
   fix: correction de l'export PDF sur Safari
   docs: mise à jour du guide Coolify
   ```
5. Poussez et ouvrez une Pull Request vers `main`. La CI construit l'image et vérifie que la page est servie.

> ⚠️ Tout merge sur `main` déclenche un déploiement automatique sur Coolify.

## Règles

- **Aucune donnée personnelle dans le dépôt** : ne commitez jamais d'export de signatures (`.csv`, `.json`) ni de fichier `.env`.
- La page ne doit charger **aucune ressource externe** (CDN, polices...) : elle doit fonctionner avec un réseau instable.
- Limitez les dépendances npm au strict nécessaire (actuellement : `pdfkit`).
- Testez sur tablette (tactile + stylet) toute modification de la zone de signature.
- Gardez le français comme langue de l'interface et de la documentation.

## Signaler un problème

Ouvrez une issue en précisant : appareil / navigateur, étapes pour reproduire, comportement attendu et observé.
