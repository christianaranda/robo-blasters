import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './gameRoom.js';
import { PlayerSession } from './player.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Store active game rooms
const gameRooms = new Map();
const playerSessions = new Map();

// Generate unique room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Clean up empty rooms periodically
setInterval(() => {
    for (const [roomId, room] of gameRooms.entries()) {
        if (room.getPlayerCount() === 0) {
            gameRooms.delete(roomId);
            console.log(`Cleaned up empty room: ${roomId}`);
        }
    }
}, 60000); // Every minute

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    let currentPlayer = null;
    let currentRoom = null;
    
    // Handle player joining
    socket.on('join-room', (data) => {
        const { roomId, playerName } = data;
        
        if (!roomId || !playerName) {
            socket.emit('error', { message: 'Room ID and player name required' });
            return;
        }
        
        // Check if room exists
        let room = gameRooms.get(roomId);
        if (!room) {
            // Create new room if it doesn't exist
            room = new GameRoom(roomId);
            gameRooms.set(roomId, room);
            console.log(`Created new room: ${roomId}`);
        }
        
        // Check if room is full
        if (room.getPlayerCount() >= 4) {
            socket.emit('error', { message: 'Room is full (max 4 players)' });
            return;
        }
        
        // Check if game is already in progress
        if (room.isGameInProgress()) {
            socket.emit('error', { message: 'Game is already in progress' });
            return;
        }
        
        // Create player session
        currentPlayer = new PlayerSession(socket.id, playerName, roomId);
        playerSessions.set(socket.id, currentPlayer);
        
        // Add player to room
        room.addPlayer(currentPlayer);
        currentRoom = room;
        
        socket.join(roomId);
        
        // Notify player of successful join
        socket.emit('room-joined', {
            roomId: roomId,
            players: room.getPlayers().map(p => ({
                id: p.id,
                name: p.name,
                isReady: p.isReady,
                isLeader: p.isLeader
            }))
        });
        
        // Notify other players in room
        socket.to(roomId).emit('player-joined', {
            player: {
                id: currentPlayer.id,
                name: currentPlayer.name,
                isReady: false,
                isLeader: false
            }
        });
        
        console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
    });
    
    // Handle creating a new room
    socket.on('create-room', (data) => {
        const { playerName } = data;
        const roomId = generateRoomId();
        
        const room = new GameRoom(roomId);
        gameRooms.set(roomId, room);
        
        currentPlayer = new PlayerSession(socket.id, playerName || 'Player', roomId);
        currentPlayer.isLeader = true; // First player is leader
        playerSessions.set(socket.id, currentPlayer);
        
        room.addPlayer(currentPlayer);
        currentRoom = room;
        
        socket.join(roomId);
        
        socket.emit('room-created', {
            roomId: roomId,
            players: [{
                id: currentPlayer.id,
                name: currentPlayer.name,
                isReady: false,
                isLeader: true
            }]
        });
        
        console.log(`Player ${playerName} created room ${roomId}`);
    });
    
    // Handle ready status toggle
    socket.on('toggle-ready', () => {
        if (!currentPlayer || !currentRoom) {
            socket.emit('error', { message: 'Not in a room' });
            return;
        }
        
        currentPlayer.isReady = !currentPlayer.isReady;
        
        // Broadcast ready status to all players in room
        io.to(currentRoom.id).emit('player-ready-changed', {
            playerId: currentPlayer.id,
            isReady: currentPlayer.isReady
        });
        
        // Check if all players are ready
        const allReady = currentRoom.getPlayers().every(p => p.isReady);
        if (allReady && currentRoom.getPlayerCount() >= 2) {
            io.to(currentRoom.id).emit('all-players-ready');
        }
    });
    
    // Handle difficulty change
    socket.on('set-difficulty', (data) => {
        if (!currentPlayer || !currentRoom) {
            socket.emit('error', { message: 'Not in a room' });
            return;
        }
        
        if (!currentPlayer.isLeader) {
            socket.emit('error', { message: 'Only party leader can change difficulty' });
            return;
        }
        
        currentRoom.setDifficulty(data.difficulty);
        io.to(currentRoom.id).emit('difficulty-changed', {
            difficulty: data.difficulty
        });
    });
    
    // Handle game start
    socket.on('start-game', () => {
        if (!currentPlayer || !currentRoom) {
            socket.emit('error', { message: 'Not in a room' });
            return;
        }
        
        if (!currentPlayer.isLeader) {
            socket.emit('error', { message: 'Only party leader can start game' });
            return;
        }
        
        if (currentRoom.getPlayerCount() < 1) {
            socket.emit('error', { message: 'Need at least 1 player to start' });
            return;
        }
        
        currentRoom.startGame();
        io.to(currentRoom.id).emit('game-starting', {
            difficulty: currentRoom.difficulty,
            players: currentRoom.getPlayers().map(p => ({
                id: p.id,
                name: p.name
            }))
        });
    });
    
    // Handle player movement
    socket.on('player-move', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        // Broadcast to other players
        socket.to(currentRoom.id).emit('player-moved', {
            playerId: currentPlayer.id,
            position: data.position,
            rotation: data.rotation
        });
    });
    
    // Handle player shooting
    socket.on('player-shoot', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        // Broadcast to other players
        socket.to(currentRoom.id).emit('player-shot', {
            playerId: currentPlayer.id,
            weaponType: data.weaponType,
            direction: data.direction,
            timestamp: Date.now()
        });
    });
    
    // Handle target hit
    socket.on('target-hit', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        // Server validates and broadcasts
        socket.to(currentRoom.id).emit('target-hit-confirmed', {
            playerId: currentPlayer.id,
            targetId: data.targetId,
            damage: data.damage,
            hitPoint: data.hitPoint
        });
    });
    
    // Handle player health update
    socket.on('player-health', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        currentPlayer.health = data.health;
        socket.to(currentRoom.id).emit('player-health-updated', {
            playerId: currentPlayer.id,
            health: data.health,
            maxHealth: data.maxHealth
        });
    });
    
    // Handle score update
    socket.on('score-update', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        currentRoom.updateScore(currentPlayer.id, data.score);
        
        // Broadcast score update to all players
        io.to(currentRoom.id).emit('score-updated', {
            playerId: currentPlayer.id,
            score: data.score,
            allScores: currentRoom.getScores()
        });
    });
    
    // Handle target state update (for synchronization)
    socket.on('target-state', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        // Broadcast target state to other players
        socket.to(currentRoom.id).emit('target-state-updated', {
            targetId: data.targetId,
            health: data.health,
            position: data.position,
            isDestroyed: data.isDestroyed
        });
    });
    
    // Handle power-up pickup
    socket.on('powerup-picked', (data) => {
        if (!currentPlayer || !currentRoom || !currentRoom.isGameInProgress()) {
            return;
        }
        
        // Broadcast power-up pickup to all players
        io.to(currentRoom.id).emit('powerup-picked-up', {
            playerId: currentPlayer.id,
            powerUpId: data.powerUpId,
            type: data.type
        });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        if (currentPlayer && currentRoom) {
            currentRoom.removePlayer(currentPlayer.id);
            
            // Notify other players
            socket.to(currentRoom.id).emit('player-left', {
                playerId: currentPlayer.id
            });
            
            // If leader left, assign new leader
            if (currentPlayer.isLeader && currentRoom.getPlayerCount() > 0) {
                const newLeader = currentRoom.getPlayers()[0];
                newLeader.isLeader = true;
                io.to(currentRoom.id).emit('leader-changed', {
                    playerId: newLeader.id
                });
            }
            
            // Clean up if room is empty
            if (currentRoom.getPlayerCount() === 0) {
                gameRooms.delete(currentRoom.id);
            }
        }
        
        playerSessions.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Robo Blasters server running on port ${PORT}`);
});

