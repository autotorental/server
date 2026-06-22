#!/usr/bin/env bash
# Configure Zoho Mail SMTP for Auto to Rental API
set -euo pipefail

ENV_FILE="/opt/autorental/packages/api/.env"
PASS_FILE="/root/.zoho-smtp-app-password"

ZOHO_HOST="${ZOHO_SMTP_HOST:-smtp.zoho.com}"
ZOHO_PORT="${ZOHO_SMTP_PORT:-465}"
ZOHO_SECURE="${ZOHO_SMTP_SECURE:-true}"
ZOHO_USER="${ZOHO_SMTP_USER:-info@autotorental.com}"
ZOHO_FROM="${ZOHO_FROM:-Auto to Rental <info@autotorental.com>}"

if [[ -n "${ZOHO_SMTP_PASS:-}" ]]; then
  ZOHO_PASS="$ZOHO_SMTP_PASS"
elif [[ -f "$PASS_FILE" ]]; then
  ZOHO_PASS="$(tr -d '\n\r' < "$PASS_FILE")"
else
  echo "✗ Missing Zoho App Password."
  echo ""
  echo "1. Zoho Mail → Settings → Security → App Passwords → Generate"
  echo "2. Then run:"
  echo "   echo 'YOUR_APP_PASSWORD' > $PASS_FILE"
  echo "   chmod 600 $PASS_FILE"
  echo "   $0"
  exit 1
fi

upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

upsert_env "ZOHO_SMTP_HOST" "$ZOHO_HOST"
upsert_env "ZOHO_SMTP_PORT" "$ZOHO_PORT"
upsert_env "ZOHO_SMTP_SECURE" "$ZOHO_SECURE"
upsert_env "ZOHO_SMTP_USER" "$ZOHO_USER"
upsert_env "ZOHO_SMTP_PASS" "$ZOHO_PASS"
upsert_env "ZOHO_FROM" "$ZOHO_FROM"

export PGPASSWORD
PGPASSWORD=$(grep '^DATABASE_URL=' "$ENV_FILE" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

db_upsert() {
  local key="$1" val="$2" secret="$3"
  local exists
  exists=$(psql -h localhost -U autorental -d autorental_db -tAc "SELECT 1 FROM app_setting WHERE key='${key}' LIMIT 1")
  if [[ "$exists" == "1" ]]; then
    psql -h localhost -U autorental -d autorental_db -c \
      "UPDATE app_setting SET value = \$v\$$val\$v\$, is_secret = ${secret}, updated_at = NOW() WHERE key = '${key}';" >/dev/null
  else
    psql -h localhost -U autorental -d autorental_db -c \
      "INSERT INTO app_setting (key, value, is_secret) VALUES ('${key}', \$v\$$val\$v\$, ${secret});" >/dev/null
  fi
}

db_upsert "zoho_smtp_host" "$ZOHO_HOST" "false"
db_upsert "zoho_smtp_port" "$ZOHO_PORT" "false"
db_upsert "zoho_smtp_secure" "$ZOHO_SECURE" "false"
db_upsert "zoho_smtp_user" "$ZOHO_USER" "false"
db_upsert "zoho_smtp_pass" "$ZOHO_PASS" "true"
db_upsert "zoho_from_email" "$ZOHO_FROM" "false"

export ZOHO_PASS ZOHO_HOST ZOHO_PORT ZOHO_SECURE ZOHO_USER
cd /opt/autorental/packages/api
node --input-type=module -e "
import nodemailer from 'nodemailer';
const t = nodemailer.createTransport({
  host: process.env.ZOHO_HOST,
  port: Number(process.env.ZOHO_PORT),
  secure: process.env.ZOHO_SECURE === 'true',
  auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_PASS },
});
await t.verify();
console.log('✓ Zoho SMTP verified for', process.env.ZOHO_USER);
"

echo "✓ Zoho Mail SMTP saved (.env + admin Integrations DB)"
pm2 restart autorental-api >/dev/null 2>&1 && echo "✓ API restarted" || echo "→ Run: pm2 restart autorental-api"
