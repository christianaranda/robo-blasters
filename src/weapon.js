import * as THREE from 'three';
import { createRaycaster } from './utils.js';
import { WeaponAttachment } from './weaponAttachment.js';

// Texture generation helpers for weapons - different wall-like textures for each weapon type
function createPistolTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Small square tiles (like bathroom tiles)
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, 512, 512);
    
    const tileSize = 32;
    ctx.strokeStyle = '#a8a8a8';
    ctx.lineWidth = 1;
    
    for (let y = 0; y < 512; y += tileSize) {
        for (let x = 0; x < 512; x += tileSize) {
            ctx.strokeRect(x, y, tileSize, tileSize);
            const variation = Math.random() * 15 - 7;
            ctx.fillStyle = `rgb(${200 + variation}, ${200 + variation}, ${200 + variation})`;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

function createRifleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Horizontal brick pattern
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(0, 0, 512, 512);
    
    const brickHeight = 24;
    const brickWidth = 80;
    let offset = 0;
    
    for (let y = 0; y < 512; y += brickHeight) {
        for (let x = -brickWidth / 2; x < 512; x += brickWidth) {
            const variation = Math.random() * 20 - 10;
            ctx.fillStyle = `rgb(${184 + variation}, ${184 + variation}, ${184 + variation})`;
            ctx.fillRect(x + offset, y, brickWidth - 2, brickHeight - 2);
            ctx.strokeStyle = '#989898';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + offset, y, brickWidth - 2, brickHeight - 2);
        }
        offset = (offset === 0) ? brickWidth / 2 : 0; // Stagger bricks
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

function createShotgunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Large stone blocks
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, 512, 512);
    
    const blockSize = 128;
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 3;
    
    for (let y = 0; y < 512; y += blockSize) {
        for (let x = 0; x < 512; x += blockSize) {
            ctx.strokeRect(x, y, blockSize, blockSize);
            const variation = Math.random() * 30 - 15;
            ctx.fillStyle = `rgb(${160 + variation}, ${160 + variation}, ${160 + variation})`;
            ctx.fillRect(x + 2, y + 2, blockSize - 4, blockSize - 4);
            
            // Add stone texture
            for (let i = 0; i < 10; i++) {
                const px = x + Math.random() * blockSize;
                const py = y + Math.random() * blockSize;
                ctx.fillStyle = `rgba(${140 + Math.random() * 40}, ${140 + Math.random() * 40}, ${140 + Math.random() * 40}, 0.4)`;
                ctx.fillRect(px, py, 3, 3);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

function createSMGTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Diagonal pattern (like some mall walls)
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, 512, 512);
    
    const stripeWidth = 16;
    ctx.strokeStyle = '#b8b8b8';
    ctx.lineWidth = 2;
    
    // Diagonal stripes
    for (let i = -512; i < 1024; i += stripeWidth * 2) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 512, 512);
        ctx.lineTo(i + 512 + stripeWidth, 512);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.closePath();
        ctx.fillStyle = '#c8c8c8';
        ctx.fill();
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

function createSniperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Vertical panel pattern (like some mall walls)
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, 512, 512);
    
    const panelWidth = 48;
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    
    for (let x = 0; x < 512; x += panelWidth) {
        ctx.strokeRect(x, 0, panelWidth, 512);
        const variation = Math.random() * 25 - 12;
        ctx.fillStyle = `rgb(${224 + variation}, ${224 + variation}, ${224 + variation})`;
        ctx.fillRect(x + 1, 0, panelWidth - 2, 512);
        
        // Add vertical lines for panel effect
        if (x > 0) {
            ctx.strokeStyle = '#b0b0b0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

function createGripTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base grip color (darker wall-like)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add wall tile pattern for grip (smaller tiles)
    const tileSize = 32;
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1;
    
    for (let y = 0; y < 256; y += tileSize) {
        for (let x = 0; x < 256; x += tileSize) {
            // Draw tile borders
            ctx.strokeRect(x, y, tileSize, tileSize);
            
            // Add color variation
            const variation = Math.random() * 15 - 7;
            ctx.fillStyle = `rgb(${128 + variation}, ${128 + variation}, ${128 + variation})`;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }
    
    // Add grout lines
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 256; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }
    for (let x = 0; x <= 256; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);
    return texture;
}

export class Weapon {
    constructor(camera, scene, config = null, soundEffectManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.soundEffectManager = soundEffectManager;
        
        // Use config if provided, otherwise defaults
        const defaults = {
            maxAmmo: 30,
            magazineSize: 30,
            fireRate: 600,
            damage: 25,
            range: 1000,
            reloadTime: 2000,
            color: 0x0066ff
        };
        
        const settings = config || defaults;
        this.config = config || defaults; // Store config for sound playback
        
        // Ammo settings
        this.maxAmmo = settings.maxAmmo;
        this.currentAmmo = settings.magazineSize;
        this.magazineSize = settings.magazineSize;
        this.isReloading = false;
        this.reloadTime = settings.reloadTime;
        this.reloadStartTime = 0;
        
        // Shooting settings
        this.fireRate = settings.fireRate;
        this.lastShotTime = 0;
        this.canShoot = true;
        this.damage = settings.damage;
        this.range = settings.range;
        this.weaponColor = settings.color;
        this.damageBoost = 1.0;
        this.isMelee = settings.isMelee || false;
        this.weaponType = null; // Will be set by WeaponManager
        
        // Store original stats before attachments
        this.originalStats = {
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            magazineSize: this.magazineSize
        };
        
        // Attachments
        this.attachments = []; // Array of WeaponAttachment instances
        
        // Visual effects
        this.muzzleFlash = null;
        this.tracer = null;
        this.gunModel = null;
        this.createMuzzleFlash();
        this.createGunModel();
        
        // Hit detection
        this.raycaster = new THREE.Raycaster();
        
        // Callbacks
        this.onShoot = null;
        this.onHit = null;
        this.onMiss = null; // Called when bullet hits obstacle
        this.onReload = null;
    }
    
    createMuzzleFlash() {
        // Simple muzzle flash effect
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.visible = false;
        this.scene.add(this.muzzleFlash);
    }
    
    createGunModel() {
        // Check if this is a lightsaber (melee weapon)
        if (this.isMelee) {
            this.createLightsaberModel();
            return;
        }
        
        // Create a blue gun model
        const gunGroup = new THREE.Group();
        
        // Create textures based on weapon name/color (determine type from config)
        let metalTexture;
        // Determine weapon type from weapon color (since weaponType might not be set yet)
        if (this.weaponColor === 0x0066ff) { // Blue - Pistol
            metalTexture = createPistolTexture();
        } else if (this.weaponColor === 0x00ff00) { // Green - Rifle
            metalTexture = createRifleTexture();
        } else if (this.weaponColor === 0xff6600) { // Orange - Shotgun
            metalTexture = createShotgunTexture();
        } else if (this.weaponColor === 0xffff00) { // Yellow - SMG
            metalTexture = createSMGTexture();
        } else if (this.weaponColor === 0xff00ff) { // Magenta - Sniper
            metalTexture = createSniperTexture();
        } else {
            // Fallback to pistol texture
            metalTexture = createPistolTexture();
        }
        
        const gripTexture = createGripTexture();
        
        // Main body (blue) with metal texture
        const bodyGeometry = new THREE.BoxGeometry(0.3, 0.15, 1.2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            map: metalTexture,
            color: 0xffffff, // White to show texture properly, tinted by weapon color
            metalness: 0.8,
            roughness: 0.2
        });
        // Apply weapon color as emissive for tinting
        bodyMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.2);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, 0);
        body.castShadow = true;
        gunGroup.add(body);
        
        // Barrel with metal texture
        const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 16);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            map: metalTexture,
            color: 0xffffff, // White to show texture properly
            metalness: 0.9,
            roughness: 0.1
        });
        barrelMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.1);
        this.barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
        this.barrelMesh.rotation.x = Math.PI / 2;
        this.barrelMesh.position.set(0, 0, 0.6);
        gunGroup.add(this.barrelMesh);
        
        // Grip with grip texture
        const gripGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.3);
        const gripMaterial = new THREE.MeshStandardMaterial({
            map: gripTexture,
            color: 0xffffff, // White to show texture properly
            metalness: 0.6,
            roughness: 0.4
        });
        gripMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.15);
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0, -0.25, -0.2);
        gunGroup.add(grip);
        
        // Trigger guard with metal texture
        const guardGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
        const guardMaterial = new THREE.MeshStandardMaterial({
            map: metalTexture,
            color: 0xffffff, // White to show texture properly
            metalness: 0.9,
            roughness: 0.1
        });
        guardMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.1);
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.rotation.x = Math.PI / 2;
        guard.position.set(0, -0.1, -0.1);
        gunGroup.add(guard);
        
        // Scope/sight with metal texture
        const sightGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.3);
        const sightMaterial = new THREE.MeshStandardMaterial({
            map: metalTexture,
            color: 0xffffff, // White to show texture properly
            metalness: 0.9,
            roughness: 0.1
        });
        sightMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.08);
        const sight = new THREE.Mesh(sightGeometry, sightMaterial);
        sight.position.set(0, 0.15, 0.2);
        gunGroup.add(sight);
        
        // Magazine with metal texture
        const magGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.2);
        const magMaterial = new THREE.MeshStandardMaterial({
            map: metalTexture,
            color: 0xffffff, // White to show texture properly
            metalness: 0.7,
            roughness: 0.3
        });
        magMaterial.emissive = new THREE.Color(this.weaponColor).multiplyScalar(0.18);
        const magazine = new THREE.Mesh(magGeometry, magMaterial);
        magazine.position.set(0, -0.35, -0.3);
        gunGroup.add(magazine);
        
        // Position gun in front of camera (bottom right)
        gunGroup.position.set(0.3, -0.3, -0.5);
        gunGroup.rotation.x = 0.1;
        
        this.gunModel = gunGroup;
        // Add to scene, we'll update position relative to camera each frame
        this.scene.add(gunGroup);
    }
    
    createLightsaberModel() {
        const lightsaberGroup = new THREE.Group();
        
        // Handle (metallic) - positioned at origin, extends backward
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.2
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, 0, -0.125); // Center handle at origin, extends backward
        lightsaberGroup.add(handle);
        
        // Handle grip details
        for (let i = 0; i < 3; i++) {
            const gripRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.03, 0.005, 8, 16),
                new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
            );
            gripRing.rotation.x = Math.PI / 2;
            gripRing.position.set(0, 0, -0.2 + i * 0.08);
            lightsaberGroup.add(gripRing);
        }
        
        // Emitter (where blade comes out) - at origin, blade extends forward
        const emitterGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.05, 16);
        const emitterMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.3
        });
        const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
        emitter.rotation.x = Math.PI / 2;
        emitter.position.set(0, 0, 0); // At origin
        lightsaberGroup.add(emitter);
        
        // Blade (glowing cylinder) - extends forward from emitter along +Z
        const bladeLength = 1.2;
        const bladeGeometry = new THREE.CylinderGeometry(0.02, 0.02, bladeLength, 16);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: this.weaponColor,
            emissive: this.weaponColor,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.9
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.rotation.x = Math.PI / 2;
        blade.position.set(0, 0, bladeLength / 2); // Blade center extends forward from origin
        lightsaberGroup.add(blade);
        
        // Blade core (brighter center)
        const coreGeometry = new THREE.CylinderGeometry(0.01, 0.01, bladeLength, 8);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.rotation.x = Math.PI / 2;
        core.position.set(0, 0, bladeLength / 2); // Same position as blade
        lightsaberGroup.add(core);
        
        // Blade glow effect (larger, more transparent)
        const glowGeometry = new THREE.CylinderGeometry(0.04, 0.04, bladeLength, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.weaponColor,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, 0, bladeLength / 2); // Same position as blade
        lightsaberGroup.add(glow);
        
        this.gunModel = lightsaberGroup;
        this.scene.add(this.gunModel);
        
        // Store blade reference for animation
        this.blade = blade;
        this.bladeCore = core;
        this.bladeGlow = glow;
        this.lightsaberSwingAnimation = 0;
    }
    
    update(deltaTime, currentTime) {
        // Update lightsaber swing animation
        if (this.isMelee && this.lightsaberSwingAnimation > 0) {
            this.lightsaberSwingAnimation -= deltaTime * 5;
            if (this.lightsaberSwingAnimation < 0) {
                this.lightsaberSwingAnimation = 0;
            }
            
            // Animate blade swing
            if (this.gunModel) {
                const swingAmount = Math.sin(this.lightsaberSwingAnimation * Math.PI) * 0.3;
                this.gunModel.rotation.z = swingAmount;
            }
        }
        
        // Update reload
        if (this.isReloading) {
            if (currentTime - this.reloadStartTime >= this.reloadTime) {
                this.finishReload();
            }
        }
        
        // Update fire rate cooldown
        const timeSinceLastShot = currentTime - this.lastShotTime;
        const minTimeBetweenShots = 60000 / this.fireRate;
        this.canShoot = timeSinceLastShot >= minTimeBetweenShots;
        
        // Hide muzzle flash after a short time
        if (this.muzzleFlash && this.muzzleFlash.visible) {
            const flashDuration = 50; // milliseconds
            if (currentTime - this.lastShotTime >= flashDuration) {
                this.muzzleFlash.visible = false;
            }
        }
        
        // Update gun position and rotation relative to camera
        if (this.gunModel) {
            // Use camera's position directly
            const cameraPos = this.camera.position.clone();
            
            // Get camera's forward direction (where it's looking)
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);
            
            // Get camera's right direction
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.camera.quaternion);
            
            // Get camera's up direction
            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(this.camera.quaternion);
            
            // Position gun relative to camera (bottom right, in front)
            const offsetX = 0.3;  // Right
            const offsetY = -0.3; // Down
            const offsetZ = 0.5;  // Forward (positive to move in front of camera)
            
            // Calculate recoil offset
            let recoilOffset = 0;
            const timeSinceShot = currentTime - this.lastShotTime;
            if (timeSinceShot < 100) {
                recoilOffset = Math.sin((timeSinceShot / 100) * Math.PI) * 0.1;
            }
            
            // Set gun position relative to camera
            this.gunModel.position.copy(cameraPos);
            this.gunModel.position.add(right.multiplyScalar(offsetX));
            this.gunModel.position.add(up.multiplyScalar(offsetY));
            this.gunModel.position.add(forward.multiplyScalar(offsetZ - recoilOffset));
            
            // Match camera rotation with recoil
            this.gunModel.rotation.copy(this.camera.rotation);
            
            // For lightsaber, rotate 180 degrees around Y to flip blade direction
            // Camera forward is -Z, but blade extends along +Z, so we need to flip it
            if (this.isMelee) {
                this.gunModel.rotation.y += Math.PI; // Rotate 180 degrees around Y
            }
            
            if (recoilOffset > 0) {
                this.gunModel.rotation.x += recoilOffset * 2;
            }
            
            // Ensure gun model updates its matrix
            this.gunModel.updateMatrixWorld(false);
        }
    }
    
    shoot(currentTime, targets = [], obstacles = []) {
        if (!this.canShoot || this.isReloading) return false;
        
        // Melee weapons (lightsaber) don't consume ammo
        if (!this.isMelee) {
            if (this.currentAmmo <= 0) {
                // Play empty click sound
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('empty_click');
                }
                this.reload(currentTime);
                return false;
            }
            // Consume ammo
            this.currentAmmo--;
        }
        
        this.lastShotTime = currentTime;
        this.canShoot = false;
        
        // Show muzzle flash (or lightsaber swing effect)
        if (this.isMelee) {
            this.showLightsaberSwing();
        } else {
            this.showMuzzleFlash();
        }
        
        // Play gunshot sound
        if (this.soundEffectManager && this.config) {
            const weaponType = this.config.name.toLowerCase();
            let soundType = 'gunshot_pistol';
            if (weaponType.includes('rifle')) soundType = 'gunshot_rifle';
            else if (weaponType.includes('shotgun')) soundType = 'gunshot_shotgun';
            else if (weaponType.includes('smg')) soundType = 'gunshot_smg';
            else if (weaponType.includes('sniper')) soundType = 'gunshot_sniper';
            this.soundEffectManager.playSound(soundType);
        }
        
        // Cast ray from camera
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        this.raycaster.far = this.range;
        
        // Check for hits on both targets and obstacles together to find the closest hit
        const allObjects = [...targets, ...obstacles];
        const allIntersects = this.raycaster.intersectObjects(allObjects, true);
        
        if (allIntersects.length > 0) {
            const hit = allIntersects[0];
            const hitObject = hit.object;
            
            // Check if the hit object is a target (or part of a target)
            let isTarget = false;
            let targetObj = hitObject;
            
            // Traverse up the parent chain to find if this is part of a target
            let current = hitObject;
            while (current) {
                if (current.userData && current.userData.target) {
                    isTarget = true;
                    targetObj = current;
                    break;
                }
                current = current.parent;
            }
            
            if (isTarget) {
                if (this.onHit) {
                    const finalDamage = this.damage * this.damageBoost;
                    this.onHit(hitObject, hit.point, finalDamage);
                }
            } else {
                // Hit an obstacle (ricochet)
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('ricochet', { volume: 0.6 });
                }
            }
        }
        
        if (this.onShoot) {
            this.onShoot();
        }
        
        return true;
    }
    
    showLightsaberSwing() {
        // Animate lightsaber swing
        if (this.blade) {
            this.lightsaberSwingAnimation = 1.0;
        }
    }
    
    showMuzzleFlash() {
        // Position muzzle flash at gun barrel tip
        if (this.gunModel && this.barrelMesh) {
            // Get world position of barrel tip
            const barrelTip = new THREE.Vector3(0, 0, 0.5);
            this.barrelMesh.localToWorld(barrelTip);
            this.muzzleFlash.position.copy(barrelTip);
        } else if (this.gunModel) {
            // Fallback: estimate barrel position
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            this.muzzleFlash.position.copy(this.camera.position);
            this.muzzleFlash.position.add(forward.multiplyScalar(0.5));
        } else {
            // Fallback to camera position
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            this.muzzleFlash.position.copy(this.camera.position);
            this.muzzleFlash.position.add(forward.multiplyScalar(0.3));
        }
        this.muzzleFlash.visible = true;
    }
    
    reload(currentTime) {
        if (this.isReloading || this.currentAmmo >= this.magazineSize) return;
        
        this.isReloading = true;
        this.reloadStartTime = currentTime;
        
        // Play reload sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('reload');
        }
        
        if (this.onReload) {
            this.onReload();
        }
    }
    
    finishReload() {
        this.currentAmmo = this.magazineSize;
        this.isReloading = false;
    }
    
    getAmmoInfo() {
        return {
            current: this.currentAmmo,
            max: this.maxAmmo,
            isReloading: this.isReloading
        };
    }
    
    attach(attachmentType) {
        // Check if already has this attachment
        if (this.attachments.some(att => att.type === attachmentType)) {
            return false;
        }
        
        // Limit to 2 attachments maximum
        if (this.attachments.length >= 2) {
            return false;
        }
        
        // Create attachment
        const attachment = new WeaponAttachment(attachmentType, this);
        if (!attachment.mesh) {
            return false; // Failed to create visual
        }
        
        // Apply stats
        attachment.apply();
        
        // Store attachment
        this.attachments.push(attachment);
        
        return true;
    }
    
    detach(attachmentType) {
        const index = this.attachments.findIndex(att => att.type === attachmentType);
        if (index === -1) {
            return false; // Not found
        }
        
        const attachment = this.attachments[index];
        
        // Remove visual first
        attachment.remove();
        
        // Reset all stats to original
        this.damage = this.originalStats.damage;
        this.range = this.originalStats.range;
        this.fireRate = this.originalStats.fireRate;
        this.magazineSize = this.originalStats.magazineSize;
        this.currentAmmo = Math.min(this.currentAmmo, this.magazineSize);
        
        // Re-apply remaining attachments
        this.attachments.forEach((att, i) => {
            if (i !== index) {
                att.apply();
            }
        });
        
        // Remove from array
        this.attachments.splice(index, 1);
        
        return true;
    }
}

