export class PlayerSession {
    constructor(id, name, roomId) {
        this.id = id;
        this.name = name;
        this.roomId = roomId;
        this.isReady = false;
        this.isLeader = false;
        this.health = 100;
        this.maxHealth = 100;
        this.position = { x: 0, y: 1.7, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.joinedAt = Date.now();
    }
    
    setReady(ready) {
        this.isReady = ready;
    }
    
    setHealth(health, maxHealth = 100) {
        this.health = Math.max(0, Math.min(maxHealth, health));
        this.maxHealth = maxHealth;
    }
    
    updatePosition(position) {
        this.position = { ...position };
    }
    
    updateRotation(rotation) {
        this.rotation = { ...rotation };
    }
}

