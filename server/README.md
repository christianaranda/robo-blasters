# Robo Blasters Multiplayer Server

This is the backend server for Robo Blasters multiplayer functionality.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on port 3000 by default (or the PORT environment variable).

## Environment Variables

- `PORT` - Server port (default: 3000)

## Features

- WebSocket-based real-time multiplayer
- Game room management (max 4 players per room)
- Party system with leader controls
- Player synchronization
- Game state management

## API

The server uses Socket.io for WebSocket communication. See `src/networkClient.js` for client-side implementation.

