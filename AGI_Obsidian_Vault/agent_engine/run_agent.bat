@echo off
echo Starting AGI 1.5 OMEGA EVOLUTION Runtime...
python run_agi_15.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python failed or not found in PATH.
    pause
)
