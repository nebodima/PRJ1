@echo off
echo ====================================
echo Starting HelpDesk...
echo ====================================
echo.

echo Starting Backend Server...
start "HelpDesk Backend" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server...
start "HelpDesk Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo HelpDesk servers are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo ====================================
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:5173

echo.
echo To stop servers, close their windows
echo.
