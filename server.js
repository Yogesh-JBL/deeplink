// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());

// const SECRET = process.env.REF_SECRET || 'super-secret-key-please-change';
const SECRET = 'deeplinksevenvercelApp';
const APP_SCHEME = 'deeplinksevenvercelApp';
const IS_PROD = 'production';

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

/**
 * /ref
 * - sets signed cookie
 * - serves interstitial that redirects to App Store after a short delay
 */
app.get('/ref', (req, res) => {
  const code = req.query.code || 'default';
  const ts = Date.now();
  const payload = `${code}:${ts}`;
  const signature = sign(payload);
  const cookieValue = Buffer.from(`${payload}:${signature}`).toString('base64');

  // Use secure:true only when using HTTPS (production). For local dev you can set secure:false.
  res.cookie('ref_session', cookieValue, {
    // DO NOT set httpOnly (Safari may not persist it before App Store redirect)
    domain: 'deeplink-swart.vercel.app',
    httpOnly: false,
    secure: true,        // true on Vercel (HTTPS). false on local http.
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Interstitial HTML: allow Safari to persist cookie before redirecting to App Store
  res.send(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Opening App Store…</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align:center; padding:40px; color:#222; }
      .btn { display:inline-block; padding:12px 18px; background:#0070f3; color:#fff; border-radius:8px; text-decoration:none; margin-top:16px; }
    </style>
  </head>
  <body>
    <h2>Preparing your installation…</h2>
    <p>We’ll open the App Store in a moment. If it doesn’t open automatically, tap the button below.</p>
    <a class="btn" href="https://apps.apple.com/in/app/smartdelta-stock-market-app/id1516582069">Open App Store</a>
    <script>
      // small delay ensures Safari writes cookies before navigation
      setTimeout(function(){ window.location.href = "https://apps.apple.com/in/app/smartdelta-stock-market-app/id1516582069"; }, 1500);
    </script>
  </body>
</html>
  `);
});

/**
 * /referral-check
 * - reads signed cookie, validates signature and redirects to app scheme
 */
app.get('/referral-check', (req, res) => {
  const raw = req.cookies.ref_session;
  console.log('Incoming cookie:', raw);

  if (!raw) {
    return res.redirect(`${APP_SCHEME}://callback?referral=none`);
  }

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8'); // returns "code:ts:sig"
    const parts = decoded.split(':');
    if (parts.length !== 3) return res.redirect(`${APP_SCHEME}://callback?referral=none`);

    const [referralCode, timestamp, signature] = parts;
    const payload = `${referralCode}:${timestamp}`;
    const expected = sign(payload);

    if (signature !== expected) return res.redirect(`${APP_SCHEME}://callback?referral=none`);

    // Optional: expiry check
    // if (Date.now() - Number(timestamp) > 7*24*60*60*1000) return res.redirect(`${APP_SCHEME}://callback?referral=none`);

    const appUrl = `${APP_SCHEME}://callback?referral=${encodeURIComponent(referralCode)}&ts=${encodeURIComponent(timestamp)}`;
    console.log('Redirecting to app:', appUrl);
    return res.redirect(appUrl);
  } catch (err) {
    console.error('Cookie parse error', err);
    return res.redirect(`${APP_SCHEME}://callback?referral=none`);
  }
});

app.get('/', (req, res) => res.send('Deep link server running'));

app.listen(port, () => console.log(`Server listening on ${port}`));