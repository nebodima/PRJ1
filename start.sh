#!/bin/bash

echo "===================================="
echo "Starting HelpDesk..."
echo "===================================="
echo ""

# Проверяем, установлены ли зависимости
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "Dependencies not found. Running install.sh first..."
    ./install.sh
fi

echo "Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting Frontend Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "===================================="
echo "HelpDesk servers are running..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo "===================================="
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Функция для остановки серверов при выходе
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Ловим сигнал завершения
trap cleanup SIGINT SIGTERM

# Ожидаем завершения процессов
wait
