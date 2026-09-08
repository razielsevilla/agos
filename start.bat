@echo off
setlocal

echo ============================================================
echo  AGOS — Starting backend + frontend
echo ============================================================
echo.

:: ── Resolve Python executable ─────────────────────────────────
set PYEXE=
where py >nul 2>&1
if %ERRORLEVEL% == 0 (
    set PYEXE=py
    echo [OK] Python launcher found: py
    goto :check_node
)
where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    set PYEXE=python
    echo [OK] Python found: python
    goto :check_node
)
where python3 >nul 2>&1
if %ERRORLEVEL% == 0 (
    set PYEXE=python3
    echo [OK] Python found: python3
    goto :check_node
)

echo [ERROR] Python not found. Install Python from https://python.org and add it to PATH.
pause
exit /b 1

:: ── Check Node / npm ─────────────────────────────────────────
:check_node
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org and add it to PATH.
    pause
    exit /b 1
)
echo [OK] npm found

:: ── Install backend deps if missing ──────────────────────────
echo.
echo [1/4] Checking backend dependencies...
%PYEXE% -c "import fastapi, uvicorn, sqlalchemy, pydantic" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo       Installing from requirements.txt...
    %PYEXE% -m pip install -r backend\requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] pip install failed. Check requirements.txt or your internet connection.
        pause
        exit /b 1
    )
) else (
    echo       All backend dependencies already installed.
)

:: ── Install frontend deps if missing ─────────────────────────
echo.
echo [2/4] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo       Running npm install...
    cd frontend
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    cd ..
) else (
    echo       node_modules already present.
)

:: ── Start backend in a new window ────────────────────────────
echo.
echo [3/4] Starting backend  ^(http://localhost:8000^)...
start "AGOS Backend" cmd /k "cd /d "%~dp0backend" && echo Starting AGOS backend... && %PYEXE% -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: ── Start frontend in a new window ───────────────────────────
echo.
echo [4/4] Starting frontend ^(http://localhost:5173^)...
start "AGOS Frontend" cmd /k "cd /d "%~dp0frontend" && echo Starting AGOS frontend... && npm run dev"

echo.
echo ============================================================
echo  Both servers are starting in separate windows.
echo  Backend  : http://localhost:8000
echo  API docs : http://localhost:8000/docs
echo  Frontend : http://localhost:5173
echo ============================================================
echo.
pause
