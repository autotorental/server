#!/bin/bash
echo '🔄 Restarting API...'
cd /opt/autorental && pm2 restart autorental-api --update-env
echo '📡 Notifying Sentry...'
/opt/autorental/scripts/notify-sentry-release.sh
echo '✅ API deploy complete!'
