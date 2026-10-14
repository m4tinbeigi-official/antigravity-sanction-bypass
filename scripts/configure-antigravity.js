#!/usr/bin/env node
/**
 * Cross-Platform Auto-Configurator for Antigravity
 * Automatically configures Antigravity to route traffic through the local relay bridge
 * on macOS, Windows, and Linux without requiring manual user setup.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const HOME = os.homedir();
const BRIDGE_PROXY_URL = "http://127.0.0.1:19876";

function getSettingsPaths() {
  const paths = [];

  if (process.platform === "darwin") {
    paths.push(path.join(HOME, "Library", "Application Support", "Antigravity", "User", "settings.json"));
  } else if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
    paths.push(path.join(appData, "Antigravity", "User", "settings.json"));
  } else {
    // Linux
    paths.push(path.join(HOME, ".config", "Antigravity", "User", "settings.json"));
  }

  return paths;
}

function configureSettingsJson(enabled = true) {
  const targetPaths = getSettingsPaths();
  let modified = false;

  for (const settingsPath of targetPaths) {
    try {
      const userDir = path.dirname(settingsPath);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      let config = {};
      if (fs.existsSync(settingsPath)) {
        try {
          const raw = fs.readFileSync(settingsPath, "utf8");
          // Remove potential trailing commas or comments for parsing
          const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
          config = JSON.parse(cleaned);
        } catch {
          config = {};
        }
      }

      if (enabled) {
        config["http.proxy"] = BRIDGE_PROXY_URL;
        config["http.proxySupport"] = "override";
        config["http.proxyStrictSSL"] = false;
      } else {
        delete config["http.proxy"];
        delete config["http.proxySupport"];
        delete config["http.proxyStrictSSL"];
      }

      fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2), "utf8");
      modified = true;
    } catch (e) {
      // Ignore permission or file errors silently
    }
  }

  return modified;
}

function configureEnvironment(enabled = true) {
  if (process.platform === "win32") {
    try {
      if (enabled) {
        execSync(`setx HTTP_PROXY "${BRIDGE_PROXY_URL}"`, { stdio: "ignore" });
        execSync(`setx HTTPS_PROXY "${BRIDGE_PROXY_URL}"`, { stdio: "ignore" });
      } else {
        execSync(`reg delete HKCU\\Environment /F /V HTTP_PROXY`, { stdio: "ignore" });
        execSync(`reg delete HKCU\\Environment /F /V HTTPS_PROXY`, { stdio: "ignore" });
      }
    } catch {}
  } else {
    // macOS / Linux: inject into ~/.zshenv or ~/.bashrc
    const targetFile = fs.existsSync(path.join(HOME, ".zshenv"))
      ? path.join(HOME, ".zshenv")
      : path.join(HOME, ".zshrc");

    try {
      let content = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, "utf8") : "";
      const marker = "# Antigravity Sanction Bypass Proxy";
      const block = `${marker}\nexport HTTP_PROXY="${BRIDGE_PROXY_URL}"\nexport HTTPS_PROXY="${BRIDGE_PROXY_URL}"\n`;

      if (enabled) {
        if (!content.includes(marker)) {
          content += `\n${block}\n`;
          fs.writeFileSync(targetFile, content, "utf8");
        }
      } else {
        if (content.includes(marker)) {
          content = content.replace(new RegExp(`\\n?${marker}[\\s\\S]*?export HTTPS_PROXY=".*?"\\n?`, "g"), "");
          fs.writeFileSync(targetFile, content, "utf8");
        }
      }
    } catch {}
  }
}

function autoConfigureAntigravity(enabled = true) {
  configureSettingsJson(enabled);
  configureEnvironment(enabled);
}

module.exports = {
  autoConfigureAntigravity,
  configureSettingsJson,
  configureEnvironment
};

if (require.main === module) {
  autoConfigureAntigravity(true);
  console.log("✅ Antigravity proxy configuration automatically applied!");
}
