@echo off
cd /d "%~dp0"
echo Daily Dilemma -^> http://localhost:8780
python -m http.server 8780
pause