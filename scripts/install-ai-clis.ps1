# AI CLI Tool Installation Script for KaizerIDE
# This script installs local AI tools (Ollama) and bridges them for KaizerIDE.

$ErrorActionPreference = "Continue"

function Write-Header($msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Write-Success($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Blue
}

function Write-Warning($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

Write-Header "Starting Local AI Setup for KaizerIDE"

# --- Ollama Setup ---
Write-Header "Configuring Local LLM (Ollama)"
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Info "Ollama not found. Attempting to install via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install -e --id Ollama.Ollama
        Write-Success "Ollama installed. Please launch the Ollama app from your Start Menu."
    } else {
        Write-Warning "winget not found. Please download Ollama manually from https://ollama.com/"
    }
} else {
    Write-Success "Ollama is already installed."
}

Write-Info "Ensuring Qwen 2.5 Coder model is available..."
ollama pull qwen2.5-coder:7b
if ($LASTEXITCODE -eq 0) {
    Write-Success "Qwen 2.5 Coder (7B) is ready."
}

# --- LiteLLM Setup ---
Write-Header "Installing AI Bridge (LiteLLM)"
if (Get-Command pip -ErrorAction SilentlyContinue) {
    Write-Info "Installing LiteLLM..."
    pip install -U litellm[proxy]
    if ($LASTEXITCODE -eq 0) { Write-Success "LiteLLM installed." }
} else {
    Write-Warning "Python/pip not found. Cannot install LiteLLM bridge."
}

# --- Configure LiteLLM ---
Write-Header "Configuring Bridge Mappings"
$configPath = Join-Path $PSScriptRoot "litellm-config.yaml"
$configContent = @"
model_list:
  - model_name: qwen/qwen-2.5-coder-32b
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: opencode/opencode-ai
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: codex/codex-cli
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: letta/letta-local
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: mistral/mistral-vibe
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: qwen/*
    litellm_params:
      model: ollama/qwen2.5-coder:7b
  - model_name: "*"
    litellm_params:
      model: ollama/qwen2.5-coder:7b
litellm_settings:
  drop_params: true
"@

$configContent | Out-File -FilePath $configPath -Encoding utf8
Write-Success "Bridge configuration updated at $configPath"

# --- Update Startup Script ---
$startScriptPath = Join-Path $PSScriptRoot "start-local-ai.ps1"
$startScriptContent = @"
# Start LiteLLM Proxy on port 20128
Write-Host "Starting Local AI Bridge on port 20128..." -ForegroundColor Cyan
Write-Host "Ensure Ollama is running in your system tray." -ForegroundColor Gray

if (!(Get-Command litellm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: LiteLLM not found. Run 'npm run install-ai-clis' first." -ForegroundColor Red
    pause
    exit
}

`$configPath = Join-Path `$PSScriptRoot "litellm-config.yaml"
litellm --config "`$configPath" --port 20128 --host 0.0.0.0
"@

$startScriptContent | Out-File -FilePath $startScriptPath -Encoding utf8
Write-Success "Startup script updated at $startScriptPath"

Write-Header "Setup Complete"
Write-Info "1. Ensure Ollama is running."
Write-Info "2. Run 'npm run start-ai' to start the bridge."
Write-Info "3. In KaizerIDE, select 'Qwen 2.5 Coder (Script)' and leave API Key blank."
