@echo off
echo Starting SolarJi Application...
echo.
echo Starting Backend (Port 5000)...
start "SolarJi Backend" cmd /k "cd /d C:\Users\Pc\Desktop\solarji\backend && npm run dev"
timeout /t 3 /nobreak > nul
echo Starting Frontend (Port 5173)...
start "SolarJi Frontend" cmd /k "cd /d C:\Users\Pc\Desktop\solarji\frontend && npm run dev"
echo.
echo SolarJi is starting!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000/api
echo.
echo To seed the database (first time only):
echo   cd backend && npm run seed
pause