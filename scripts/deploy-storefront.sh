#!/bin/bash
echo '🔨 Building storefront...'
cd /opt/autorental/apps/storefront && npm run build 2>&1 | tail -5
echo '🚀 Restarting storefront...'
pm2 restart storefront --update-env
echo '📡 Notifying Sentry...'
/opt/autorental/scripts/notify-sentry-release.sh
echo '✅ Deploy complete!'
