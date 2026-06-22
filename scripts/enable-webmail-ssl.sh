#!/bin/bash
# Run after webmail + mail DNS A records point to this VPS.
set -euo pipefail
certbot --nginx -d webmail.autotorental.com -d mail.autotorental.com --non-interactive --agree-tos --register-unsafely-without-email
systemctl reload nginx
echo "SSL enabled for webmail.autotorental.com and mail.autotorental.com"
