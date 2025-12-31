#!/bin/bash

cd "$(dirname "$0")"

echo "========================================="
echo "  Starting FPS Game Server"
echo "========================================="
echo ""

# Try Python 3
if command -v python3 &> /dev/null; then
    echo "Starting server with Python 3..."
    python3 -m http.server 8080 &
    SERVER_PID=$!
    sleep 2
    
    # Check if server started
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "✓ Server started successfully!"
        echo "✓ Server running on http://localhost:8080"
        echo "✓ Opening browser..."
        echo ""
        echo "Press Ctrl+C to stop the server"
        echo ""
        open http://localhost:8080 2>/dev/null || echo "Please open http://localhost:8080 in your browser"
        
        # Wait for user to stop
        wait $SERVER_PID
    else
        echo "✗ Failed to start Python server"
        exit 1
    fi
# Try Python 2
elif command -v python &> /dev/null; then
    echo "Starting server with Python 2..."
    python -m SimpleHTTPServer 8080 &
    SERVER_PID=$!
    sleep 2
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "✓ Server started successfully!"
        echo "✓ Server running on http://localhost:8080"
        open http://localhost:8080 2>/dev/null || echo "Please open http://localhost:8080 in your browser"
        wait $SERVER_PID
    else
        echo "✗ Failed to start Python server"
        exit 1
    fi
else
    echo "✗ Error: Python is not installed or not in PATH"
    echo ""
    echo "Please install Python 3 to run this game."
    echo "Or use any other web server to serve the files from this directory."
    exit 1
fi


