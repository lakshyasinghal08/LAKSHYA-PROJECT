@echo off
echo Starting Air Quality Dashboard Servers...
echo.

echo Starting Flask Backend Server...
start "Flask Backend Server" cmd /k "cd /d C:\Users\singh\OneDrive\Desktop\AQI_data && python AQI_learning\app.py"

echo Starting FastAPI Backend Server...
start "FastAPI Backend Server" cmd /k "cd /d C:\Users\singh\OneDrive\Desktop\AQI_data\AQI_learning && uvicorn fastapi_app:app --host 0.0.0.0 --port 5001 --reload"

echo Waiting for backends to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d C:\Users\singh\OneDrive\Desktop\AQI_data\demo_aqi && set PORT=0 && npm run dev"

echo.
echo All servers are starting...
echo Flask Backend: Dynamic port (check console output)
echo FastAPI Backend: http://localhost:5001
echo Frontend: Dynamic port (check console output)
echo.
echo Press any key to exit...
pause > nul


