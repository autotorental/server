#!/bin/bash
SENTRY_WEBHOOK="https://us.sentry.io/api/hooks/release/builtin/4511530681303040/dd95d7bc40ef553726d4d3bd089e0ef91e77057ace1189f7d7308018e0530b90/"
COMMIT=$(cd /opt/autorental && git rev-parse HEAD 2>/dev/null)
SHORT=$(echo "$COMMIT" | head -c 12)
VERSION="autotorental@$(date +%Y.%m.%d)-$SHORT"
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X POST "$SENTRY_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"version\": \"$VERSION\",
    \"projects\": [\"javascript-nextjs\"],
    \"refs\": [{
      \"repository\": \"autotorental/server\",
      \"commit\": \"$COMMIT\"
    }],
    \"dateReleased\": \"$DATE\"
  }" > /dev/null 2>&1

echo "✅ Sentry notified: $VERSION"
