#!/bin/bash

echo "========================================="
echo "🤖 Menyalakan Server AI (Backend)..."
echo "========================================="
cd backend
source .venv/bin/activate

# Matikan server lama jika masih nyangkut di port 8080
fuser -k 8080/tcp 2>/dev/null

# Jalankan uvicorn di background (tanpa menahan terminal)
uvicorn main:app --host 0.0.0.0 --port 8080 --reload &
BACKEND_PID=$!

sleep 3 # Tunggu 3 detik agar server Python siap

echo ""
echo "========================================="
echo "📱 Menyalakan Aplikasi HP (Frontend)..."
echo "========================================="
cd ..
npm start --clear

# Jika Anda menekan CTRL+C untuk mematikan npm, 
# script ini juga akan otomatis mematikan server Python
echo "Mematikan server..."
kill $BACKEND_PID 2>/dev/null
echo "Sampai jumpa! 👋"
