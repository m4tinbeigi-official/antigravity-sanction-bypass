#!/usr/bin/env node
/**
 * Antigravity Sanction Bypass - Universal Cross-Platform Installer
 * Supported: macOS (Intel & Apple Silicon M1-M4), Windows (x64 & ARM64), Linux
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawn } = require("child_process");

const HOME = os.homedir();
const TARGET_DIR = path.join(HOME, ".gemini", "config", "plugins", "antigravity-sanction-bypass");
const REPO_URL = "https://github.com/m4tinbeigi-official/antigravity-sanction-bypass.git";

console.log("\n[+] Antigravity Sanction Bypass Universal Installer");
console.log(`[*] Platform: ${process.platform} (${process.arch}), Node: ${process.version}`);

try {
  const pluginsDir = path.join(HOME, ".gemini", "config", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });

  if (fs.existsSync(path.join(TARGET_DIR, ".git"))) {
    console.log(`[*] Updating existing installation in ${TARGET_DIR}...`);
    execSync("git pull --ff-only", { cwd: TARGET_DIR, stdio: "inherit" });
  } else {
    console.log(`[*] Cloning repository to ${TARGET_DIR}...`);
    execSync(`git clone --depth 1 ${REPO_URL} "${TARGET_DIR}"`, { stdio: "inherit" });
  }

  // Restart daemon
  const cliScript = path.join(TARGET_DIR, "scripts", "cli.js");
  console.log("[*] Initializing relay bridge daemon on port 19876...");
  execSync(`node "${cliScript}" restart`, { stdio: "inherit" });
  execSync(`node "${cliScript}" status`, { stdio: "inherit" });

  console.log("\n[+] Installation complete!");
  console.log("    Web Panel: http://127.0.0.1:19876/\n");

  // Attempt to open browser
  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    execSync(`${openCmd} http://127.0.0.1:19876/`);
  } catch {}
} catch (err) {
  console.error("[-] Installation failed:", err.message);
  process.exit(1);
}
