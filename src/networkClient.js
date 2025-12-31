import { io } from 'socket.io-client';

export class NetworkClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRoomId = null;
        this.playerId = null;
        this.playerName = null;
        this.isLeader = false;
        this.players = [];
        // Use environment variable if available (for build tools), otherwise default
        // Check if process exists (Node.js environment) before accessing process.env
        if (typeof process !== 'undefined' && process.env && process.env.SERVER_URL) {
            this.serverUrl = process.env.SERVER_URL;
        } else {
            // Fallback for browser environment where process is not defined
            this.serverUrl = 'http://localhost:3000';
        }
        
        // Event callbacks
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onReadyChanged = null;
        this.onAllReady = null;
        this.onDifficultyChanged = null;
        this.onGameStarting = null;
        this.onPlayerMoved = null;
        this.onPlayerShot = null;
        this.onTargetHit = null;
        this.onPlayerHealthUpdated = null;
        this.onLeaderChanged = null;
        this.onScoreUpdated = null;
        this.onTargetStateUpdated = null;
        this.onPowerUpPickedUp = null;
        this.onError = null;
    }
    
    connect() {
        if (this.socket && this.socket.connected) {
            return;
        }
        
        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.playerId = this.socket.id;
            console.log('Connected to server:', this.socket.id);
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Disconnected from server');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            if (this.onError) {
                this.onError({ message: 'Failed to connect to server' });
            }
        });
        
        // Room events
        this.socket.on('room-joined', (data) => {
            this.currentRoomId = data.roomId;
            this.players = data.players;
            if (this.onRoomJoined) {
                this.onRoomJoined(data);
            }
        });
        
        this.socket.on('room-created', (data) => {
            this.currentRoomId = data.roomId;
            this.players = data.players;
            this.isLeader = true;
            if (this.onRoomJoined) {
                this.onRoomJoined(data);
            }
        });
        
        this.socket.on('player-joined', (data) => {
            this.players.push(data.player);
            if (this.onPlayerJoined) {
                this.onPlayerJoined(data.player);
            }
        });
        
        this.socket.on('player-left', (data) => {
            this.players = this.players.filter(p => p.id !== data.playerId);
            if (this.onPlayerLeft) {
                this.onPlayerLeft(data.playerId);
            }
        });
        
        this.socket.on('player-ready-changed', (data) => {
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                player.isReady = data.isReady;
            }
            if (this.onReadyChanged) {
                this.onReadyChanged(data);
            }
        });
        
        this.socket.on('all-players-ready', () => {
            if (this.onAllReady) {
                this.onAllReady();
            }
        });
        
        this.socket.on('difficulty-changed', (data) => {
            if (this.onDifficultyChanged) {
                this.onDifficultyChanged(data.difficulty);
            }
        });
        
        this.socket.on('game-starting', (data) => {
            if (this.onGameStarting) {
                this.onGameStarting(data);
            }
        });
        
        // Game events
        this.socket.on('player-moved', (data) => {
            if (this.onPlayerMoved) {
                this.onPlayerMoved(data);
            }
        });
        
        this.socket.on('player-shot', (data) => {
            if (this.onPlayerShot) {
                this.onPlayerShot(data);
            }
        });
        
        this.socket.on('target-hit-confirmed', (data) => {
            if (this.onTargetHit) {
                this.onTargetHit(data);
            }
        });
        
        this.socket.on('player-health-updated', (data) => {
            if (this.onPlayerHealthUpdated) {
                this.onPlayerHealthUpdated(data);
            }
        });
        
        this.socket.on('leader-changed', (data) => {
            this.isLeader = data.playerId === this.playerId;
            if (this.onLeaderChanged) {
                this.onLeaderChanged(data);
            }
        });
        
        this.socket.on('score-updated', (data) => {
            if (this.onScoreUpdated) {
                this.onScoreUpdated(data);
            }
        });
        
        this.socket.on('target-state-updated', (data) => {
            if (this.onTargetStateUpdated) {
                this.onTargetStateUpdated(data);
            }
        });
        
        this.socket.on('powerup-picked-up', (data) => {
            if (this.onPowerUpPickedUp) {
                this.onPowerUpPickedUp(data);
            }
        });
        
        this.socket.on('error', (data) => {
            if (this.onError) {
                this.onError(data);
            }
        });
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoomId = null;
        this.players = [];
    }
    
    createRoom(playerName) {
        if (!this.socket || !this.isConnected) {
            this.connect();
        }
        
        this.playerName = playerName;
        this.socket.emit('create-room', { playerName });
    }
    
    joinRoom(roomId, playerName) {
        if (!this.socket || !this.isConnected) {
            this.connect();
        }
        
        this.playerName = playerName;
        this.socket.emit('join-room', { roomId, playerName });
    }
    
    toggleReady() {
        if (this.socket && this.isConnected) {
            this.socket.emit('toggle-ready');
        }
    }
    
    setDifficulty(difficulty) {
        if (this.socket && this.isConnected && this.isLeader) {
            this.socket.emit('set-difficulty', { difficulty });
        }
    }
    
    startGame() {
        if (this.socket && this.isConnected && this.isLeader) {
            this.socket.emit('start-game');
        }
    }
    
    sendPlayerMove(position, rotation) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('player-move', {
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                rotation: {
                    x: rotation.x,
                    y: rotation.y,
                    z: rotation.z
                }
            });
        }
    }
    
    sendPlayerShoot(weaponType, direction) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('player-shoot', {
                weaponType,
                direction: {
                    x: direction.x,
                    y: direction.y,
                    z: direction.z
                }
            });
        }
    }
    
    sendTargetHit(targetId, damage, hitPoint) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('target-hit', {
                targetId,
                damage,
                hitPoint: {
                    x: hitPoint.x,
                    y: hitPoint.y,
                    z: hitPoint.z
                }
            });
        }
    }
    
    sendPlayerHealth(health, maxHealth) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('player-health', {
                health,
                maxHealth
            });
        }
    }
    
    sendScoreUpdate(score) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('score-update', { score });
        }
    }
    
    sendTargetState(targetId, health, position, isDestroyed) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('target-state', {
                targetId,
                health,
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                isDestroyed
            });
        }
    }
    
    sendPowerUpPicked(powerUpId, type) {
        if (this.socket && this.isConnected && this.currentRoomId) {
            this.socket.emit('powerup-picked', {
                powerUpId,
                type
            });
        }
    }
    
    getLatency() {
        if (this.socket && this.socket.connected) {
            // Socket.io doesn't expose ping directly, so we'll estimate
            return 0; // Could implement ping/pong for actual latency
        }
        return 0;
    }
}

