#!/usr/bin/env node
/**
 * Antigravity Sanction Bypass - High Performance Vercel Relay Bridge
 * Zero-dependency daemon that detects sanctions and seamlessly routes Google/Gemini
 * traffic through Vercel Edge Relays with anti-DNS-poisoning fallbacks.
 */

const http = require("http");
const https = require("https");
const net = require("net");
const url = require("url");
const fs = require("fs");
const path = require("path");
const os = require("os");
const dns = require("dns");

const HOME_DIR = os.homedir();
const CONFIG_DIR = path.join(HOME_DIR, ".gemini", "antigravity");
const CONFIG_FILE = path.join(CONFIG_DIR, "sanction-relay-config.json");
const PID_FILE = path.join(os.tmpdir(), "antigravity-sanction-relay.pid");
const LOG_FILE = path.join(os.tmpdir(), "antigravity-sanction-relay.log");

const DEFAULT_PORT = 19876;
const DEFAULT_RELAY = "https://vercel-relay-71xprds6r-m4tinbeigiis-projects.vercel.app";
const SANCTIONED_COUNTRIES = new Set(["IR", "CU", "KP", "SY", "RU"]);

// Fallback IP addresses for Vercel edge network in case of local DNS filtering/poisoning
const VERCEL_FALLBACK_IPS = ["64.29.17.131", "216.198.79.131", "76.76.21.21"];

// State
let config = {
  enabled: true,
  autoDetect: true,
  activeRelayUrl: DEFAULT_RELAY,
  defaultRelayUrl: DEFAULT_RELAY,
  fallbackRelays: [DEFAULT_RELAY],
  bridgePort: DEFAULT_PORT,
  lastCountry: "UNKNOWN",
  isSanctioned: false,
  lastCheck: null,
  dnsFallbackEnabled: true
};

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  if (process.env.DEBUG || !process.env.DAEMON_MODE) {
    console.log(...args);
  }
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      const loaded = JSON.parse(raw);
      config = { ...config, ...loaded };
    } else {
      saveConfig();
    }
  } catch (err) {
    log("Error loading config:", err.message);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    log("Error saving config:", err.message);
  }
}

/**
 * Robust IP and Geo-location detector using multiple fast providers
 */
async function detectGeo() {
  const endpoints = [
    {
      url: "https://1.1.1.1/cdn-cgi/trace",
      parser: (text) => {
        const m = text.match(/loc=([A-Z]{2})/i);
        return m ? m[1].toUpperCase() : null;
      }
    },
    {
      url: "https://api.ip.sb/geoip",
      parser: (text) => {
        try {
          return JSON.parse(text).country_code;
        } catch {
          return null;
        }
      }
    },
    {
      url: "https://ipapi.co/country/",
      parser: (text) => text.trim().slice(0, 2).toUpperCase()
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(ep.url, { timeout: 3500 });
      if (res.ok) {
        const text = await res.text();
        const country = ep.parser(text);
        if (country && country.length === 2) {
          config.lastCountry = country;
          config.isSanctioned = SANCTIONED_COUNTRIES.has(country);
          config.lastCheck = new Date().toISOString();
          saveConfig();
          log(`Geo detected: country=${country}, sanctioned=${config.isSanctioned}`);
          return { country, isSanctioned: config.isSanctioned };
        }
      }
    } catch {
      // Try next
    }
  }

  // If geo lookup is blocked entirely (common in filtered networks), check if Google returns 403 or times out
  const googleBlocked = await checkDirectGoogleBlocked();
  if (googleBlocked) {
    config.isSanctioned = true;
    config.lastCountry = "IR (Inferred)";
    config.lastCheck = new Date().toISOString();
    saveConfig();
    log("Geo lookup failed, but direct Google access is blocked. Inferred sanctioned=true");
    return { country: config.lastCountry, isSanctioned: true };
  }

  return { country: config.lastCountry, isSanctioned: config.isSanctioned };
}

function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

async function checkDirectGoogleBlocked() {
  try {
    const res = await fetchWithTimeout("https://generativelanguage.googleapis.com", {
      method: "GET",
      timeout: 3000
    });
    // If Google returns 403 or region error, it is blocked
    return res.status === 403 || res.status === 451;
  } catch {
    return true; // Timeout or network failure to Google
  }
}

/**
 * Forward an HTTP/HTTPS request through the active Vercel Relay
 */
function forwardViaRelay(targetUrlStr, clientReq, clientRes, reqBody = null) {
  const targetUrl = new URL(targetUrlStr);
  const relayUrl = new URL(config.activeRelayUrl);

  const relayTarget = `${targetUrl.protocol}//${targetUrl.host}`;
  const relayPath = `${targetUrl.pathname}${targetUrl.search}`;

  const headers = { ...clientReq.headers };
  headers["host"] = relayUrl.hostname;
  headers["x-relay-target"] = relayTarget;
  headers["x-relay-path"] = relayPath;

  // Clean hop-by-hop headers
  delete headers["proxy-connection"];
  delete headers["connection"];
  delete headers["keep-alive"];

  const requestOptions = {
    hostname: relayUrl.hostname,
    port: relayUrl.port || 443,
    path: relayPath,
    method: clientReq.method,
    headers: headers,
    timeout: 30000
  };

  // Anti-DNS-Poisoning Custom Lookup
  if (config.dnsFallbackEnabled) {
    requestOptions.lookup = (hostname, opts, cb) => {
      dns.lookup(hostname, opts, (err, address, family) => {
        if (!err && address) {
          return cb(null, address, family);
        }
        // Fallback to known Vercel anycast IP
        const fallback = VERCEL_FALLBACK_IPS[Math.floor(Math.random() * VERCEL_FALLBACK_IPS.length)];
        log(`DNS for ${hostname} failed/poisoned. Using fallback IP: ${fallback}`);
        cb(null, fallback, 4);
      });
    };
    // Preserve SNI when connecting to raw IP
    requestOptions.servername = relayUrl.hostname;
  }

  const relayReq = https.request(requestOptions, (relayRes) => {
    clientRes.writeHead(relayRes.statusCode, relayRes.headers);
    relayRes.pipe(clientRes);
  });

  relayReq.on("error", (err) => {
    log(`Relay request error (${targetUrlStr}):`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "application/json" });
      clientRes.end(JSON.stringify({
        error: "Vercel Relay Gateway Error",
        message: err.message,
        activeRelayUrl: config.activeRelayUrl,
        hint: "Run 'agy-relay set <your-vercel-url>' to use a custom personal relay."
      }));
    }
  });

  relayReq.on("timeout", () => {
    relayReq.destroy();
    if (!clientRes.headersSent) {
      clientRes.writeHead(504, { "Content-Type": "application/json" });
      clientRes.end(JSON.stringify({
        error: "Vercel Relay Timeout",
        message: "The Vercel relay took too long to respond.",
        hint: "Check your internet connection or switch relay using 'agy-relay set <url>'."
      }));
    }
  });

  if (reqBody) {
    relayReq.write(reqBody);
    relayReq.end();
  } else {
    clientReq.pipe(relayReq);
  }
}

/**
 * Direct forward for non-sanctioned / non-Google traffic when relay is not needed
 */
function directForward(targetUrlStr, clientReq, clientRes) {
  const targetUrl = new URL(targetUrlStr);
  const isHttps = targetUrl.protocol === "https:";
  const clientLib = isHttps ? https : http;

  const headers = { ...clientReq.headers };
  headers["host"] = targetUrl.host;
  delete headers["proxy-connection"];

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: `${targetUrl.pathname}${targetUrl.search}`,
    method: clientReq.method,
    headers: headers,
    timeout: 30000
  };

  const directReq = clientLib.request(options, (directRes) => {
    clientRes.writeHead(directRes.statusCode, directRes.headers);
    directRes.pipe(clientRes);
  });

  directReq.on("error", (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "application/json" });
      clientRes.end(JSON.stringify({ error: "Direct Connection Error", message: err.message }));
    }
  });

  clientReq.pipe(directReq);
}

function shouldProxyThroughRelay(targetUrlStr) {
  if (!config.enabled) return false;
  // If auto-detect is enabled and country is not sanctioned, don't force relay
  if (config.autoDetect && !config.isSanctioned) {
    return false;
  }
  // Sanctioned or explicitly enabled: proxy all Google / Gemini / Cloud Code traffic
  try {
    const parsed = new URL(targetUrlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith("googleapis.com") ||
      host.endsWith("google.com") ||
      host.endsWith("gstatic.com") ||
      host.endsWith("gemini.google") ||
      host.endsWith("antigravity.google")
    );
  } catch {
    return false;
  }
}

function startServer(port = config.bridgePort) {
  const server = http.createServer((req, res) => {
    let parsed;
    try {
      parsed = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Malformed URL" }));
      return;
    }

    // 1. Management API
    if (parsed.pathname === "/health" || parsed.pathname === "/status") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(JSON.stringify({
        ok: true,
        bridgePort: port,
        country: config.lastCountry,
        isSanctioned: config.isSanctioned,
        activeRelayUrl: config.activeRelayUrl,
        enabled: config.enabled,
        lastCheck: config.lastCheck
      }, null, 2));
      return;
    }

    if (parsed.pathname === "/api/set-relay" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          if (!data.url || !data.url.startsWith("http")) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid URL. Must begin with http:// or https://" }));
            return;
          }
          config.activeRelayUrl = data.url.replace(/\/$/, "");
          saveConfig();
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ success: true, activeRelayUrl: config.activeRelayUrl }));
          log("Active relay updated to:", config.activeRelayUrl);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (parsed.pathname === "/api/test" && req.method === "GET") {
      testRelayConnection(config.activeRelayUrl).then((result) => {
        res.writeHead(result.ok ? 200 : 502, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify(result, null, 2));
      });
      return;
    }

    // 2. Reverse Proxy Paths
    if (parsed.pathname === "/gemini" || parsed.pathname.startsWith("/gemini/")) {
      const actualPath = (parsed.pathname.replace(/^\/gemini/, "") || "/") + (parsed.search || "");
      const targetUrl = `https://generativelanguage.googleapis.com${actualPath}`;
      forwardViaRelay(targetUrl, req, res);
      return;
    }

    if (parsed.pathname === "/cloudcode" || parsed.pathname.startsWith("/cloudcode/")) {
      const actualPath = (parsed.pathname.replace(/^\/cloudcode/, "") || "/") + (parsed.search || "");
      const targetUrl = `https://daily-cloudcode-pa.googleapis.com${actualPath}`;
      forwardViaRelay(targetUrl, req, res);
      return;
    }

    if (parsed.pathname === "/oauth2" || parsed.pathname.startsWith("/oauth2/")) {
      const actualPath = (parsed.pathname.replace(/^\/oauth2/, "") || "/") + (parsed.search || "");
      const targetUrl = `https://oauth2.googleapis.com${actualPath}`;
      forwardViaRelay(targetUrl, req, res);
      return;
    }

    // 3. Forward Proxy (Standard HTTP Proxy)
    if (req.url.startsWith("http://") || req.url.startsWith("https://")) {
      if (shouldProxyThroughRelay(req.url)) {
        forwardViaRelay(req.url, req, res);
      } else {
        directForward(req.url, req, res);
      }
      return;
    }

    // Default VibeFarsi Dashboard Panel
    const PANEL_PATH = path.join(__dirname, "..", "ui", "panel.html");
    if (parsed.pathname === "/" || parsed.pathname === "/panel" || parsed.pathname === "/test") {
      if (fs.existsSync(PANEL_PATH)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(PANEL_PATH, "utf8"));
        return;
      }
    }
  });

  // Handle HTTPS CONNECT tunneling
  server.on("connect", (req, clientSocket, head) => {
    const [targetHost, targetPortStr] = req.url.split(":");
    const targetPort = parseInt(targetPortStr, 10) || 443;

    // For standard CONNECT, establish direct TCP tunnel
    const serverSocket = net.connect(targetPort, targetHost, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on("error", (err) => {
      clientSocket.write(`HTTP/1.1 502 Bad Gateway\r\n\r\n`);
      clientSocket.end();
    });

    clientSocket.on("error", () => {
      serverSocket.end();
    });
  });

  server.listen(port, "127.0.0.1", () => {
    log(`Antigravity Sanction Relay running on http://127.0.0.1:${port}`);
    fs.writeFileSync(PID_FILE, String(process.pid), "utf8");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} already in use. Assuming bridge is already running.`);
      process.exit(0);
    } else {
      log("Server error:", err.message);
      process.exit(1);
    }
  });

  // Periodic geo re-check every 30 minutes
  setInterval(detectGeo, 30 * 60 * 1000);
}

/**
 * End-to-end test of the Vercel Relay connection to Google Gemini
 */
async function testRelayConnection(relayUrlStr) {
  const start = Date.now();
  try {
    const relayUrl = new URL(relayUrlStr);
    const targetHost = "https://generativelanguage.googleapis.com";
    const targetPath = "/v1beta/models";

    return new Promise((resolve) => {
      const options = {
        hostname: relayUrl.hostname,
        port: 443,
        path: targetPath,
        method: "GET",
        headers: {
          "host": relayUrl.hostname,
          "x-relay-target": targetHost,
          "x-relay-path": targetPath,
          "User-Agent": "Antigravity-Relay/1.0"
        },
        timeout: 8000
      };

      if (config.dnsFallbackEnabled) {
        options.lookup = (hostname, opts, cb) => {
          dns.lookup(hostname, opts, (err, address, family) => {
            if (!err && address) return cb(null, address, family);
            const fallback = VERCEL_FALLBACK_IPS[0];
            cb(null, fallback, 4);
          });
        };
        options.servername = relayUrl.hostname;
      }

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          const latencyMs = Date.now() - start;
          // Google returns 400 or 403 PERMISSION_DENIED (unregistered callers) when successfully reached
          const isSuccessfulBypass = res.statusCode === 200 ||
            (res.statusCode === 403 && body.includes("unregistered callers")) ||
            body.includes("API Key");
          resolve({
            ok: isSuccessfulBypass,
            statusCode: res.statusCode,
            latencyMs,
            relayUrl: relayUrlStr,
            message: isSuccessfulBypass ? "Relay connected successfully to Google Gemini!" : `Unexpected status: ${res.statusCode}`,
            bodyPreview: body.slice(0, 200)
          });
        });
      });

      req.on("error", (e) => {
        resolve({
          ok: false,
          latencyMs: Date.now() - start,
          relayUrl: relayUrlStr,
          message: `Connection failed: ${e.message}`
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          ok: false,
          latencyMs: Date.now() - start,
          relayUrl: relayUrlStr,
          message: "Connection timed out (8s limit)."
        });
      });

      req.end();
    });
  } catch (err) {
    return { ok: false, message: err.message, latencyMs: Date.now() - start };
  }
}

// Main initialization
loadConfig();
detectGeo().then(() => {
  startServer();
});
