#!/bin/bash
set -e

echo "🌸 Rosanah Cleaners - Setup Script"
echo "======================================"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js v18+ required. You have $(node --version)"
  exit 1
fi

echo "✅ Node.js $(node --version) found"

# Install backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo ""
echo "To start the system:"
echo ""
echo "  Terminal 1 (Backend):   cd backend && npm run dev"
echo "  Terminal 2 (Frontend):  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "Default logins:"
echo "  Admin:      admin / admin123"
echo "  Reception:  reception / reception123"
echo "  Driver:     driver / driver123"
echo ""
