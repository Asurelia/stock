#!/bin/bash
# Lance un tunnel cloudflared pour exposer le backend local
# Usage: bash tunnel.sh
# L'URL du tunnel sera affichée — copiez-la dans les paramètres de l'app

PORT=${PORT:-3005}
echo "Starting cloudflared tunnel for localhost:$PORT..."
echo "Copy the URL below and paste it in StockPro Settings (add /api at the end)"
echo ""
cloudflared tunnel --url http://localhost:$PORT
