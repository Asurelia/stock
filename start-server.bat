@echo off
echo.
echo ========================================
echo   StockPro - Demarrage du Serveur
echo ========================================
echo.
cd /d "%~dp0server"
echo Demarrage du serveur Express...
npm start
pause
