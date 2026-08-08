@echo off
REM setup.bat — Run this once to set up and start the YT Summarizer backend
REM Double-click this file or run it from Command Prompt

echo.
echo ==========================================
echo       YT Summarizer — Setup (Windows)
echo ==========================================
echo.

REM Move into backend folder
cd /d "%~dp0..\backend"

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

REM Create virtual environment
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    echo Done.
) else (
    echo Virtual environment already exists.
)

REM Activate it
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo Done.

REM .env setup
if not exist ".env" (
    echo.
    echo No .env file found.
    set /p api_key="Enter your Groq API key (get one free at https://console.groq.com): "
    echo GROQ_API_KEY=%api_key%> .env
    echo .env created.
) else (
    echo .env already exists.
)

REM Start server
echo.
echo Starting backend server on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --reload --port 8000 --host 0.0.0.0

pause
