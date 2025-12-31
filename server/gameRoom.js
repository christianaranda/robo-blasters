export class GameRoom {
    constructor(roomId) {
        this.id = roomId;
        this.players = [];
        this.difficulty = 'medium';
        this.gameInProgress = false;
        this.gameState = null;
        this.createdAt = Date.now();
    }
    
    addPlayer(player) {
        if (this.players.length >= 4) {
            throw new Error('Room is full');
        }
        
        if (this.players.find(p => p.id === player.id)) {
            return; // Player already in room
        }
        
        this.players.push(player);
    }
    
    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }
    
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }
    
    getPlayers() {
        return [...this.players];
    }
    
    getPlayerCount() {
        return this.players.length;
    }
    
    setDifficulty(difficulty) {
        if (['easy', 'medium', 'hard', 'hardcore'].includes(difficulty)) {
            this.difficulty = difficulty;
        }
    }
    
    startGame() {
        if (this.gameInProgress) {
            return false;
        }
        
        this.gameInProgress = true;
        this.gameState = {
            startTime: Date.now(),
            targets: [],
            scores: {}
        };
        
        // Initialize scores for all players
        this.players.forEach(player => {
            this.gameState.scores[player.id] = 0;
        });
        
        return true;
    }
    
    endGame() {
        this.gameInProgress = false;
        this.gameState = null;
        
        // Reset ready status
        this.players.forEach(player => {
            player.isReady = false;
        });
    }
    
    isGameInProgress() {
        return this.gameInProgress;
    }
    
    updateScore(playerId, score) {
        if (this.gameState && this.gameState.scores) {
            this.gameState.scores[playerId] = score;
        }
    }
    
    getScores() {
        if (!this.gameState) return {};
        return { ...this.gameState.scores };
    }
}

