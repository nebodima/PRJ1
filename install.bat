@echo off
echo ====================================
echo Installing HelpDesk Dependencies...
echo ====================================
echo.

echo Installing Backend dependencies...
cd backend
call npm install
cd ..

echo.
echo Installing Frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ====================================
echo Installation complete!
echo ====================================
echo.
echo Run "start.bat" to start the project
echo.
pause
