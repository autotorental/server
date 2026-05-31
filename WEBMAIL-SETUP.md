# Webmail on VPS — `webmail.autotorental.com`

Mail server is installed on this VPS. SnappyMail is the web UI.

## 1. Cloudflare DNS (required — do this first)

Add these records in **Cloudflare → autotorental.com → DNS**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| **A** | `webmail` | `76.13.184.134` | DNS only (grey cloud) |
| **A** | `mail` | `76.13.184.134` | DNS only (grey cloud) |
| **MX** | `@` | `mail.autotorental.com` | priority **10** |

### Important about MX

If **Cloudflare Email Routing** is enabled (MX = `route*.mx.cloudflare.net`), incoming mail goes to Gmail/Cloudflare — **not** this VPS.

To receive mail in webmail on the VPS you must:

1. **Disable** Cloudflare Email Routing (or remove its MX records), **or**
2. Keep Gmail forwarding for some addresses and use VPS mailboxes only for addresses you route here.

After MX points to `mail.autotorental.com`, external senders can deliver to `@autotorental.com` on this server.

## 2. Enable HTTPS (after DNS propagates)

```bash
certbot --nginx -d webmail.autotorental.com -d mail.autotorental.com
```

Wait until `dig webmail.autotorental.com` shows `76.13.184.134`, then run the command above.

## 3. Open webmail

**URL:** https://webmail.autotorental.com

**Login:** full email address + password (examples):

| Email | Password file on server |
|-------|-------------------------|
| `info@autotorental.com` | `/root/.autorental-mail-info-password` |
| `admin@autotorental.com` | `/root/.autorental-mail-admin-password` |

SnappyMail is pre-configured for IMAP/SMTP on this server (`127.0.0.1`).

## 4. What runs on the VPS

| Service | Port | Purpose |
|---------|------|---------|
| Postfix | 25, 587 | Receive / send SMTP |
| Dovecot | 993 | IMAP (webmail reads mail) |
| SnappyMail | 443 (via nginx) | Web UI |
| nginx | 80/443 | `webmail.autotorental.com` |

## 5. Resend vs VPS webmail

- **Resend** = sending from the app (password reset, notifications). Check sent mail at [resend.com/emails](https://resend.com/emails).
- **VPS webmail** = full mailbox for `@autotorental.com` addresses on this server.

## 6. Add more mailboxes

```bash
# Generate password hash
doveadm pw -s SHA512-CRYPT

# Add line to /etc/postfix/vmailbox:
# user@autotorental.com autotorental.com/user/

# Add line to /etc/dovecot/users (see existing format)

postmap /etc/postfix/vmailbox
mkdir -p /var/mail/vhosts/autotorental.com/NEWUSER
chown vmail:mail /var/mail/vhosts/autotorental.com/NEWUSER
systemctl reload postfix dovecot
```

## 7. Troubleshooting

```bash
# Mail services
systemctl status postfix dovecot nginx php8.3-fpm

# Test login
doveadm auth test info@autotorental.com 'YOUR_PASSWORD'

# Mail logs
tail -f /var/log/mail.log
```
