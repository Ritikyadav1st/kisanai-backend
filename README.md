# KisanAI Backend — Gemini Edition (FREE) 🌾

## Ye sab FREE hai:
- ✅ Google Gemini API — free, no card needed
- ✅ Vercel hosting — free
- ✅ GitHub — free

---

## Step 1 — Gemini API Key Lo (2 min)
1. https://aistudio.google.com/app/apikey par jao
2. Google account se login karo
3. "Create API Key" click karo
4. Key copy karo (AIzaSy.....)

---

## Step 2 — GitHub par Upload Karo
1. github.com/new → repo name: kisanai-backend → Create
2. "uploading an existing file" → saari files upload karo
3. Commit changes

---

## Step 3 — Vercel par Deploy Karo
1. vercel.com → Add New Project → kisanai-backend import karo
2. Deploy click karo
3. URL copy karo (e.g. https://kisanai-backend-abc.vercel.app)

---

## Step 4 — Environment Variables Add Karo
Vercel → Project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| GEMINI_API_KEY | AIzaSy... (aapki key) |

Save → Redeploy karo

---

## Step 5 — Test Karo
Browser mein kholo:
https://YOUR-URL.vercel.app/api/health

Dikhna chahiye:
{"status":"ok","services":{"ai_detect":"✅ ready",...}}

---

## Step 6 — App.js Update karo
App-Updated.js mein line 10:
const BACKEND_URL = 'https://YOUR-URL.vercel.app';

Phir APK rebuild karo:
eas build -p android --profile preview

---

## Baad mein Claude par Switch Karna Ho to:
1. console.anthropic.com se ANTHROPIC_API_KEY lo
2. api/detect.js, guide.js, chat.js replace karo (Claude wali files se)
3. Vercel mein ANTHROPIC_API_KEY add karo, Redeploy karo
