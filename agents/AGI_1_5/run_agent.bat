@echo off
echo Starting AGI 1.5 OMEGA EVOLUTION from agents/AGI_1_5...
python run_agi_15.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python failed or not found in PATH.
    pause
)
