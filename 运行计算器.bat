@echo off
echo Starting Exchange Rate Calculator...
echo -----------------------------------
echo 1. Starting Local Proxy Server (server.py)...
start /min cmd /k "python server.py"

echo 2. Waiting for server to initialize...
timeout /t 2 /nobreak >nul

echo 3. Opening Calculator in Browser...
start index.html

echo -----------------------------------
echo Done! You can minimize this window.
echo To stop the server, verify the 'python' window and close it.
