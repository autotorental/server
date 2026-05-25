# Cloudflare Email Routing — `info@autotorental.com`

Goal: receive emails sent to `info@autotorental.com` (and any other `@autotorental.com` aliases) and forward them to `alkhudarigroupuae@gmail.com`. Free, no DNS provider lock-in. Sending stays on Resend.

## What this is NOT
- It does NOT replace Resend (sending). Resend stays the outbound transport.
- It does NOT give you a fancy webmail. Replies happen from Gmail or the in-app Inbox (which uses Resend).

## One-time setup (≈ 5 minutes)

1. Sign in to https://dash.cloudflare.com → select `autotorental.com`.
2. Left sidebar → **Email** → **Email Routing** → **Get started**.
3. **Step 1 — Add a destination address.**
   - Enter `alkhudarigroupuae@gmail.com`.
   - Cloudflare emails you a verification code → click the link.
4. **Step 2 — Add DNS records.**
   - Cloudflare offers to add them automatically. Click **Add records and enable**.
   - Three MX records (`route1/2/3.mx.cloudflare.net`) + one TXT (`v=spf1 include:_spf.mx.cloudflare.net ~all`) are added.
5. **Step 3 — Create routes.**

   | Custom address | Action | Destination |
   |---|---|---|
   | `info@autotorental.com` | Send to | `alkhudarigroupuae@gmail.com` |
   | `support@autotorental.com` | Send to | `alkhudarigroupuae@gmail.com` |
   | `sales@autotorental.com` | Send to | `alkhudarigroupuae@gmail.com` |
   | `noreply@autotorental.com` | Send to | `alkhudarigroupuae@gmail.com` |
   | _Catch-all_ | Send to | `alkhudarigroupuae@gmail.com` |

6. Done. Test by mailing `info@autotorental.com` from a different account — it lands in Gmail within seconds.

## Conflict with Resend (sending)

Cloudflare's auto-added SPF record (`v=spf1 include:_spf.mx.cloudflare.net ~all`) covers RECEIVING. Resend needs its own SPF + DKIM for SENDING:

- Make sure you DON'T delete Resend's records.
- If both want to set the SPF TXT, MERGE them into one:
  ```
  v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all
  ```
  (`amazonses.com` is what Resend uses under the hood. Or whatever Resend instructed.)

- DKIM is per-provider (separate CNAME records) so they don't conflict.

- DMARC: a relaxed policy like `v=DMARC1; p=none; rua=mailto:alkhudarigroupuae@gmail.com` is fine while you tune.

## Sending from `info@autotorental.com` (reply-as in Gmail)

To reply *from* `info@autotorental.com` (rather than your Gmail address):

1. Gmail → Settings → Accounts → **Send mail as** → **Add another email address**.
2. Email: `info@autotorental.com`, Name: `Auto to Rental`.
3. SMTP server: `smtp.resend.com`, Port 465, Username: `resend`, Password: your Resend API key.
4. Verify (Cloudflare delivers the verification mail to Gmail).
5. Now Gmail's reply dropdown lets you pick `info@autotorental.com` as the sender.

Alternative: use the in-app **Inbox** page (admin.autotorental.com/dashboard/inbox) — already wired to Resend.

## Verification checklist after setup

```bash
# MX records reachable
dig +short MX autotorental.com    # should show route1/2/3.mx.cloudflare.net

# SPF includes both Cloudflare + Resend
dig +short TXT autotorental.com   # should contain v=spf1 with both includes

# Resend DKIM still present
dig +short CNAME resend._domainkey.autotorental.com
```

If any of those fail, fix in Cloudflare DNS before declaring success.
