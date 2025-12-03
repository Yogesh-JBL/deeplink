const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const port = 3000;
app.use(cookieParser());
 
const SECRET = "super-secret-key"; // change this!
const APP_SCHEME = "deeplinksevenvercelApp";
 
 
function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}
 
// ============= /ref =============
// app.get("/ref", (req, res) => {
//   const referralCode = req.query.code || "default";
//   const ts = Date.now();
 
//   // payload: "ABC123:timestamp"
//   const payload = `${referralCode}:${ts}`;
//   const signature = sign(payload);
 
//   // final cookie value
//   const cookieValue = Buffer.from(`${payload}:${signature}`).toString("base64");
 
//   res.cookie("ref_session", cookieValue, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "None",
//     path: "/",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });
 
//   console.log("🔐 Set referral cookie:", cookieValue);
 
//   res.redirect(
//     "https://apps.apple.com/in/app/smartdelta-stock-market-app/id1516582069"
//   );
// });
app.get("/ref", (req, res) => {
  const code = req.query.code || "default";
  const ts = Date.now();
  const payload = `${code}:${ts}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  const cookieValue = Buffer.from(`${payload}:${sig}`).toString("base64");
 
  res.cookie("ref_session", cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
 
  // *** INTERSTITIAL FIX ***
  res.send(`
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Redirecting…</title>
</head>
<body>
<p>Setting things up… Opening App Store in 3 seconds.</p>
<script>
          setTimeout(function() {
            window.location.href = "https://apps.apple.com/in/app/smartdelta-stock-market-app/id1516582069";
          }, 3000);
</script>
</body>
</html>
  `);
});
 
// ============= /referral-check =============
// app.get("/referral-check", (req, res) => {
//   const raw = req.cookies.ref_session;
//   const APP_SCHEME = "deeplinksevenvercelApp";
 
//   if (!raw) {
//     console.log("❌ No ref_session cookie!");
//     return res.redirect(`${APP_SCHEME}://callback?referral=none`);
//   }
 
//   try {
//     const decoded = Buffer.from(raw, "base64").toString("utf8");
//     const [referralCode, ts, sig] = decoded.split(":");
 
//     const payload = `${referralCode}:${ts}`;
//     if (sign(payload) !== sig) {
//       console.log("❌ Signature mismatch! Cookie hacked or corrupted.");
//       return res.redirect(`${APP_SCHEME}://callback?referral=none`);
//     }
 
//     console.log("✅ REFERRAL OK:", referralCode);
//     return res.redirect(
//       `${APP_SCHEME}://callback?referral=${encodeURIComponent(referralCode)}`
//     );
 
//   } catch (e) {
//     console.log("❌ Cookie parse failed:", e);
//     return res.redirect(`${APP_SCHEME}://callback?referral=none`);
//   }
// });
app.get("/referral-check", (req, res) => {
  const raw = req.cookies.ref_session;
 
  console.log("🔍 Incoming Cookie:", raw);
 
  if (!raw) {
    console.log("❌ No referral cookie → returning none");
    return res.redirect(`${APP_SCHEME}://callback?referral=none`);
  }
 
  try {
    // raw cookie is Base64 encoded → decode it
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    console.log("🔍 Decoded Cookie:", decoded);
 
    // Format MUST be: referralCode:timestamp:signature
    const parts = decoded.split(":");
    if (parts.length !== 3) {
      console.log("❌ Cookie format invalid");
      return res.redirect(`${APP_SCHEME}://callback?referral=none`);
    }
 
    const referralCode = parts[0];
    const timestamp = parts[1];
    const signature = parts[2];
 
    // Generate expected signature
    const payload = `${referralCode}:${timestamp}`;
    const expectedSig = sign(payload);
 
    if (signature !== expectedSig) {
      console.log("❌ Invalid signature → tampered cookie");
      return res.redirect(`${APP_SCHEME}://callback?referral=none`);
    }
 
    // Optional timestamp expiry (e.g., 7 days)
    // if (Date.now() - Number(timestamp) > 7 * 86400 * 1000) {
    //   console.log("❌ Referral expired");
    //   return res.redirect(`${APP_SCHEME}://callback?referral=none`);
    // }
 
    console.log("✅ Referral verified:", referralCode);
 
    const appURL =
      `${APP_SCHEME}://callback` +
      `?referral=${encodeURIComponent(referralCode)}`;
 
    console.log("➡ Redirecting to App:", appURL);
 
    return res.redirect(appURL);
 
  } catch (err) {
    console.log("❌ ERROR parsing referral cookie:", err);
    return res.redirect(`${APP_SCHEME}://callback?referral=none`);
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('Deep Link Server is running!');
});
 
// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});