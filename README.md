# 🖊️ Pétition Agro Bioénergies

[![CI / Déploiement Coolify](https://github.com/Sparkodefr/petition-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/Sparkodefr/petition-app/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Pétition interactive avec signature numérique au stylet**, pensée pour le porte-à-porte sur tablette.
Petite application Node.js (une seule dépendance) avec stockage fichier et export PDF, déployable en quelques minutes sur [Coolify](https://coolify.io).

---

## ✨ Fonctionnalités

- Formulaire + zone de signature au doigt ou au stylet
- **Signatures centralisées sur le serveur** : fichier NDJSON sur volume persistant, sans base de données
- Compteur global de signataires (toutes tablettes confondues)
- **Mode hors-ligne** : sans réseau, la signature est gardée sur la tablette et envoyée automatiquement au retour de la connexion
- **Export PDF** prêt à remettre (texte de la pétition + tableau des signataires avec signatures), protégé par mot de passe

---

## 📁 Structure du projet

```
petition-app/
├── public/
│   ├── index.html            # La pétition
│   └── app.js                # Signature, envoi, file hors-ligne
├── server/
│   ├── server.js             # Serveur HTTP (page, API, export)
│   ├── storage.js            # Stockage fichier NDJSON
│   ├── pdf.js                # Génération du PDF
│   └── petition.js           # Textes de la pétition (PDF)
├── scripts/
│   └── deploy.sh             # Déploiement manuel sur un serveur Docker
├── .github/workflows/
│   └── deploy.yml            # CI : build + test + déploiement Coolify
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── CONTRIBUTING.md
└── LICENSE
```

---

## ⚡ Déploiement sur Coolify (recommandé)

### 1. Créer la ressource

1. Dans Coolify : **Projects → + New → Resource → Private Repository (with GitHub App / Deploy Key)**
   _(ou **Public Repository** si le dépôt est public)_
2. Dépôt : `Sparkodefr/petition-app`, branche `main`
3. **Build Pack : `Dockerfile`**
4. **Ports Exposes : `3000`** (valeur par défaut de Coolify)
5. **Domains** : `https://petition.mondomaine.fr` (`http://` si derrière un Cloudflare Tunnel)
6. **Persistent Storage** → **+ Add** → *Volume* : destination **`/data`** ⚠️ **obligatoire**, sinon les signatures sont perdues à chaque redéploiement
7. **Environment Variables** : `ADMIN_PASSWORD` (mot de passe de l'export PDF), et optionnellement `ADMIN_USER` (défaut `admin`)
8. **Health check** (optionnel) : chemin `/health`
9. Cliquez **Deploy** 🚀

> 💡 Le Build Pack `Docker Compose` fonctionne aussi, mais `Dockerfile` est plus simple :
> Coolify route directement le domaine vers le port 3000 du conteneur, sans exposer de port sur l'hôte.

### 2. Déploiement automatique (CI/CD)

À chaque push sur `main`, le workflow GitHub Actions construit l'image, vérifie que la page répond, puis déclenche Coolify.

À configurer une seule fois :

1. Coolify → votre ressource → **Webhooks** : copiez l'URL **Deploy Webhook**
2. Coolify → **Keys & Tokens → API tokens** : créez un token (permission `deploy`)
3. GitHub → **Settings → Secrets and variables → Actions** : ajoutez
   - `COOLIFY_WEBHOOK` = l'URL du webhook
   - `COOLIFY_TOKEN` = le token API

Sans ces secrets, la CI s'exécute quand même (build + test) et saute simplement l'étape de déploiement.

> Alternative : activer l'**Auto Deploy** de Coolify via la GitHub App. Dans ce cas, n'ajoutez pas les secrets pour éviter un double déploiement.

---

## 🐳 Déploiement manuel (serveur Docker, sans Coolify)

```bash
git clone git@github.com:Sparkodefr/petition-app.git
cd petition-app
cp .env.example .env        # optionnel : personnaliser PORT, TZ...
./scripts/deploy.sh
```

Ou directement :

```bash
docker compose up -d --build
# → http://localhost:3000
```

### Variables d'environnement

| Variable         | Défaut           | Description                          |
|------------------|------------------|--------------------------------------|
| `ADMIN_PASSWORD` | _(obligatoire)_  | Mot de passe de l'export PDF         |
| `ADMIN_USER`     | `admin`          | Identifiant de l'export PDF          |
| `PORT`           | `3000`           | Port exposé sur l'hôte               |
| `TZ`             | `Europe/Paris`   | Fuseau horaire                       |
| `CONTAINER_NAME` | `petition-agro`  | Nom du conteneur                     |
| `RESTART_POLICY` | `unless-stopped` | Politique de redémarrage             |

---

## 📱 Utilisation sur tablette

1. Ouvrez `https://petition.mondomaine.fr` dans le navigateur de la tablette
2. Le signataire remplit le formulaire et signe dans le cadre
3. **« Signer la pétition »** → la signature est envoyée au serveur
4. Sans réseau : message « enregistrée sur cet appareil », puis envoi automatique dès le retour de la connexion
   (le bandeau indique le nombre de signatures en attente)

> 💡 Ajoutez la page à l'écran d'accueil pour y accéder rapidement.
> Avant de rendre une tablette, vérifiez que le bandeau affiche « Toutes les signatures sont enregistrées ».

---

## 📄 Export PDF

Ouvrez **`https://petition.mondomaine.fr/admin/export.pdf`** (lien « Export PDF (organisateurs) » en bas de page),
puis saisissez `ADMIN_USER` / `ADMIN_PASSWORD`.

Le PDF contient le texte de la pétition, le nombre de signataires et le tableau **N° / Nom et prénom / Adresse / Date / Signature**.
Le téléphone et l'email sont conservés dans les données mais **n'apparaissent pas** sur le PDF remis.

Les textes du PDF se modifient dans `server/petition.js` (et ceux de la page dans `public/index.html`).

---

## 💾 Données

- Fichier : `/data/signatures.ndjson` (une signature JSON par ligne, écriture en ajout seul)
- Sauvegarde : copier ce fichier suffit
  ```bash
  docker cp <conteneur>:/data/signatures.ndjson ./sauvegarde-$(date +%F).ndjson
  ```
- ⚠️ Données personnelles (RGPD) : accès restreint, suppression à l'issue de la pétition, ne jamais les committer

---

## 🔧 Commandes utiles

```bash
docker logs -f petition-agro        # Logs
docker compose restart petition     # Redémarrer
docker compose down                 # Arrêter
docker ps                           # Statut
curl http://localhost:3000/health   # Healthcheck
```

---

## 🆘 Dépannage

**La page ne charge pas**
```bash
docker ps
docker logs petition-agro
docker compose restart petition
```
Sur Coolify : consultez l'onglet **Logs** / **Deployments** de la ressource et vérifiez que *Ports Exposes* vaut `3000`.

**Les signatures disparaissent après un redéploiement**
Le volume persistant `/data` n'est pas configuré dans Coolify (voir étape 6 du déploiement).

**Signatures « en attente d'envoi » qui ne partent pas**
Vérifiez la connexion de la tablette et que le site répond ; l'envoi est retenté toutes les 30 s. Ne videz pas les données du navigateur tant qu'il reste des signatures en attente.

**L'export PDF répond « Export désactivé »**
Définissez `ADMIN_PASSWORD` dans les variables d'environnement puis redéployez.

**Le stylet ne fonctionne pas**
Testez d'abord au doigt, vérifiez l'appairage du stylet, puis relancez le navigateur.

---

## ✅ Workflow de collecte

| Période     | Actions                                                            |
|-------------|--------------------------------------------------------------------|
| Semaine 1   | Déployer sur Coolify, tester depuis la tablette                    |
| Semaines 2–3| Porte-à-porte avec les tablettes (suivi du compteur global)        |
| Semaine 4   | Export PDF final depuis `/admin/export.pdf`                        |
| Envoi       | Imprimer le PDF ou le joindre au courrier aux autorités            |

---

## 📞 Ressources

- [Documentation Coolify](https://coolify.io/docs)
- [Documentation Docker](https://docs.docker.com)

## 🤝 Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 Licence

[MIT](LICENSE) © Sparkode
