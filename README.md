# Antigravity Sanction Bypass (Vercel Relay)

An official Antigravity plugin providing seamless, zero-config, high-speed access to Google Antigravity and Gemini models from sanctioned and geo-restricted regions (Iran, Cuba, Syria, North Korea, Russia, Belarus, Myanmar, etc.).

Works out of the box on all operating systems:
- **macOS**: Apple Silicon (M1, M2, M3, M4) and Intel (x86-64)
- **Windows**: Windows 10 and 11 (x64 and ARM64)
- **Linux**: Ubuntu, Debian, Arch, Fedora, openSUSE

---

## 🌐 Supported Languages
- [English (Default)](./README.md)
- [فارسی (Persian)](./docs/README.fa.md)
- [Русский (Russian)](./docs/README.ru.md)
- [العربية (Arabic)](./docs/README.ar.md)
- [Español (Spanish)](./docs/README.es.md)
- [한국어 (Korean)](./docs/README.ko.md)
- [Беларуская (Belarusian)](./docs/README.be.md)
- [မြန်မာစာ (Burmese)](./docs/README.my.md)

---

## ⚡ 1-Click Fast Installation

### macOS & Linux
Open terminal and run:
```bash
curl -fsSL https://raw.githubusercontent.com/m4tinbeigi-official/antigravity-sanction-bypass/main/install.sh | bash
```

### Windows (PowerShell)
Open PowerShell and run:
```powershell
irm https://raw.githubusercontent.com/m4tinbeigi-official/antigravity-sanction-bypass/main/install.ps1 | iex
```

### Universal Node.js (Any OS)
If you have Node.js installed:
```bash
git clone --depth 1 https://github.com/m4tinbeigi-official/antigravity-sanction-bypass.git ~/.gemini/config/plugins/antigravity-sanction-bypass
node ~/.gemini/config/plugins/antigravity-sanction-bypass/install.js
```

---

## 🖥️ Live Web Dashboard

Once installed, the local management dashboard is live on:
**`http://127.0.0.1:19876/`**

Built strictly adhering to **VibeFarsi** design and typography standards:
- **Instant On/Off Switch**: Toggle the entire relay bypass on or off with a single click.
- **Live Latency & Network Diagnostics**: Real-time ping test to Google Gemini servers with sub-second response times.
- **Technical 403 Validation**: Explains why Google's `HTTP 403 (unregistered callers)` response confirms 100% bypass of regional IP blocks and validates successful connection to Google's generative language infrastructure.
- **Relay URL Manager**: Switch between public relays and private personal relays on the fly without restarting.
- **Raw Response Terminal**: Live inspection of JSON payloads and HTTP response headers.

---

## ✨ Core Highlights

1. **Automatic Geo Detection**: Automatically identifies if you are connecting from a restricted region (`IR`, `CU`, `SY`, `KP`, `RU`, `BY`, `MM`) and activates the edge relay bridge.
2. **Anti-DNS-Poisoning Architecture**: If local ISP DNS alters or throttles `*.vercel.app` domains, the built-in bridge automatically routes traffic to Anycast IP fallbacks with preserved TLS SNI.
3. **Zero Binary Modification**: Does not touch, patch, or corrupt application binaries inside `/Applications/Antigravity.app`, preserving code signatures and Gatekeeper validation.
4. **Pre-Invocation Hook**: Antigravity automatically awakens the daemon on startup via standard hook integration.

---

## 🛠️ CLI Reference (`agy-relay`)

| Command | Description |
| :--- | :--- |
| `agy-relay status` | Display daemon status, detected country, and ping to Gemini |
| `agy-relay test [url]` | Test live connectivity and measure latency to Google Gemini |
| `agy-relay set <url>` | Set active Vercel relay URL and reload |
| `agy-relay start` | Start the background daemon on port `19876` |
| `agy-relay stop` | Stop the background daemon |
| `agy-relay restart` | Restart the daemon |
| `agy-relay lang <code>` | Set default language (`en`, `fa`, `ru`, `ar`, `es`, `ko`, `be`, `my`) |
| `agy-relay guide` | View the 1-minute personal Vercel deployment guide |

---

## 🚀 1-Minute Private Vercel Relay (Free)

Deploy your own high-speed relay on Vercel:
1. Log into your [Vercel](https://vercel.com) account.
2. Run:
   ```bash
   cd ~/.gemini/config/plugins/antigravity-sanction-bypass/templates/vercel-relay
   npx vercel --prod --yes
   ```
3. Set your newly generated deployment URL:
   ```bash
   agy-relay set https://your-app.vercel.app
   ```

---

## ⚙️ Architecture & Local Endpoints
- **Web Dashboard**: `http://127.0.0.1:19876/`
- **Gemini Proxy Route**: `http://127.0.0.1:19876/gemini/*`
- **Cloud Code Route**: `http://127.0.0.1:19876/cloudcode/*`
- **Toggle API**: `POST http://127.0.0.1:19876/api/toggle`
- **Status API**: `GET http://127.0.0.1:19876/status`
- **Configuration File**: `~/.gemini/antigravity/sanction-relay-config.json`
