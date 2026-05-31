# Zoho Mail — إرسال بريد التطبيق (SMTP)

## 1) إنشاء App Password في Zoho

1. ادخل [Zoho Mail](https://mail.zoho.com) بحساب `info@autotorental.com` (أو الحساب الرئيسي للنطاق).
2. **Settings → Security → App Passwords** (أو Application-specific passwords).
3. أنشئ كلمة مرور جديدة للتطبيق (مثلاً `Auto to Rental VPS`).
4. انسخ الكلمة **مرة واحدة** — لن تظهر مرة أخرى.

> لا تستخدم كلمة مرور تسجيل الدخول العادية — Zoho يرفضها على SMTP (خطأ 535).

## 2) تثبيت الإعداد على السيرفر

```bash
# ضع كلمة مرور التطبيق (ملف محمي)
echo 'YOUR_ZOHO_APP_PASSWORD_HERE' > /root/.zoho-smtp-app-password
chmod 600 /root/.zoho-smtp-app-password

# تطبيق الإعداد + اختبار الاتصال
node /opt/autorental/scripts/setup-zoho-smtp.mjs

pm2 restart autorental-api
```

أو من لوحة الأدمن: **Settings → Integrations → Email (Zoho SMTP)** واحفظ الحقول.

## 3) القيم الافتراضية

| الحقل | القيمة |
|--------|--------|
| SMTP host | `smtp.zoho.com` |
| Port | `465` (SSL) |
| Username | `info@autotorental.com` |
| From | `Auto to Rental <info@autotorental.com>` |

إذا حسابك على **Zoho EU**: استخدم `smtp.zoho.eu` بدلاً من `smtp.zoho.com`.

## 4) DNS (استقبال البريد على Zoho)

في **Cloudflare → DNS** لنطاق `autotorental.com`:

| النوع | الاسم | القيمة |
|--------|--------|--------|
| MX | `@` | `mx.zoho.com` (أولوية 10) |
| MX | `@` | `mx2.zoho.com` (أولوية 20) |
| TXT | `@` | SPF من لوحة Zoho (مثل `v=spf1 include:zoho.com ~all`) |

أزل MX الخاص بـ Cloudflare Email Routing إن أردت الاستقبال على Zoho وليس Gmail.

## 5) ماذا يرسل التطبيق عبر Zoho؟

- إعادة تعيين كلمة مرور البائع / الأدمن
- إشعار المتابعين: سيارة جديدة (بعد موافقة الأدمن)
- إشعار المتابعين: عرض / خصم
- ردود صندوق الوارد من لوحة الأدمن

## 6) صندوق الوارد في لوحة الأدمن (IMAP)

لعرض **كل** بريد `info@autotorental.com` في **Dashboard → Inbox** (استقبال + إرسال + قراءة):

1. في [Zoho Mail](https://mail.zoho.com) بحساب `info@autotorental.com`:
   - **Settings → Mail Accounts → IMAP Access → Enable**
2. من الأدمن: **Inbox → Sync mailbox** (أو تلقائياً كل 5 دقائق عند فتح الصفحة).
3. مزامنة الخلفية (اختياري، كل 10 دقائق):

```bash
# أضف إلى crontab -e
*/10 * * * * /opt/autorental/scripts/sync-zoho-inbox.sh >> /var/log/zoho-inbox-sync.log 2>&1
```

| IMAP | القيمة |
|------|--------|
| Host | `imap.zoho.com` (أو `imap.zoho.eu` لحساب EU) |
| Port | `993` (SSL) |
| User / Pass | نفس `info@autotorental.com` و App Password مثل SMTP |

إذا ظهر خطأ *"yet to enable IMAP"* — فعّل IMAP من Zoho ثم اضغط Sync.

**إرسال** من اللوحة يعمل عبر SMTP (Compose / Reply) حتى قبل تفعيل IMAP.

## 7) اختبار

من الأدمن: Integrations → Email → أدخل بريدك في Test → **Send test**.

أو:

```bash
curl -X POST https://admin.autotorental.com/admin/settings/test \
  -H "Content-Type: application/json" \
  -H "Cookie: …" \
  -d '{"service":"email","to":"you@example.com"}'
```
