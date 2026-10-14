# Antigravity Sanction Bypass One-Line Universal Installer (Windows 10/11)
$ErrorActionPreference = "Stop"

Write-Host "`n[+] Installing Antigravity Sanction Bypass Plugin on Windows..." -ForegroundColor Cyan

# Verify Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Node.js is required but not found in PATH. Please install Node.js from https://nodejs.org and rerun." -ForegroundColor Red
    exit 1
}

$TargetDir = Join-Path $HOME ".gemini\config\plugins\antigravity-sanction-bypass"
$RepoUrl = "https://github.com/m4tinbeigi-official/antigravity-sanction-bypass.git"

if (Test-Path "$TargetDir\.git") {
    Write-Host "[*] Updating existing installation..." -ForegroundColor Yellow
    git -C $TargetDir pull --ff-only
} else {
    $ParentDir = Split-Path $TargetDir -Parent
    if (-not (Test-Path $ParentDir)) {
        New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
    }
    Write-Host "[*] Cloning plugin repository into $TargetDir..." -ForegroundColor Yellow
    git clone --depth 1 $RepoUrl $TargetDir
}

# Start or restart daemon
Write-Host "[*] Starting local relay bridge daemon on port 19876..." -ForegroundColor Yellow
$CliScript = Join-Path $TargetDir "scripts\cli.js"
node $CliScript restart

# Status probe
node $CliScript status

Write-Host "`n[+] Successfully installed and activated!" -ForegroundColor Green
Write-Host "    Web Dashboard: http://127.0.0.1:19876/" -ForegroundColor Green

# Open browser
Start-Process "http://127.0.0.1:19876/"
