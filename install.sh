#!/usr/bin/env bash
set -e

# Antigravity Sanction Bypass One-Line Universal Installer (macOS & Linux)
TARGET_DIR="$HOME/.gemini/config/plugins/antigravity-sanction-bypass"
REPO_URL="https://github.com/m4tinbeigi-official/antigravity-sanction-bypass.git"

printf "\n[+] Installing Antigravity Sanction Bypass Plugin...\n"

# Verify Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "[-] Node.js is required but not found in PATH. Please install Node.js (v18+) and retry."
  exit 1
fi

# Clone or pull updates
if [ -d "$TARGET_DIR/.git" ]; then
  printf "[*] Updating existing installation at %s...\n" "$TARGET_DIR"
  git -C "$TARGET_DIR" pull --ff-only || true
else
  mkdir -p "$HOME/.gemini/config/plugins"
  rm -rf "$TARGET_DIR"
  printf "[*] Cloning plugin repository into %s...\n" "$TARGET_DIR"
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
fi

# Link CLI executable to user bin
BIN_TARGET="$HOME/.local/bin/agy-relay"
mkdir -p "$HOME/.local/bin"
ln -sf "$TARGET_DIR/scripts/cli.js" "$BIN_TARGET"
chmod +x "$TARGET_DIR/scripts/cli.js"
chmod +x "$TARGET_DIR/scripts/pre-invocation-hook.js"
chmod +x "$TARGET_DIR/scripts/relay-bridge.js"

# Start or restart daemon
printf "[*] Starting local relay bridge on port 19876...\n"
node "$TARGET_DIR/scripts/cli.js" restart

# Quick live test
node "$TARGET_DIR/scripts/cli.js" status

printf "\n[+] Successfully installed and activated!\n"
printf "    Web Panel: http://127.0.0.1:19876/\n"
printf "    CLI Tool:  agy-relay (located at %s)\n\n" "$BIN_TARGET"

# Open panel in browser if interactive terminal
if [ -t 1 ]; then
  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:19876/" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:19876/" || true
  fi
fi
