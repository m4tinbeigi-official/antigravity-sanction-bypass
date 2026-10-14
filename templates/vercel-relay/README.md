# ⚡ Antigravity & Gemini High-Performance Vercel Edge Relay

A 100% free, ultra-low latency **Vercel Edge Function** designed to proxy Google Antigravity, Gemini API, and Google Cloud Code traffic from US/EU datacenters, seamlessly bypassing regional geo-blocks and 403 errors.

---

## 🚀 1-Minute Deployment

### Method 1: Instant Terminal Deployment
1. Open your terminal and navigate to this folder:
```bash
cd ~/.gemini/config/plugins/antigravity-sanction-bypass/templates/vercel-relay
```

2. Run the deployment command (authenticate with your free Vercel account on first run):
```bash
npx vercel --prod --yes
```

3. Copy your generated deployment URL (e.g. `https://my-antigravity-relay.vercel.app`) and set it in Antigravity:
```bash
agy-relay set https://my-antigravity-relay.vercel.app
```

---

### Method 2: Via Vercel Web Dashboard
1. Push this folder to a GitHub repository.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Select your repository and click **Deploy**.
4. Set the generated domain using `agy-relay set <your-url>`.

---

## 🛡️ Features
- **Vercel Edge Runtime**: Global distribution with zero cold starts.
- **Full SSE Streaming Support**: Token-by-token streaming responses without buffering.
- **High Free Tier Quota**: Vercel's generous free tier covers up to 100GB of bandwidth monthly.

---

## 🇮🇷 راهنمای فارسی (استقرار سریع در ۱ دقیقه)
۱. ترمینال را باز کرده و دستور زیر را اجرا کنید:
```bash
cd ~/.gemini/config/plugins/antigravity-sanction-bypass/templates/vercel-relay
npx vercel --prod --yes
```
۲. لینک حاصل را در انتی‌گرویتی ثبت نمایید:
```bash
agy-relay set https://your-deployment.vercel.app
```
