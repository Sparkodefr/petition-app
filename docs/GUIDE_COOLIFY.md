# 🚀 GUIDE COOLIFY - DÉPLOYER LA PÉTITION

## Vous avez choisi la bonne plateforme !

Coolify = auto-hébergement facile + open source  
Parfait pour une pétition autonome

---

## 📋 CHECKLIST PRÉ-DÉPLOIEMENT

Avant de commencer, vérifiez :

```
✓ Coolify est installé et fonctionnel
✓ Vous avez accès au panel Coolify (http://votre-ip:3000 ou domaine)
✓ Docker fonctionne sur votre serveur
✓ Vous avez les 3 fichiers :
  - petition.html
  - Dockerfile
  - docker-compose.yml
```

---

## 🎯 OPTION 1 : DÉPLOIEMENT PAR L'INTERFACE COOLIFY (Plus facile)

### ÉTAPE 1 : Préparer les fichiers

Sur votre serveur Coolify, créez un dossier :

```bash
mkdir -p /opt/petition
cd /opt/petition

# Créer le fichier HTML
nano petition.html
# Copiez-collez tout le contenu du fichier petition.html
# Ctrl+O → Entrée → Ctrl+X pour sauvegarder

# Créer le Dockerfile
nano Dockerfile
# Copiez-collez le contenu du Dockerfile
# Ctrl+O → Entrée → Ctrl+X

# Créer docker-compose.yml
nano docker-compose.yml
# Copiez-collez le contenu du docker-compose.yml
# Ctrl+O → Entrée → Ctrl+X
```

### ÉTAPE 2 : Dans l'interface Coolify

```
1. Ouvrez http://[votre-ip-coolify]:3000
2. Cliquez sur "New Service" ou "Déployer"
3. Choisissez "Docker Compose"
4. Sélectionnez le dossier /opt/petition
5. Cliquez "Deploy" ou "Déployer"
```

### ÉTAPE 3 : Vérifier le déploiement

```
Une fois déployé :
- Allez à http://votre-ip:3000
- Vous devriez voir la pétition
- La page fonctionne !
```

---

## 🎯 OPTION 2 : DÉPLOIEMENT EN LIGNE DE COMMANDE (Plus rapide)

### ÉTAPE 1 : SSH sur votre serveur

```bash
ssh user@votre-serveur.com

# Créer le dossier
mkdir -p /opt/petition
cd /opt/petition
```

### ÉTAPE 2 : Créer les fichiers

**Fichier petition.html :**

```bash
cat > petition.html << 'EOF'
[Copiez tout le contenu du fichier petition.html ici]
EOF
```

**Fichier Dockerfile :**

```bash
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY petition.html /usr/share/nginx/html/index.html
RUN echo 'server { listen 80; server_name _; location / { root /usr/share/nginx/html; index index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

**Fichier docker-compose.yml :**

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  petition:
    build: .
    container_name: petition-agro
    ports:
      - "3000:80"
    restart: unless-stopped
EOF
```

### ÉTAPE 3 : Déployer

```bash
# Aller dans le dossier
cd /opt/petition

# Démarrer le conteneur
docker-compose up -d

# Vérifier que ça marche
docker-compose logs -f petition
```

### ÉTAPE 4 : Vérifier

```bash
# Voir les conteneurs en cours
docker ps

# Vérifier l'URL
curl http://localhost:3000
```

---

## 🌐 ACCÉDER À VOTRE PÉTITION

### Depuis votre réseau local

```
http://[IP-DE-VOTRE-SERVEUR]:3000
```

**Exemple :**
```
http://192.168.1.100:3000
```

### Depuis un domaine (via Coolify)

Si vous avez configuré un domaine dans Coolify :

```
https://petition.mondomaine.fr
```

### Depuis votre tablette

```
Sur la tablette, allez à :
http://[IP-SERVER]:3000

Exemple : http://192.168.1.100:3000
```

---

## 📱 UTILISATION SUR TABLETTE

### Depuis le WiFi local

```
1. Connectez votre tablette au même WiFi que le serveur
2. Ouvrez le navigateur
3. Allez à http://[IP-SERVEUR]:3000
4. La pétition apparaît
5. Commencez à collecter les signatures
```

### Accès externe (depuis n'importe où)

Si vous avez un domaine + SSL configuré dans Coolify :

```
1. Allez à https://petition.mondomaine.fr
2. Fonctionne partout (4G, autre WiFi, etc.)
3. Les signatures se sauvegardent toujours localement
```

---

## 💾 GÉRER LES DONNÉES

### Sauvegarder les signatures

**Les données sont dans la tablette** (localStorage du navigateur)

Pour les récupérer :

```
1. Aller à la page de la pétition
2. En bas : cliquez "Exporter CSV" ou "Exporter JSON"
3. Le fichier se télécharge
4. Vous l'avez en local sur votre ordinateur
```

### Backup régulier

Avant de fermer la pétition :

```
✓ Exporter le CSV
✓ Envoyer par email à vous-même
✓ Garder en backup
```

### Si vous devez réinitialiser

```
1. Allez à la page de la pétition
2. En bas : cliquez "Réinitialiser"
3. Confirmer
4. Les données de la tablette sont effacées
   (mais vous avez votre export CSV !)
```

---

## 🔒 SÉCURITÉ & CONSIDÉRATIONS

### Données locales = sûr

```
✓ Données JAMAIS envoyées au serveur
✓ Données restent sur la tablette
✓ Serveur = juste sert la page HTML
✓ Aucune base de données nécessaire
```

### Accès à la pétition

```
Si IP public :
- N'importe qui peut accéder à la page
- Solution : mettre mot de passe basicAuth (optionnel)

Si IP local seulement :
- Seulement sur votre réseau WiFi
- Plus sûr pour usage privé
```

### Ajouter un mot de passe (optionnel)

Si vous voulez protéger l'accès :

**Créer fichier .htpasswd :**

```bash
htpasswd -c .htpasswd petition
# Entrez votre mot de passe

# Editer le Dockerfile pour ajouter la protection
```

---

## 🛠️ TROUBLESHOOTING

### "La page ne charge pas"

```
1. Vérifiez que Coolify/Docker fonctionne
   docker ps
   
2. Vérifiez le port 3000
   docker logs petition-agro
   
3. Relancez si besoin
   docker-compose restart petition
```

### "Les données ne se sauvegardent pas"

```
Problème : localStorage désactivé dans le navigateur

Solution :
1. Vérifiez que le navigateur permet le stockage local
2. Effacez le cache (Ctrl+Maj+Suppr)
3. Rechargez la page (F5)
4. Essayez à nouveau
```

### "Impossible de signer avec le stylet"

```
Solution :
1. Testez d'abord avec le doigt
2. Vérifiez que le stylet est appairé
3. Relancez l'app/navigateur
4. Essayez sur une autre app pour voir si stylet OK
```

### "Problème sur Coolify lui-même"

```
Redémarrer le conteneur :
docker-compose down
docker-compose up -d

Voir les logs :
docker logs -f petition-agro
```

---

## 📊 PERFORMANCE & SCALABILITÉ

Votre setup avec Coolify :

```
Visite théorique : Quasi illimitée
  (c'est juste du HTML statique)

Signatures simultanées : Illimitées
  (tout se sauvegarde localement sur chaque tablette)

Taille limite : Aucune
  (localStorage limité à ~5-10MB par domaine)

Avec 1000 signatures = ~5-6 MB
  (largement dans les limites)
```

---

## 🎯 WORKFLOW COMPLET AVEC COOLIFY

```
JOUR 1 :
  □ Déployez la pétition sur Coolify
  □ Testez l'accès depuis votre tablette
  
JOUR 2-14 :
  □ Allez porte-à-porte avec tablette
  □ Chaque jour : export CSV en backup
  
JOUR 15 :
  □ Export final du CSV
  □ Vous avez la liste complète

POUR LA MAIRIE :
  □ Imprimez le CSV (tableau)
  □ Ou envoyez le fichier directement
```

---

## 📞 CONTACTS UTILES

**Coolify Documentation :**
https://coolify.io/docs

**Docker Documentation :**
https://docs.docker.com

**Support Coolify :**
https://discord.gg/coolify (Discord)

---

## ✅ VOUS ÊTES PRÊT !

```
✓ Fichiers préparés (HTML + Dockerfile + compose)
✓ Coolify configuré
✓ Prêt à déployer
✓ Pétition accessible depuis tablette

À faire : Suivez Option 1 ou Option 2 ci-dessus
```

---

**Des questions sur le déploiement Coolify ?** 👆
