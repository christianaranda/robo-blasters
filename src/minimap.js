export class MiniMapManager {
    constructor(canvas, scene, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scene = scene;
        this.camera = camera;
        
        this.mapSize = 200; // Size of mini-map in pixels
        this.mapScale = 0.35; // Scale factor for world to map coordinates (increased for closer zoom)
        this.centerX = this.mapSize / 2;
        this.centerY = this.mapSize / 2;
        
        // Colors
        this.playerColor = '#00ff00';
        this.enemyColor = '#ff0000';
        this.powerUpColor = '#00ffff';
        this.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.borderColor = '#ffffff';
    }
    
    update(playerPosition, enemies = [], powerUps = [], otherPlayers = []) {
        // Clear canvas
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw border
        this.ctx.strokeStyle = this.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw player (always at center)
        this.ctx.fillStyle = this.playerColor;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator (small line showing player facing direction)
        const directionLength = 8;
        this.ctx.strokeStyle = this.playerColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY);
        // Note: We'd need player rotation for accurate direction, for now just draw up
        this.ctx.lineTo(this.centerX, this.centerY - directionLength);
        this.ctx.stroke();
        
        // Draw enemies relative to player
        enemies.forEach(enemy => {
            if (!enemy || !enemy.position) return;
            
            const dx = enemy.position.x - playerPosition.x;
            const dz = enemy.position.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Only show enemies within map range
            if (distance > 20) return; // Map shows 20 unit radius (reduced for closer view)
            
            const mapX = this.centerX + dx * this.mapScale;
            const mapY = this.centerY + dz * this.mapScale;
            
            // Check if within map bounds
            if (mapX >= 0 && mapX <= this.mapSize && mapY >= 0 && mapY <= this.mapSize) {
                this.ctx.fillStyle = this.enemyColor;
                this.ctx.beginPath();
                this.ctx.arc(mapX, mapY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Draw power-ups relative to player
        powerUps.forEach(powerUp => {
            if (!powerUp || !powerUp.position || powerUp.isPickedUp) return;
            
            const dx = powerUp.position.x - playerPosition.x;
            const dz = powerUp.position.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Only show power-ups within map range
            if (distance > 20) return; // Map shows 20 unit radius (reduced for closer view)
            
            const mapX = this.centerX + dx * this.mapScale;
            const mapY = this.centerY + dz * this.mapScale;
            
            // Check if within map bounds
            if (mapX >= 0 && mapX <= this.mapSize && mapY >= 0 && mapY <= this.mapSize) {
                this.ctx.fillStyle = this.powerUpColor;
                this.ctx.beginPath();
                this.ctx.arc(mapX, mapY, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Draw other players (multiplayer)
        otherPlayers.forEach(otherPlayer => {
            if (!otherPlayer || !otherPlayer.position) return;
            
            const dx = otherPlayer.position.x - playerPosition.x;
            const dz = otherPlayer.position.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Only show players within map range
            if (distance > 20) return;
            
            const mapX = this.centerX + dx * this.mapScale;
            const mapY = this.centerY + dz * this.mapScale;
            
            // Check if within map bounds
            if (mapX >= 0 && mapX <= this.mapSize && mapY >= 0 && mapY <= this.mapSize) {
                this.ctx.fillStyle = '#00ff00'; // Green for other players
                this.ctx.beginPath();
                this.ctx.arc(mapX, mapY, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
}

