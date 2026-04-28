# Start LiteLLM Proxy on port 20128
Write-Host "Starting Local AI Bridge on port 20128..." -ForegroundColor Cyan
Write-Host "Ensure Ollama is running in your system tray." -ForegroundColor Gray

if (!(Get-Command litellm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: LiteLLM not found. Run 'npm run install-ai-clis' first." -ForegroundColor Red
    pause
    exit
}

$configPath = Join-Path $PSScriptRoot "litellm-config.yaml"
litellm --config "$configPath" --port 20128 --host 0.0.0.0
