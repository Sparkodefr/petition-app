#!/usr/bin/env bash
# ========================================
# DÉPLOIEMENT MANUEL - PÉTITION AGRO BIOÉNERGIES
# (hors Coolify : serveur avec Docker)
# Usage : ./scripts/deploy.sh   (depuis n'importe où dans le repo)
# ========================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 DÉPLOIEMENT PÉTITION AGRO BIOÉNERGIES"
echo "========================================="

# Docker
echo -n "Vérification Docker... "
command -v docker &> /dev/null || { echo -e "${RED}✗ Docker non trouvé${NC}"; exit 1; }
echo -e "${GREEN}✓${NC}"

# Docker Compose (v2 plugin ou v1 standalone)
echo -n "Vérification Docker Compose... "
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}✗ Docker Compose non trouvé${NC}"; exit 1
fi
echo -e "${GREEN}✓ ($COMPOSE)${NC}"

# Fichiers requis
for f in public/index.html server/server.js package.json Dockerfile docker-compose.yml; do
    [ -f "$f" ] || { echo -e "${RED}✗ $f manquant${NC}"; exit 1; }
done
echo -e "${GREEN}✓ Fichiers présents${NC}"

# Configuration
[ -f .env ] || { cp .env.example .env; echo -e "${YELLOW}ℹ .env créé depuis .env.example${NC}"; }
set -a; source .env; set +a
PORT="${PORT:-3000}"
CONTAINER_NAME="${CONTAINER_NAME:-petition-agro}"
if [ -z "${ADMIN_PASSWORD:-}" ] || [ "$ADMIN_PASSWORD" = "changez-moi" ]; then
    echo -e "${RED}✗ Définissez ADMIN_PASSWORD dans .env (mot de passe de l'export PDF)${NC}"
    exit 1
fi

echo ""
echo "Construction et démarrage..."
$COMPOSE up -d --build --remove-orphans
echo -e "${GREEN}✓ Conteneur démarré${NC}"

echo -n "Vérification du service... "
HEALTHY=0
for _ in $(seq 1 10); do
    if curl -fs "http://localhost:${PORT}/health" > /dev/null; then
        HEALTHY=1; break
    fi
    sleep 1
done
if [ "$HEALTHY" -eq 1 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ pas encore prêt (voir : docker logs ${CONTAINER_NAME})${NC}"
fi

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "========================================="
echo -e "${GREEN}✓ DÉPLOIEMENT TERMINÉ${NC}"
echo "========================================="
echo "📱 Local        : http://localhost:${PORT}"
echo "📱 Réseau local : http://${IP:-IP-SERVEUR}:${PORT}"
echo ""
echo "📊 Commandes utiles :"
echo "  Logs       : docker logs -f ${CONTAINER_NAME}"
echo "  Redémarrer : $COMPOSE restart petition"
echo "  Arrêter    : $COMPOSE down"
echo ""
echo "💾 Signatures stockées dans le volume Docker 'petition-data' (/data/signatures.ndjson)"
echo "🔐 Organisateurs : http://localhost:${PORT}/admin/ (identifiants ADMIN_USER / ADMIN_PASSWORD)"
