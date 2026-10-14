#!/usr/bin/env node
/**
 * Pre-Invocation Hook for Antigravity
 * Ensures the Vercel Relay Bridge is running and healthy whenever Antigravity is active.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { spawn } = require("child_process");

const PID_FILE = path.join(os.tmpdir(), "antigravity-sanction-relay.pid");
const BRIDGE_SCRIPT = path.join(__dirname, "relay-bridge.js");
const CONFIG_FILE = path.join(os.homedir(), ".gemini", "antigravity", "sanction-relay-config.json");

function isBridgeRunning() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!pid || isNaN(pid)) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return e.code === "EPERM";
    }
  } catch {
    return false;
  }
}

function ensureBridgeStarted() {
  if (isBridgeRunning()) return;
  try {
    const child = spawn(process.execPath, [BRIDGE_SCRIPT], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, DAEMON_MODE: "1" }
    });
    child.unref();
  } catch {}
}

async function main() {
  // Read stdin to satisfy hook contract
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  ensureBridgeStarted();

  let injectSteps = [];

  // Check if config indicates sanctioned status
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg.isSanctioned) {
        // Ephemeral reminder if needed
      }
    }
  } catch {}

  process.stdout.write(JSON.stringify({ injectSteps }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ injectSteps: [] }));
});
