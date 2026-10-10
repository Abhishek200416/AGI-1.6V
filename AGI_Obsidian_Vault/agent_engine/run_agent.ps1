Write-Host "Starting AGI 1.5 OMEGA EVOLUTION Runtime..." -ForegroundColor Cyan
python run_agi_15.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nError launching AGI 1.5. Ensure Python 3.11+ is installed." -ForegroundColor Red
}
