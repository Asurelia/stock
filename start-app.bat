@echo off
chcp 65001 >nul
echo Démarrage de StockPro (Supabase Edition)...
echo.
echo Le backend local Express n'est plus utilisé.
echo Connexion directe à Supabase.
echo.
start "StockPro Frontend" cmd /k "cd frontend && npm run dev"
echo Application lancée sur http://localhost:5173
pause
