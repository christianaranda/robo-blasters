import * as THREE from 'three';

export class PowerUp {
    constructor(type, position, scene, soundEffectManager = null) {
        this.type = type; // 'health', 'ammo', 'damage_boost'
        this.position = position.clone();
        this.scene = scene;
        this.soundEffectManager = soundEffectManager;
        this.isPickedUp = false;
        this.mesh = null;
        this.rotationSpeed = 2.0;
        this.bobSpeed = 2.0;
        this.bobAmount = 0.2;
        this.startY = position.y;
        this.time = 0;
        
        this.createMesh();
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // Base glow effect
        const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: this.getColor(),
            emissive: this.getColor(),
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        
        // Main icon based on type
        let iconGeometry;
        let iconMaterial;
        
        switch(this.type) {
            case 'health':
                // Health pack (cross shape)
                iconGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
                iconMaterial = new THREE.MeshStandardMaterial({
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 1.0
                });
                const cross1 = new THREE.Mesh(iconGeometry, iconMaterial);
                group.add(cross1);
                
                const cross2 = new THREE.Mesh(iconGeometry, iconMaterial);
                cross2.rotation.z = Math.PI / 2;
                group.add(cross2);
                break;
                
            case 'ammo':
                // Ammo box
                iconGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
                iconMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00ff00,
                    emissive: 0x00ff00,
                    emissiveIntensity: 1.0
                });
                const ammoBox = new THREE.Mesh(iconGeometry, iconMaterial);
                group.add(ammoBox);
                break;
                
            case 'damage_boost':
                // Damage boost (star/explosion shape)
                const starShape = new THREE.Shape();
                const spikes = 8;
                const outerRadius = 0.2;
                const innerRadius = 0.1;
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (i * Math.PI) / spikes;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) {
                        starShape.moveTo(x, y);
                    } else {
                        starShape.lineTo(x, y);
                    }
                }
                starShape.closePath();
                
                iconGeometry = new THREE.ExtrudeGeometry(starShape, {
                    depth: 0.05,
                    bevelEnabled: false
                });
                iconMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffff00,
                    emissive: 0xffff00,
                    emissiveIntensity: 1.0
                });
                const star = new THREE.Mesh(iconGeometry, iconMaterial);
                star.rotation.x = Math.PI / 2;
                group.add(star);
                break;
        }
        
        // Add pulsing particles
        for (let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: this.getColor(),
                emissive: this.getColor(),
                emissiveIntensity: 1.0,
                transparent: true,
                opacity: 0.5
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            const angle = (i / 5) * Math.PI * 2;
            particle.position.set(
                Math.cos(angle) * 0.5,
                0,
                Math.sin(angle) * 0.5
            );
            particle.userData.angle = angle;
            particle.userData.speed = 0.5 + Math.random() * 0.5;
            group.add(particle);
        }
        
        group.position.copy(this.position);
        this.mesh = group;
        this.scene.add(group);
    }
    
    getColor() {
        switch(this.type) {
            case 'health':
                return 0xff0000;
            case 'ammo':
                return 0x00ff00;
            case 'damage_boost':
                return 0xffff00;
            default:
                return 0xffffff;
        }
    }
    
    update(deltaTime) {
        if (this.isPickedUp || !this.mesh) return;
        
        this.time += deltaTime;
        
        // Rotate
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        
        // Bob up and down
        this.mesh.position.y = this.startY + Math.sin(this.time * this.bobSpeed) * this.bobAmount;
        
        // Animate particles
        this.mesh.children.forEach((child, index) => {
            if (child.userData.angle !== undefined) {
                const angle = child.userData.angle + this.time * child.userData.speed;
                const radius = 0.4 + Math.sin(this.time * 2) * 0.1;
                child.position.x = Math.cos(angle) * radius;
                child.position.z = Math.sin(angle) * radius;
                child.position.y = Math.sin(this.time * 3 + index) * 0.1;
            }
        });
    }
    
    pickup() {
        if (this.isPickedUp) return false;
        
        this.isPickedUp = true;
        
        // Play pickup sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('pickup');
        }
        
        // Remove from scene
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.mesh = null;
        }
        
        return true;
    }
    
    getPosition() {
        return this.position.clone();
    }
}

export class PowerUpManager {
    constructor(scene, soundEffectManager = null) {
        this.scene = scene;
        this.soundEffectManager = soundEffectManager;
        this.powerUps = [];
        this.spawnArea = {
            minX: -30,
            maxX: 30,
            minZ: -30,
            maxZ: 30,
            y: 0.5
        };
        this.maxPowerUps = 5; // Maximum power-ups on map at once
        this.spawnInterval = 10000; // Spawn new power-up every 10 seconds
        this.lastSpawnTime = 0;
    }
    
    spawnPowerUp(type = null) {
        if (this.powerUps.length >= this.maxPowerUps) return;
        
        // Random type if not specified
        if (!type) {
            const types = ['health', 'ammo', 'damage_boost'];
            type = types[Math.floor(Math.random() * types.length)];
        }
        
        const position = this.getRandomSpawnPosition();
        const powerUp = new PowerUp(type, position, this.scene, this.soundEffectManager);
        this.powerUps.push(powerUp);
        
        // Play spawn sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('powerup_spawn', { volume: 0.6 });
        }
        
        return powerUp;
    }
    
    getRandomSpawnPosition() {
        let x = Math.random() * (this.spawnArea.maxX - this.spawnArea.minX) + this.spawnArea.minX;
        let z = Math.random() * (this.spawnArea.maxZ - this.spawnArea.minZ) + this.spawnArea.minZ;
        
        // Ensure power-ups don't spawn too close to player start (0, 0, 0)
        const distance = Math.sqrt(x ** 2 + z ** 2);
        if (distance < 5) {
            const angle = Math.atan2(z, x);
            x = Math.cos(angle) * 5;
            z = Math.sin(angle) * 5;
        }
        
        return new THREE.Vector3(x, this.spawnArea.y, z);
    }
    
    checkPickup(playerPosition, playerRadius = 0.5) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (powerUp.isPickedUp) {
                this.powerUps.splice(i, 1);
                continue;
            }
            
            const distance = powerUp.position.distanceTo(playerPosition);
            if (distance < playerRadius + 0.5) {
                powerUp.pickup();
                this.powerUps.splice(i, 1);
                return powerUp;
            }
        }
        return null;
    }
    
    update(deltaTime, currentTime) {
        // Update existing power-ups
        this.powerUps.forEach(powerUp => {
            powerUp.update(deltaTime);
        });
        
        // Spawn new power-ups periodically
        if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
            this.spawnPowerUp();
            this.lastSpawnTime = currentTime;
        }
    }
    
    getAllPowerUps() {
        return this.powerUps.filter(pu => !pu.isPickedUp);
    }
    
    cleanup() {
        this.powerUps.forEach(powerUp => {
            if (powerUp.mesh) {
                powerUp.pickup(); // This will clean up the mesh
            }
        });
        this.powerUps = [];
    }
}

