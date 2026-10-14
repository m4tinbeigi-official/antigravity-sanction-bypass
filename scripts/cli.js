#!/usr/bin/env node
/**
 * agy-relay - Antigravity Sanction Bypass CLI
 * Multilingual CLI with English default and support for all Google-sanctioned region languages.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");

const HOME_DIR = os.homedir();
const CONFIG_FILE = path.join(HOME_DIR, ".gemini", "antigravity", "sanction-relay-config.json");
const PID_FILE = path.join(os.tmpdir(), "antigravity-sanction-relay.pid");
const BRIDGE_SCRIPT = path.join(__dirname, "relay-bridge.js");
const TRANSLATIONS_FILE = path.join(__dirname, "..", "locales", "translations.json");

let TRANSLATIONS = {};
try {
  if (fs.existsSync(TRANSLATIONS_FILE)) {
    TRANSLATIONS = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, "utf8"));
  }
} catch {}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch {}
  return {
    enabled: true,
    lang: "en",
    activeRelayUrl: "https://vercel-relay-71xprds6r-m4tinbeigiis-projects.vercel.app",
    bridgePort: 19876,
    lastCountry: "UNKNOWN",
    isSanctioned: false
  };
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving config:", e.message);
  }
}

function getLang(args) {
  const langArg = args.find(a => a.startsWith("--lang="));
  if (langArg) {
    return langArg.split("=")[1].trim();
  }
  const cfg = loadConfig();
  return cfg.lang || "en";
}

function t(key, lang = "en") {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"] || {};
  return dict[key] || TRANSLATIONS["en"]?.[key] || key;
}

function isRunning() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!pid || isNaN(pid)) return false;
    try {
      process.kill(pid, 0);
      return pid;
    } catch (e) {
      if (e.code === "EPERM") return pid;
      return false;
    }
  } catch {
    return false;
  }
}

async function queryBridge(pathStr, method = "GET", postData = null) {
  const cfg = loadConfig();
  const port = cfg.bridgePort || 19876;
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: port,
        path: pathStr,
        method: method,
        headers: postData ? { "Content-Type": "application/json" } : {},
        timeout: 4000
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ ok: true, statusCode: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ ok: true, statusCode: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Bridge request timeout" });
    });
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testRelay(urlStr) {
  const start = Date.now();
  try {
    const parsed = new URL(urlStr);
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: "/v1beta/models",
          method: "GET",
          headers: {
            host: parsed.hostname,
            "x-relay-target": "https://generativelanguage.googleapis.com",
            "x-relay-path": "/v1beta/models",
            "User-Agent": "Antigravity-Relay/1.0"
          },
          timeout: 8000
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            const latency = Date.now() - start;
            const ok =
              res.statusCode === 200 ||
              (res.statusCode === 403 && body.includes("unregistered callers")) ||
              body.includes("API Key");
            resolve({ ok, statusCode: res.statusCode, latencyMs: latency, bodyPreview: body.slice(0, 150) });
          });
        }
      );
      req.on("error", (e) => resolve({ ok: false, error: e.message, latencyMs: Date.now() - start }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Timeout (8s)", latencyMs: Date.now() - start });
      });
      req.end();
    });
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

async function cmdStatus(lang) {
  const cfg = loadConfig();
  const pid = isRunning();

  const labels = {
    en: {
      banner: "🚀 Antigravity Sanction Bypass Status (Vercel Relay)",
      daemon: "Daemon Process Status:",
      running: `\x1b[32mActive & Running (PID: ${pid})\x1b[0m`,
      stopped: "\x1b[31mStopped\x1b[0m",
      port: "Local Bridge Port:",
      country: "Detected Country:",
      sanction: "Sanction Status:",
      restricted: "\x1b[33mRestricted Region (Vercel Relay Active)\x1b[0m",
      free: "\x1b[32mDirect Connection (Unrestricted)\x1b[0m",
      relay: "Active Vercel Relay:",
      testing: "⚡ Testing live ping to Gemini via relay... ",
      success: (ms) => `\x1b[32mSuccess (${ms}ms)\x1b[0m`,
      failed: (err) => `\x1b[31mFailed (${err})\x1b[0m`,
      hint: "\x1b[33mHint: If this relay is throttled, run 'agy-relay set <your-vercel-url>'.\x1b[0m"
    },
    fa: {
      banner: "🚀 وضعیت دور زدن تحریم آنتی‌گرویتی (Vercel Relay)",
      daemon: "وضعیت سرویس پس‌زمینه:",
      running: `\x1b[32mفعال و در حال اجرا (PID: ${pid})\x1b[0m`,
      stopped: "\x1b[31mمتوقف شده\x1b[0m",
      port: "پورت پل محلی:",
      country: "کشور شناسایی‌شده:",
      sanction: "وضعیت تحریم:",
      restricted: "\x1b[33mمنطقه تحریم‌شده (رله ورسل فعال)\x1b[0m",
      free: "\x1b[32mاتصال مستقیم (بدون تحریم)\x1b[0m",
      relay: "رله ورسل فعال:",
      testing: "⚡ در حال تست پینگ رله به جمنای... ",
      success: (ms) => `\x1b[32mموفقیت‌آمیز (${ms}ms)\x1b[0m`,
      failed: (err) => `\x1b[31mناموفق (${err})\x1b[0m`,
      hint: "\x1b[33mراهنمایی: اگر این رله مسدود شده، دستور 'agy-relay set <link>' را بزنید.\x1b[0m"
    },
    ru: {
      banner: "🚀 Статус обхода ограничений Antigravity (Vercel Relay)",
      daemon: "Статус фонового сервиса:",
      running: `\x1b[32mАктивен и работает (PID: ${pid})\x1b[0m`,
      stopped: "\x1b[31mОстановлен\x1b[0m",
      port: "Локальный порт моста:",
      country: "Определенная страна:",
      sanction: "Статус санкций:",
      restricted: "\x1b[33mОграниченный регион (Vercel реле активно)\x1b[0m",
      free: "\x1b[32mПрямое подключение (Без ограничений)\x1b[0m",
      relay: "Активное Vercel реле:",
      testing: "⚡ Проверка пинга к Gemini через реле... ",
      success: (ms) => `\x1b[32mУспешно (${ms}ms)\x1b[0m`,
      failed: (err) => `\x1b[31mОшибка (${err})\x1b[0m`,
      hint: "\x1b[33mПодсказка: Для смены используйте 'agy-relay set <url>'.\x1b[0m"
    }
  };

  const l = labels[lang] || labels["en"];

  console.log("\n=======================================================");
  console.log(`   ${l.banner}`);
  console.log("=======================================================");
  console.log(`${l.daemon.padEnd(28)} ${pid ? l.running : l.stopped}`);
  console.log(`${l.port.padEnd(28)} http://127.0.0.1:${cfg.bridgePort || 19876}`);
  console.log(`${l.country.padEnd(28)} ${cfg.lastCountry || "Unknown"}`);
  console.log(`${l.sanction.padEnd(28)} ${cfg.isSanctioned ? l.restricted : l.free}`);
  console.log(`${l.relay.padEnd(28)} \x1b[36m${cfg.activeRelayUrl}\x1b[0m`);

  process.stdout.write(l.testing);
  const testRes = await testRelay(cfg.activeRelayUrl);
  if (testRes.ok) {
    console.log(l.success(testRes.latencyMs));
  } else {
    console.log(l.failed(testRes.error || `HTTP ${testRes.statusCode}`));
    console.log(l.hint);
  }
  console.log("=======================================================\n");
}

async function cmdSet(urlArg, lang) {
  if (!urlArg || !urlArg.startsWith("http")) {
    console.log("\n❌ Error: Please provide a valid URL starting with http:// or https://. Example:");
    console.log("   agy-relay set https://my-relay.vercel.app\n");
    return;
  }
  const cleanUrl = urlArg.replace(/\/$/, "");
  console.log(`\n⏳ Validating and testing relay: ${cleanUrl}...`);

  const testRes = await testRelay(cleanUrl);
  if (!testRes.ok) {
    console.log(`\x1b[31m⚠️ Warning: Relay returned error or timeout (${testRes.error || `HTTP ${testRes.statusCode}`}).\x1b[0m`);
  } else {
    console.log(`\x1b[32m✅ Relay verified successfully! Ping to Gemini: ${testRes.latencyMs}ms\x1b[0m`);
  }

  const cfg = loadConfig();
  cfg.activeRelayUrl = cleanUrl;
  saveConfig(cfg);

  await queryBridge("/api/set-relay", "POST", { url: cleanUrl });
  console.log(`\x1b[32m🎉 Active Vercel relay updated to '${cleanUrl}'.\x1b[0m\n`);
}

async function cmdTest(urlArg) {
  const cfg = loadConfig();
  const target = urlArg ? urlArg.replace(/\/$/, "") : cfg.activeRelayUrl;
  console.log(`\n🔍 Sending test request to Google Gemini via: ${target}...`);
  const res = await testRelay(target);
  if (res.ok) {
    console.log(`\x1b[32m✅ Success!\x1b[0m Response from Gemini received.`);
    console.log(`⏱️ Latency: ${res.latencyMs} ms`);
    console.log(`📊 HTTP Status: ${res.statusCode}`);
  } else {
    console.log(`\x1b[31m❌ Connection Failed:\x1b[0m ${res.error || `Status ${res.statusCode}`}`);
  }
  console.log("");
}

function cmdStart() {
  const pid = isRunning();
  if (pid) {
    console.log(`\x1b[33mRelay daemon is already running (PID: ${pid}).\x1b[0m`);
    return;
  }
  console.log("⏳ Starting Antigravity Sanction Relay background daemon...");
  const child = spawn(process.execPath, [BRIDGE_SCRIPT], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, DAEMON_MODE: "1" }
  });
  child.unref();

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const newPid = isRunning();
    if (newPid) {
      clearInterval(interval);
      console.log(`\x1b[32m✅ Relay bridge started successfully (PID: ${newPid}).\x1b[0m`);
    } else if (attempts >= 15) {
      clearInterval(interval);
      console.log("\x1b[31m❌ Daemon startup timed out.\x1b[0m");
    }
  }, 200);
}

function cmdStop() {
  const pid = isRunning();
  if (!pid) {
    console.log("Relay bridge is not running.");
    return;
  }
  try {
    if (process.platform === "win32") {
      process.kill(pid);
    } else {
      process.kill(pid, "SIGTERM");
    }
    if (fs.existsSync(PID_FILE)) {
      try { fs.unlinkSync(PID_FILE); } catch {}
    }
    console.log(`\x1b[32m✅ Service stopped (PID: ${pid}).\x1b[0m`);
  } catch (e) {
    console.error("Error stopping service:", e.message);
  }
}

function cmdLang(newLang) {
  const supported = ["en", "fa", "ru", "ar", "es", "ko", "be", "my"];
  if (!newLang || !supported.includes(newLang)) {
    console.log(`Supported languages: ${supported.join(", ")}`);
    console.log("Usage: agy-relay lang <en|fa|ru|ar|es|ko|be|my>");
    return;
  }
  const cfg = loadConfig();
  cfg.lang = newLang;
  saveConfig(cfg);
  console.log(`✅ Default language set to '${newLang}'.`);
}

function cmdGuide(lang) {
  const guideText = t("guide_title", lang);
  console.log(`
===================================================================
  📖 ${guideText}
===================================================================

${t("guide_step1", lang)}

${t("guide_step2", lang)}

${t("guide_step3", lang)}

===================================================================
`);
}

function cmdPatch() {
  console.log("ℹ️ In-place binary modification is disabled to protect Antigravity language_server.");
  console.log("💡 The Vercel relay runs automatically via PreInvocation hook on port 19876.");
  console.log("   To route CLI tools through it: export HTTP_PROXY=http://127.0.0.1:19876");
}

function cmdUnpatch() {
  console.log("ℹ️ Antigravity language_server is in native unpatched state.");
}

// Parse args
const rawArgs = process.argv.slice(2);
const cleanArgs = rawArgs.filter(a => !a.startsWith("--lang="));
const lang = getLang(rawArgs);

const cmd = cleanArgs[0] || "status";

switch (cmd) {
  case "status":
    cmdStatus(lang);
    break;
  case "set":
    cmdSet(cleanArgs[1], lang);
    break;
  case "test":
    cmdTest(cleanArgs[1]);
    break;
  case "start":
    cmdStart();
    break;
  case "stop":
    cmdStop();
    break;
  case "restart":
    cmdStop();
    setTimeout(cmdStart, 800);
    break;
  case "lang":
    cmdLang(cleanArgs[1]);
    break;
  case "patch":
    cmdPatch();
    break;
  case "unpatch":
    cmdUnpatch();
    break;
  case "guide":
  case "help":
    cmdGuide(lang);
    break;
  default:
    console.log("Commands: status, set <url>, test [url], start, stop, restart, patch, unpatch, lang <code>, guide");
    break;
}
