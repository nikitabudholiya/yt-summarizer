#!/usr/bin/env bash
# setup.sh — Run this once to set up and start the YT Summarizer backend
# Usage:  chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e   # exit on any error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}╔══════════════════════════════════╗${NC}"
echo -e "${BOLD}║      YT Summarizer — Setup       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════╝${NC}"
echo ""

# ── Check Python version ──────────────────────────────────────────────────
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required="3.10"
if python3 -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)" 2>/dev/null; then
  echo -e "${GREEN}✓ Python $python_version found${NC}"
else
  echo -e "${RED}✗ Python 3.10+ required (found $python_version). Please upgrade.${NC}"
  exit 1
fi

# ── Move into backend ─────────────────────────────────────────────────────
cd "$(dirname "$0")/../backend"

# ── Virtual environment ───────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
  echo -e "${YELLOW}Creating virtual environment…${NC}"
  python3 -m venv .venv
  echo -e "${GREEN}✓ Virtual environment created${NC}"
else
  echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

source .venv/bin/activate

# ── Install dependencies ──────────────────────────────────────────────────
echo -e "${YELLOW}Installing dependencies (this may take a minute)…${NC}"
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── .env setup ───────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo -e "${YELLOW}No .env file found.${NC}"
  read -rp "Enter your Groq API key (get one free at https://console.groq.com): " api_key
  if [ -n "$api_key" ]; then
    echo "GROQ_API_KEY=$api_key" > .env
    echo -e "${GREEN}✓ .env created${NC}"
  else
    cp .env.example .env
    echo -e "${RED}⚠ No key entered. Edit backend/.env before starting.${NC}"
  fi
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

# ── Start server ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Starting backend server on http://localhost:8000${NC}"
echo -e "Press ${BOLD}Ctrl+C${NC} to stop."
echo ""
uvicorn main:app --reload --port 8000 --host 0.0.0.0
