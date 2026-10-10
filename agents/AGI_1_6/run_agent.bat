@echo off
title AGI 1.6 OMEGA NEXUS Launcher
cd /d "%~dp0"
echo ==============================================================================
echo   Launching AGI 1.6 OMEGA NEXUS...
echo ==============================================================================
if exist "..\..\.venv\Scripts\python.exe" (
    "..\..\.venv\Scripts\python.exe" run_agi_16.py
) else (
    python run_agi_16.py
)
pause
