---
name: anti-sanction-proxy
description: Automatically detects Google-sanctioned countries (Iran, Cuba, Syria, North Korea, Russia, Belarus, Myanmar, etc.), proxies Gemini traffic via Vercel Edge Relays, provides multilingual CLI and widget, and guides users on custom relay configuration.
---

# Antigravity Sanction Bypass & Vercel Relay Skill

This skill enables Antigravity and its underlying Gemini/Google Cloud Code models to operate seamlessly from sanctioned and restricted countries without encountering `403 Forbidden`, `Region Not Supported`, or connection drops.

## Supported Sanctioned Regions & Languages
- **English (`en`)** - Default
- **Persian (`fa`)** - Iran
- **Russian (`ru`)** - Russia, Belarus, Crimea/Donbas
- **Arabic (`ar`)** - Syria, Sudan
- **Spanish (`es`)** - Cuba
- **Korean (`ko`)** - North Korea (DPRK)
- **Belarusian (`be`)** - Belarus
- **Burmese (`my`)** - Myanmar

---

## When to Activate
- The user asks about proxy, bypass, sanction, or Vercel relay in any language.
- Antigravity or Gemini calls fail with:
  - `403 Forbidden`
  - `User location is not supported for the API use`
  - `Region restricted`
  - `PERMISSION_DENIED` due to geography
  - `ETIMEDOUT` or connection resets when calling Google APIs.
- The user wants to change, test, or deploy a Vercel relay URL.

---

## Agent Instructions & Runbook

### 1. Checking Status
Run the CLI tool (default English):
```bash
agy-relay status
```
Or in a specific language:
```bash
agy-relay status --lang=fa
agy-relay status --lang=ru
```

### 2. Testing Connection
Test latency and end-to-end communication to Gemini:
```bash
agy-relay test
```

### 3. Setting a Custom Vercel Relay
When the user provides a custom URL:
```bash
agy-relay set https://custom-relay.vercel.app
```
This updates persistent config (`~/.gemini/antigravity/sanction-relay-config.json`) and hot-reloads the daemon without restarting Antigravity.

### 4. Interactive Multilingual In-Chat Widget
Whenever the user asks about sanction bypass status, proxy settings, or wants to manage their relay visually, render the interactive widget:
```html
<agent-embed src="ui/widget.html"></agent-embed>
```

### 5. Guiding the User to Deploy Their Own Free Vercel Relay
If the public relay is ever throttled or blocked by an ISP:
```bash
cd ~/.gemini/config/plugins/antigravity-sanction-bypass/templates/vercel-relay
npx vercel --prod --yes
```
Then register the resulting URL:
```bash
agy-relay set <new-url>
```
