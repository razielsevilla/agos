@echo off
setlocal EnableDelayedExpansion

:: Set console title
title AGOS - Command Center Launcher

:: Clear screen
cls

echo ===============================================================================
echo.
echo    /$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$ 
echo   /$$__  $$ /$$__  $$ /$$__  $$ /$$__  $$
echo  ^| $$  \ $$^| $$  \__/^| $$  \ $$^| $$  \__/
echo  ^| $$$$$$$$^| $$ /$$$$^| $$  ^| $$^|  $$$$$$ 
echo  ^| $$__  $$^| $$^|_  $$^| $$  ^| $$ \____  $$
echo  ^| $$  ^| $$^| $$  \ $$^| $$  ^| $$ /$$  \ $$
echo  ^|__/  ^|__/^|  $$$$$$/^|  $$$$$$/^|  $$$$$$/
echo              \______/  \______/  \______/ 
echo.
echo   AI for Geospatial Overflow Surveillance
echo   CDRRMO Command Center Launcher
echo ===============================================================================
echo.

:: ── Resolve Python executable ─────────────────────────────────
echo [*] Checking System Prerequisites...

set PYEXE=
where py >nul 2>&1
if %ERRORLEVEL% == 0 ( set PYEXE=py ) else (
    where python >nul 2>&1
    if %ERRORLEVEL% == 0 ( set PYEXE=python ) else (
        where python3 >nul 2>&1
        if %ERRORLEVEL% == 0 ( set PYEXE=python3 )
    )
)

if "%PYEXE%"=="" (
    echo [!] ERROR: Python not found. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)
echo  + Python found: !PYEXE!

:: ── Check Node / npm ─────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] ERROR: npm not found. Please install Node.js 18+ and add to PATH.
    pause
    exit /b 1
)
echo  + Node.js ^& npm found.
echo.

:: ── Setup Backend (Virtual Env & Dependencies) ────────────────
echo [*] Initializing Backend (FastAPI)...
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo  + Creating Python virtual environment...
    !PYEXE! -m venv .venv
)

set VENV_PY=".venv\Scripts\python.exe"

echo  + Verifying backend dependencies...
!VENV_PY! -c "import fastapi, uvicorn, sqlalchemy, pydantic" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  + Installing backend dependencies...
    !VENV_PY! -m pip install -q --disable-pip-version-check -r requirements.txt >nul 2>&1
)

if not exist "agos.db" (
    echo  + Seeding initial database...
    !VENV_PY! seed.py >nul
)
cd ..
echo.

:: ── Setup Frontend ───────────────────────────────────────────
echo [*] Initializing Frontend (React/Vite)...
cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo  + Installing frontend dependencies ^(this may take a moment^)...
    call npm install >nul
)
cd ..
echo.

:: ── Launch Servers ───────────────────────────────────────────
echo [*] Launching AGOS Services...
echo.

start "AGOS Backend API" cmd /k "title AGOS Backend API && cd /d "%~dp0backend" && echo ======================================== && echo  AGOS BACKEND API LOGS && echo ======================================== && echo. && .venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

start "AGOS Frontend Dashboard" cmd /k "title AGOS Frontend Dashboard && cd /d "%~dp0frontend" && echo ======================================== && echo  AGOS FRONTEND DEV SERVER && echo ======================================== && echo. && npm run dev"

echo ===============================================================================
echo   SYSTEM ONLINE
echo ===============================================================================
echo   - Backend API  : http://localhost:8000
echo   - API Docs     : http://localhost:8000/docs
echo   - Dashboard    : http://localhost:5173
echo ===============================================================================
echo.
echo Press any key to safely close this launcher window ^(Servers will keep running in their own windows^).
pause >nul
