#!/bin/bash
# AutoToRental Auto-Heal — MONITOR + minimal-action (safe version)
# Runs every 5 min. Detects issues, logs them, restarts ONLY the failed
# service after 2 consecutive failures. NEVER auto-rebuilds. flock-guarded.

exec 9>/tmp/autoheal.lock
flock -n 9 || { echo "[$(date '+%F %T')] another autoheal running, skip" >> /var/log/autoheal.log; exit 0; }

LOG="/var/log/autoheal.log"
STATE="/tmp/autoheal-fails"
mkdir -p "$STATE"
log() { echo "[$(date '+%F %T')] $1" | tee -a "$LOG"; }
notify_sentry() { /opt/autorental/scripts/notify-sentry-release.sh >/dev/null 2>&1 || true; }

# Internal URLs (localhost — server can always reach itself)
declare -A SERVICES=(
  ["http://127.0.0.1:9000/health"]="autorental-api"
  ["http://127.0.0.1:7100"]="storefront"
)

log "=== AutoHeal check ==="
ACTED=0

for url in "${!SERVICES[@]}"; do
  svc="${SERVICES[$url]}"
  touch /tmp/heal_body.txt
  # Tolerant probe: retry once within the same tick so a transient slow /health
  # (heavy cron, momentary load) is NOT counted as a failure -> avoids spurious restarts.
  code=000
  for attempt in 1 2; do
    code=$(curl -s -o /tmp/heal_body.txt -w "%{http_code}" --max-time 18 "$url" 2>/dev/null)
    case "$code" in 200|301|302) break;; esac
    [ "$attempt" = "1" ] && sleep 3
  done
  size=$(wc -c < /tmp/heal_body.txt 2>/dev/null)
  failfile="$STATE/${svc}.fails"
  fails=$(cat "$failfile" 2>/dev/null || echo 0)

  # Healthy: 200/301/302 AND (api can be tiny "OK"; storefront must be >2KB real HTML)
  healthy=0
  if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
    if [[ "$url" == *":9000"* ]]; then
      healthy=1                                  # API: any 2xx/3xx = ok
    elif [ "${size:-0}" -gt 2000 ]; then
      healthy=1                                  # storefront: needs real HTML body
    fi
  fi

  if [ "$healthy" = "1" ]; then
    [ "$fails" != "0" ] && log "✅ $svc recovered (HTTP $code, ${size}B)"
    echo 0 > "$failfile"
  else
    fails=$((fails + 1))
    echo "$fails" > "$failfile"
    log "⚠️  $svc unhealthy (HTTP $code, ${size}B) — consecutive fails: $fails"
    # Only act after 2 consecutive failures (avoids single-blip false positives)
    if [ "$fails" -ge 2 ]; then
      log "🔧 Restarting ONLY $svc (not all services)…"
      pm2 restart "$svc" --update-env >/dev/null 2>&1
      ACTED=$((ACTED + 1))
      echo 0 > "$failfile"   # reset after action; next tick re-verifies
    fi
  fi
done

# Sentry auto-fix: ANALYSIS-ONLY trigger removed. We only surface issues, never auto-edit code.
SENTRY_TOKEN=$(PGPASSWORD=vqrmVQLK5iEunWCcliSMrjyu psql -U autorental -h localhost -d autorental_db -t -c "SELECT value FROM app_setting WHERE key='sentry_token' AND value != '' LIMIT 1" 2>/dev/null | tr -d " \n")
if [ -n "$SENTRY_TOKEN" ]; then
  CNT=$(curl -s --max-time 10 "https://sentry.io/api/0/projects/auto-to-rerntal/javascript-nextjs/issues/?query=is:unresolved&limit=5" -H "Authorization: Bearer $SENTRY_TOKEN" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)
  [ "${CNT:-0}" -gt 0 ] && log "🐛 Sentry: $CNT unresolved issues (review in dashboard — auto-fix is manual now)"
fi

[ "$ACTED" -gt 0 ] && log "🏥 Restarted $ACTED service(s)" || log "All systems healthy ✅"
log "=== Done ==="
