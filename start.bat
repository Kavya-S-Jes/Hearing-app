@echo off
echo Starting Hearing Accounts App...
echo.

:: Get the folder where this bat file is located (works on any system)
set APP_DIR=%~dp0
set FRONTEND_DIR=%APP_DIR%frontend

:: Start Backend
start cmd /k "cd /d %APP_DIR% && .\venv\Scripts\activate && uvicorn main:app --reload"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend
start cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

:: Wait 5 seconds for frontend to start
timeout /t 5 /nobreak > nul

:: Open browser
start "" "http://localhost:5173"

echo.
echo App started! Browser will open automatically.
