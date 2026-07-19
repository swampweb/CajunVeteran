@echo off
curl -s -X POST http://localhost:3000/api/shutdown >nul 2>nul
exit
