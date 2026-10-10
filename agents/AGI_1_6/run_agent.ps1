$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  Launching AGI 1.6 OMEGA NEXUS (PowerShell Launcher)..." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
$PyPath = "..\..\.venv\Scripts\python.exe"
if (Test-Path $PyPath) {
    & $PyPath run_agi_16.py
} else {
    python run_agi_16.py
}
