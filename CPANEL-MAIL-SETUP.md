# cPanel Mail + Cloudflare DNS — Auto to Rental

Use this when you host email on **cPanel** (Hostinger shared, etc.) and DNS on **Cloudflare**.

## What you need (send securely in chat or paste into `/root/.cpanel-mail.env`)

| Item | Where to get it |
|------|-----------------|
| `CPANEL_HOST` | cPanel URL hostname (e.g. `srv123.hostinger.com`) |
| `CPANEL_USER` | cPanel username |
| `CPANEL_API_TOKEN` | cPanel → **Security → Manage API Tokens** → Create |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → **My Profile → API Tokens** → Edit zone DNS |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → domain → Overview → Zone ID |
| `MAIL_SERVER_IP` | cPanel → **Server Information** or Hostinger panel |
| Mailbox passwords | Strong passwords for `info@`, `admin@`, etc. |

## One-command setup

```bash
cp /opt/autorental/scripts/cpanel-mail.env.example /root/.cpanel-mail.env
nano /root/.cpanel-mail.env   # fill everything
chmod 600 /root/.cpanel-mail.env
node /opt/autorental/scripts/setup-cpanel-mail.mjs
```

The script will:

1. Create mailboxes in cPanel via API
2. Update Cloudflare: `mail` A, MX → `mail.autotorental.com`, merge SPF, remove old Zoho MX
3. Point Auto to Rental API SMTP to cPanel (`mail.autotorental.com:465`)
4. Test SMTP and restart API

## After setup

- **Webmail:** `https://webmail.autotorental.com` or cPanel webmail URL from host
- **Admin test:** Integrations → Email → Test Email
- **Disable** Cloudflare Email Routing if enabled (conflicts with cPanel MX)

## Current DNS note (before setup)

MX today may point to Zoho + Amazon SES. The script removes Zoho/SES MX and sets cPanel MX.
