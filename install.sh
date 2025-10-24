#!/bin/bash

echo "===================================="
echo "Installing HelpDesk Dependencies..."
echo "===================================="
echo ""

echo "Installing Backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "===================================="
echo "Installation complete!"
echo "===================================="
echo ""
echo "Run './start.sh' to start the project"
echo ""
