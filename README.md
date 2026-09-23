# 🖊️ Pétition Agro Bioénergies

[![CI / Déploiement Coolify](https://github.com/Sparkodefr/petition-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/Sparkodefr/petition-app/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Pétition interactive avec signature numérique au stylet**, pensée pour le porte-à-porte sur tablette.
Une page HTML statique servie par nginx, déployable en quelques minutes sur [Coolify](https://coolify.io).

---

## ✨ Fonctionnalités

- Formulaire de signature + zone de signature au doigt ou au stylet
- Compteur de signatures collectées (par appareil)
- Export **CSV** (Excel / LibreOffice) et **JSON**
- Fonctionne **hors-ligne** une fois la page chargée
- Aucune base de données, aucun login : les données restent dans le navigateur (`localStorage`)

---

## 📁 Structure du projet

```
petition-app/
├── public/
│   └── index.html            # La pétition (page autonome)
├── nginx/
│   └── default.conf          # Config nginx (gzip, sécurité, /health)
├── scripts/
│   └── deploy.sh             # Déploiement manuel sur un serveur Docker
├── docs/
│   └── GUIDE_COOLIFY.md      # Guide Coolify détaillé
├── .github/workflows/
│   └── deploy.yml            # CI : build + test + déploiement Coolify
├── Dockerfile
├── docker-compose.yml
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
5. **Domains** : `https://petition.mondomaine.fr` (Coolify gère le certificat SSL)
6. **Health check** (optionnel) : chemin `/health`
7. Cliquez **Deploy** 🚀

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
| `PORT`           | `3000`           | Port exposé sur l'hôte               |
| `TZ`             | `Europe/Paris`   | Fuseau horaire                       |
| `CONTAINER_NAME` | `petition-agro`  | Nom du conteneur                     |
| `RESTART_POLICY` | `unless-stopped` | Politique de redémarrage             |

---

## 📱 Utilisation sur tablette

1. Ouvrez le navigateur de la tablette
2. Allez sur `https://petition.mondomaine.fr` (ou `http://[IP-SERVEUR]:3000` en réseau local)
3. Remplissez le formulaire + signature au stylet
4. Cliquez **« Signer »** → la signature est enregistrée sur la tablette

> 💡 Ajoutez la page à l'écran d'accueil pour y accéder rapidement.

---

## 📊 Exporter les données

En bas de la page, 3 boutons :

| Bouton            | Usage                                        |
|-------------------|----------------------------------------------|
| 📥 **JSON**       | Données brutes                               |
| 📊 **Excel/CSV**  | Tableau compatible Excel ← **à privilégier** |
| 🗑️ **Réinit**     | Efface toutes les signatures (irréversible)  |

---

## 🎯 Informations importantes

### Les données sont 100 % locales

- ✅ Jamais envoyées au serveur, stockées uniquement dans le navigateur de la tablette
- ⚠️ **Chaque tablette a ses propres signatures** : le compteur et les exports sont par appareil
- ⚠️ Vider le cache / les données du navigateur **efface les signatures** → **exportez en CSV chaque jour**
- ⚠️ Les exports contiennent des données personnelles : ne les commitez jamais dans ce dépôt

### Fonctionne hors-ligne

Une fois la page chargée, aucune connexion n'est nécessaire pour collecter des signatures.

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

**Les signatures ne se sauvegardent pas**
Le stockage local est probablement désactivé (ou navigation privée). Activez-le dans les paramètres du navigateur puis rechargez la page.

**Le stylet ne fonctionne pas**
Testez d'abord au doigt, vérifiez l'appairage du stylet, puis relancez le navigateur.

---

## ✅ Workflow de collecte

| Période     | Actions                                                            |
|-------------|--------------------------------------------------------------------|
| Semaine 1   | Déployer sur Coolify, tester depuis la tablette                    |
| Semaines 2–3| Porte-à-porte avec la tablette, **export CSV quotidien** en backup |
| Semaine 4   | Export final CSV de chaque tablette, fusion des fichiers           |
| Envoi       | Imprimer le tableau ou joindre le fichier au courrier à la mairie  |

---

## 📞 Ressources

- [Guide Coolify détaillé](docs/GUIDE_COOLIFY.md)
- [Documentation Coolify](https://coolify.io/docs)
- [Documentation Docker](https://docs.docker.com)

## 🤝 Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 Licence

[MIT](LICENSE) © Sparkode
