#!/bin/bash
# Simple script to run the FPS game

echo "Starting FPS Game server..."
echo "Open your browser and go to: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try different server options
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8080
elif command -v npx &> /dev/null; then
    npx http-server . -p 8080 -c-1
else
    echo "Error: No suitable web server found."
    echo "Please install Python 3 or Node.js to run this game."
    exit 1
fi


