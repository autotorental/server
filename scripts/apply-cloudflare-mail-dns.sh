#!/usr/bin/env bash
# Update Cloudflare DNS for cPanel mail on autotorental.com
set -euo pipefail
ENV_FILE="${CPANEL_MAIL_ENV:-/root/.cpanel-mail.env}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN in $ENV_FILE}"
DOMAIN="${DOMAIN:-autotorental.com}"
IP="${MAIL_SERVER_IP:-65.108.37.209}"
MX="${MX_HOST:-mail.${DOMAIN}}"

cf() {
  curl -fsS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" "$@"
}

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  CLOUDFLARE_ZONE_ID=$(cf "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")
fi
echo "Zone ID: $CLOUDFLARE_ZONE_ID"

list_records() {
  cf "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?per_page=500"
}

upsert() {
  local type="$1" name="$2" content="$3" priority="${4:-}"
  local fqdn="$name"
  [[ "$name" == "@" ]] && fqdn="$DOMAIN" || fqdn="${name}.${DOMAIN}"
  local existing
  existing=$(list_records | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('result',[]):
  if r['type']=='$type' and r['name'] in ('$fqdn','$DOMAIN'):
    if '$type'!='MX' or str(r.get('priority',''))=='$priority':
      print(r['id']); break
")
  local body
  if [[ "$type" == "MX" ]]; then
    body=$(python3 -c "import json; print(json.dumps({'type':'MX','name':'$fqdn','content':'$content','priority':int('$priority'),'ttl':3600}))")
  else
    body=$(python3 -c "import json; print(json.dumps({'type':'$type','name':'$fqdn','content':'$content','ttl':3600,'proxied':False}))")
  fi
  if [[ -n "$existing" ]]; then
    cf -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${existing}" -d "$body" >/dev/null
    echo "Updated $type $name -> $content"
  else
    cf -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" -d "$body" >/dev/null
    echo "Created $type $name -> $content"
  fi
}

echo "Removing old Zoho/SES MX..."
list_records | python3 -c "
import sys,json,urllib.request,os
d=json.load(sys.stdin)
token=os.environ['CLOUDFLARE_API_TOKEN']
zone=os.environ['CLOUDFLARE_ZONE_ID']
for r in d.get('result',[]):
  if r['type']=='MX' and ('zoho.com' in r['content'] or 'amazonaws.com' in r['content']):
    req=urllib.request.Request(f\"https://api.cloudflare.com/client/v4/zones/{zone}/dns_records/{r['id']}\", method='DELETE', headers={'Authorization': f'Bearer {token}'})
    urllib.request.urlopen(req)
    print('Removed MX', r['content'])
" 

upsert A mail "$IP"
upsert A webmail "$IP"
upsert MX "@" "$MX" "${MX_PRIORITY:-10}"
upsert TXT "@" "${SPF_TXT:-v=spf1 a mx ip4:${IP} ~all}"

echo "Done. Verify:"
dig +short MX "$DOMAIN"
dig +short A "mail.${DOMAIN}"
