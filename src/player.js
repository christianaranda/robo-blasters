import * as THREE from 'three';
import { clamp } from './utils.js';

export class Player {
    constructor(camera, scene, soundEffectManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.soundEffectManager = soundEffectManager;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Movement settings
        this.moveSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.gravity = -20.0;
        this.canJump = false;
        
        // Mouse look settings
        this.pitch = 0;
        this.yaw = 0;
        this.mouseSensitivity = 0.002;
        this.maxPitch = Math.PI / 2 - 0.1; // Prevent gimbal lock
        
        // Input state
        this.keys = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        // Position
        this.position = new THREE.Vector3(0, 1.7, 0); // Start at eye level above ground
        this.camera.position.copy(this.position);
        
        // Ground level
        this.groundLevel = 0;
        
        // Camera height offset (eye level above player position)
        this.eyeHeight = 1.7;
        
        // Collision detection
        this.collisionObjects = [];
        this.playerRadius = 0.5; // Player collision radius
        this.playerHeight = 1.7; // Player height for collision
        
        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.onHealthChange = null;
        this.onDeath = null;
        
        this.setupEventListeners();
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.onHealthChange) {
            this.onHealthChange(this.health, this.maxHealth);
        }
        
        // Player dies when health reaches exactly 0
        if (this.health === 0 && this.onDeath) {
            this.onDeath();
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (this.onHealthChange) {
            this.onHealthChange(this.health, this.maxHealth);
        }
    }
    
    getHealth() {
        return { current: this.health, max: this.maxHealth };
    }
    
    reset() {
        this.health = this.maxHealth;
        this.position.set(0, 1.7, 0);
        this.camera.position.copy(this.position);
        this.velocity.set(0, 0, 0);
    }
    
    setCollisionObjects(objects) {
        this.collisionObjects = objects || [];
    }
    
    checkCollision(newPosition) {
        if (!this.collisionObjects || this.collisionObjects.length === 0) {
            return false;
        }
        
        // Create a bounding box for the player at the new position
        const playerBox = new THREE.Box3();
        const playerMin = new THREE.Vector3(
            newPosition.x - this.playerRadius,
            newPosition.y, // Ground level
            newPosition.z - this.playerRadius
        );
        const playerMax = new THREE.Vector3(
            newPosition.x + this.playerRadius,
            newPosition.y + this.playerHeight, // Top of player
            newPosition.z + this.playerRadius
        );
        playerBox.setFromPoints([playerMin, playerMax]);
        
        // Check collision with all collision objects
        for (const obj of this.collisionObjects) {
            if (!obj) continue;
            
            // Skip invisible objects
            if (obj.visible === false) continue;
            
            // Skip if object is destroyed (for targets)
            if (obj.userData && obj.userData.target) {
                const target = obj.userData.target;
                if (target && target.isDestroyed) {
                    continue;
                }
            }
            
            // Skip decorative barrels (non-collision)
            if (obj.userData && obj.userData.isObstacle === false) {
                continue;
            }
            
            try {
                // Update object's world matrix if needed
                if (obj.updateMatrixWorld) {
                    obj.updateMatrixWorld(true); // Force update
                }
                
                // For tree groups, check collision against trunk specifically
                let objBox;
                if (obj.userData && obj.userData.isTree && obj instanceof THREE.Group) {
                    // Find the trunk mesh in the tree group
                    let trunk = null;
                    obj.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.userData && child.userData.isTreeTrunk) {
                            trunk = child;
                        }
                    });
                    
                    if (trunk) {
                        // Use trunk's bounding box for collision
                        trunk.updateMatrixWorld(true);
                        objBox = new THREE.Box3().setFromObject(trunk);
                    } else {
                        // Fallback to entire tree bounding box
                        objBox = new THREE.Box3().setFromObject(obj);
                    }
                } else {
                    // Get bounding box of the object
                    objBox = new THREE.Box3().setFromObject(obj);
                }
                
                // Check if bounding box is valid and not empty
                if (objBox.isEmpty()) {
                    continue;
                }
                
                // Check if player box intersects with object box
                if (playerBox.intersectsBox(objBox)) {
                    return true; // Collision detected
                }
            } catch (e) {
                // Skip objects that cause errors
                console.warn('Collision check error:', e);
                continue;
            }
        }
        
        return false; // No collision
    }
    
    checkVerticalCollision(newPosition) {
        if (!this.collisionObjects || this.collisionObjects.length === 0) {
            return { collision: false };
        }
        
        // Check horizontal position first (X, Z) to see what objects we're over
        const playerFeetY = newPosition.y;
        const playerHeadY = newPosition.y + this.playerHeight;
        
        let bestTopY = this.groundLevel;
        let bestBottomY = null;
        let foundTopCollision = false;
        let foundBottomCollision = false;
        
        // Check collision with all collision objects
        for (const obj of this.collisionObjects) {
            if (!obj) continue;
            
            // Skip invisible objects
            if (obj.visible === false) continue;
            
            // Skip if object is destroyed (for targets)
            if (obj.userData && obj.userData.target) {
                const target = obj.userData.target;
                if (target && target.isDestroyed) {
                    continue;
                }
            }
            
            // Skip decorative barrels (non-collision)
            if (obj.userData && obj.userData.isObstacle === false) {
                continue;
            }
            
            try {
                // Update object's world matrix if needed
                if (obj.updateMatrixWorld) {
                    obj.updateMatrixWorld(true);
                }
                
                // For tree groups, check collision against trunk specifically
                let objBox;
                if (obj.userData && obj.userData.isTree && obj instanceof THREE.Group) {
                    // Find the trunk mesh in the tree group
                    let trunk = null;
                    obj.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.userData && child.userData.isTreeTrunk) {
                            trunk = child;
                        }
                    });
                    
                    if (trunk) {
                        // Use trunk's bounding box for collision
                        trunk.updateMatrixWorld(true);
                        objBox = new THREE.Box3().setFromObject(trunk);
                    } else {
                        // Fallback to entire tree bounding box
                        objBox = new THREE.Box3().setFromObject(obj);
                    }
                } else {
                    // Get bounding box of the object
                    objBox = new THREE.Box3().setFromObject(obj);
                }
                
                if (objBox.isEmpty()) {
                    continue;
                }
                
                // Check if player's horizontal position (X, Z) is over/under this object
                const playerX = newPosition.x;
                const playerZ = newPosition.z;
                
                const isOverObject = (
                    playerX >= objBox.min.x - this.playerRadius &&
                    playerX <= objBox.max.x + this.playerRadius &&
                    playerZ >= objBox.min.z - this.playerRadius &&
                    playerZ <= objBox.max.z + this.playerRadius
                );
                
                if (!isOverObject) {
                    continue;
                }
                
                const objectTop = objBox.max.y;
                const objectBottom = objBox.min.y;
                
                // Check if this object is a wall, tree, pillar, or Bender - cannot land on top of these
                const isWall = obj.userData && obj.userData.isWall === true;
                const isTree = obj.userData && obj.userData.isTree === true;
                const isPillar = obj.userData && obj.userData.isPillar === true;
                const isBender = obj.userData && obj.userData.isBender === true;
                const cannotLandOnTop = isWall || isTree || isPillar || isBender;
                
                // Check if landing on top (falling down)
                // CRITICAL: Only check if player is actually falling AND their feet are above the object's top
                // This prevents teleporting when walking horizontally into the side of an object
                const playerFeetAboveTop = playerFeetY >= objectTop - 0.05; // Player feet must be at or above object top (very strict)
                const isFalling = this.velocity.y < -0.1; // Player must be actively falling
                const isCloseToTop = playerFeetY <= objectTop + 0.3 && playerFeetY >= objectTop - 0.3; // Within landing range
                // Check if already on top - more lenient check to maintain position on platform
                const distanceFromTop = Math.abs(playerFeetY - objectTop);
                const isAlreadyOnTop = (Math.abs(this.velocity.y) < 0.2 && distanceFromTop < 0.3) || 
                                      (distanceFromTop < 0.1 && playerFeetY >= objectTop - 0.1); // Standing on or very close to top
                
                // CRITICAL CHECK: Player's CURRENT position must also be above or very close to the object's top
                // This prevents teleporting when walking into the side of an object at ground level
                const currentFeetY = this.position.y;
                const currentIsAboveTop = currentFeetY >= objectTop - 0.15;
                
                // ADDITIONAL SAFEGUARD: If player is at ground level and trying to move horizontally, NEVER teleport
                const isAtGroundLevel = currentFeetY <= this.groundLevel + 0.5;
                // Check if player is trying to move horizontally (either via velocity OR input keys)
                const hasHorizontalVelocity = Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01;
                const hasHorizontalInput = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
                const isMovingHorizontally = hasHorizontalVelocity || hasHorizontalInput;
                const isNotJumping = this.velocity.y <= 0.5;
                
                // COMPLETE SAFEGUARD: Never trigger if at ground level, trying to move horizontally, and not jumping
                // This is the final check to prevent any teleportation when walking horizontally into walls
                if (isAtGroundLevel && isMovingHorizontally && isNotJumping) {
                    // Skip this object - player is walking horizontally at ground level
                    continue;
                }
                
                // CRITICAL: Skip landing on top if this is a wall or tree
                if (cannotLandOnTop) {
                    // Can't land on walls or trees, but still check for head collision when jumping
                    if (this.velocity.y > 0 && playerHeadY >= objectBottom - 0.2 && playerHeadY <= objectBottom + 0.5) {
                        // Hitting bottom of wall/tree (head collision)
                        foundBottomCollision = true;
                        if (bestBottomY === null || objectBottom < bestBottomY) {
                            bestBottomY = objectBottom - this.playerHeight;
                        }
                    }
                    continue; // Skip the "land on top" check for walls and trees
                }
                
                // CRITICAL: Never teleport to top when jumping (positive velocity) unless already very close to top
                // This prevents teleportation when jumping into the side of objects
                const isJumping = this.velocity.y > 0.1;
                const isVeryCloseToTop = Math.abs(playerFeetY - objectTop) < 0.15; // Must be very close (within 15cm)
                
                // Only trigger if: (falling AND close to top AND feet above top AND current position is above top) OR (already on top)
                // BUT: If jumping, only allow if already very close to top
                if (isJumping) {
                    // When jumping, only allow teleportation if already very close to the top
                    if (isVeryCloseToTop && isAlreadyOnTop) {
                        foundTopCollision = true;
                        bestTopY = Math.max(bestTopY, objectTop);
                    }
                } else if ((isFalling && isCloseToTop && playerFeetAboveTop && currentIsAboveTop) || isAlreadyOnTop) {
                    // Landing on top (only if falling onto it or already on it)
                    // CRITICAL: Always detect if player is on top of a platform to maintain position
                    foundTopCollision = true;
                    bestTopY = Math.max(bestTopY, objectTop);
                }
                
                // Check if hitting bottom (moving up)
                if (this.velocity.y > 0) {
                    // Player is moving up
                    // Check if player head would hit object bottom
                    if (playerHeadY >= objectBottom - 0.2 && playerHeadY <= objectBottom + 0.5) {
                        // Hitting bottom
                        foundBottomCollision = true;
                        if (bestBottomY === null || objectBottom < bestBottomY) {
                            bestBottomY = objectBottom - this.playerHeight;
                        }
                    }
                }
                
                // Only check if inside object when actually moving vertically
                // Don't teleport when just walking horizontally into the side
                // CRITICAL: Apply the same safeguard - never trigger if at ground level, trying to move horizontally, and not jumping
                const isActuallyMovingVertically = Math.abs(this.velocity.y) > 0.2; // Must be significantly moving vertically, not just gravity
                // Re-check safeguard variables for this check
                const hasHorizontalVelocity2 = Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01;
                const hasHorizontalInput2 = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
                const isMovingHorizontally2 = hasHorizontalVelocity2 || hasHorizontalInput2;
                if (isActuallyMovingVertically && !(isAtGroundLevel && isMovingHorizontally2 && isNotJumping) && playerFeetY < objectTop && playerHeadY > objectBottom) {
                    // Player is inside object and moving vertically - push to top if falling
                    if (this.velocity.y <= 0) {
                        foundTopCollision = true;
                        bestTopY = Math.max(bestTopY, objectTop);
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        if (foundTopCollision) {
            return {
                collision: true,
                onTop: true,
                topY: bestTopY,
                bottomY: null
            };
        }
        
        if (foundBottomCollision) {
            return {
                collision: true,
                onTop: false,
                topY: null,
                bottomY: bestBottomY
            };
        }
        
        return { collision: false };
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.mouseDelta.x = e.movementX || 0;
                this.mouseDelta.y = e.movementY || 0;
            }
        });
        
        // Pointer lock
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement !== null;
        });
        
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock failed');
        });
    }
    
    requestPointerLock() {
        // Get canvas element by ID or querySelector
        const canvas = document.getElementById('game-canvas') || document.querySelector('canvas');
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock().catch(err => {
                console.log('Pointer lock request failed:', err);
            });
        }
    }
    
    update(deltaTime) {
        this.updateMouseLook();
        this.updateMovement(deltaTime);
        this.updateCamera();
        this.updateFootsteps(deltaTime);
    }
    
    updateFootsteps(deltaTime) {
        // Check if player is moving on ground
        const isMoving = (this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD']) && this.canJump;
        
        if (isMoving && this.soundEffectManager) {
            this.footstepTimer += deltaTime;
            if (this.footstepTimer >= this.footstepInterval) {
                this.soundEffectManager.playSound('footstep', { volume: 0.5 });
                this.footstepTimer = 0;
            }
        } else {
            this.footstepTimer = 0;
        }
    }
    
    updateMouseLook() {
        if (!this.isPointerLocked) return;
        
        // Update yaw (horizontal rotation)
        this.yaw -= this.mouseDelta.x * this.mouseSensitivity;
        
        // Update pitch (vertical rotation)
        this.pitch -= this.mouseDelta.y * this.mouseSensitivity;
        this.pitch = clamp(this.pitch, -this.maxPitch, this.maxPitch);
        
        // Reset mouse delta
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }
    
    updateMovement(deltaTime) {
        // Calculate forward and right vectors based on yaw
        const forward = new THREE.Vector3(
            Math.sin(this.yaw),
            0,
            Math.cos(this.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );
        
        // Reset direction
        this.direction.set(0, 0, 0);
        
        // Apply movement input
        if (this.keys['KeyS']) {
            this.direction.add(forward);
        }
        if (this.keys['KeyW']) {
            this.direction.sub(forward);
        }
        if (this.keys['KeyA']) {
            this.direction.sub(right);
        }
        if (this.keys['KeyD']) {
            this.direction.add(right);
        }
        
        // Normalize direction
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }
        
        // Apply movement speed
        const moveVector = this.direction.multiplyScalar(this.moveSpeed);
        
        // Update velocity
        this.velocity.x = moveVector.x;
        this.velocity.z = moveVector.z;
        
        // Jump
        if (this.keys['Space'] && this.canJump) {
            this.velocity.y = this.jumpSpeed;
            this.canJump = false;
            // Play jump sound
            if (this.soundEffectManager) {
                this.soundEffectManager.playSound('jump');
            }
        }
        
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Calculate new position
        const newPosition = this.position.clone();
        newPosition.x += this.velocity.x * deltaTime;
        newPosition.z += this.velocity.z * deltaTime;
        newPosition.y += this.velocity.y * deltaTime;
        
        // Check horizontal collision (X and Z separately)
        // Test X movement
        const testPositionX = new THREE.Vector3(newPosition.x, this.position.y, this.position.z);
        if (!this.checkCollision(testPositionX)) {
            this.position.x = newPosition.x;
        } else {
            this.velocity.x = 0; // Stop X movement
        }
        
        // Test Z movement
        const testPositionZ = new THREE.Vector3(this.position.x, this.position.y, newPosition.z);
        if (!this.checkCollision(testPositionZ)) {
            this.position.z = newPosition.z;
        } else {
            this.velocity.z = 0; // Stop Z movement
        }
        
        // Check vertical collision (Y axis)
        // AGGRESSIVE FIX: If player is at ground level and trying to move horizontally, NEVER check vertical collision
        // This prevents teleportation when walking into walls
        const isAtGroundLevel = this.position.y <= this.groundLevel + 0.5;
        // Check if player is trying to move horizontally (either via velocity OR input keys)
        // This handles the case where player is against a wall (velocity is 0 but keys are pressed)
        const hasHorizontalVelocity = Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01;
        const hasHorizontalInput = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
        const isMovingHorizontally = hasHorizontalVelocity || hasHorizontalInput;
        const isNotJumping = this.velocity.y <= 0.5; // Not jumping (allowing for small upward velocity from ground collision)
        
        // CRITICAL: If at ground level, trying to move horizontally, and not jumping, completely skip vertical collision
        // This prevents any teleportation when walking horizontally into objects (even when blocked by walls)
        // BUT: Always check vertical collision if player is above ground level (might be on a platform)
        const isAboveGround = this.position.y > this.groundLevel + 0.5;
        if (isAtGroundLevel && isMovingHorizontally && isNotJumping && !isAboveGround) {
            // Just apply gravity normally, no vertical collision check (only when at ground level)
            this.position.y = newPosition.y;
        } else {
            // Only check vertical collision when actually moving vertically or above ground
            const collisionResult = this.checkVerticalCollision(newPosition);
            
            if (collisionResult.collision) {
                if (collisionResult.onTop && collisionResult.topY !== null) {
                    // CRITICAL: Only apply if actually falling (negative velocity) or already standing on top
                    // Never teleport when walking horizontally (velocity.y is 0 or very small) or when jumping
                    const currentFeetY = this.position.y;
                    const targetTopY = collisionResult.topY;
                    const distanceToTop = Math.abs(currentFeetY - targetTopY);
                    const isActuallyFalling = this.velocity.y < -0.1;
                    const isJumping = this.velocity.y > 0.1;
                    const isAlreadyOnTop = Math.abs(this.velocity.y) < 0.1 && distanceToTop < 0.2;
                    
                    // CRITICAL: Never teleport to top when jumping into the side of an object
                    // Only teleport if falling onto it or already standing on it
                    if (isJumping) {
                        // When jumping, never teleport to top - just update Y normally
                        this.position.y = newPosition.y;
                    } else if (isActuallyFalling || isAlreadyOnTop) {
                        // Only teleport to top if falling onto it or already standing on it
                        // CRITICAL: Always maintain position on top of platform when already on it
                        this.position.y = collisionResult.topY;
                        this.velocity.y = 0;
                        this.canJump = true;
                    } else {
                        // Check if player is very close to top but not quite there - maintain position
                        // This helps prevent falling through platforms when standing on them
                        if (distanceToTop < 0.3 && this.position.y <= collisionResult.topY + 0.1) {
                            // Very close to top or slightly above, maintain position on platform
                            this.position.y = collisionResult.topY;
                            this.velocity.y = 0;
                            this.canJump = true;
                        } else {
                            // Don't teleport when walking horizontally, just update Y normally
                            this.position.y = newPosition.y;
                        }
                    }
                } else if (!collisionResult.onTop && collisionResult.bottomY !== null) {
                    // Hitting bottom of an object (head collision) - only if jumping
                    if (this.velocity.y > 0.1) {
                        this.position.y = collisionResult.bottomY;
                        this.velocity.y = 0;
                    } else {
                        this.position.y = newPosition.y;
                    }
                } else {
                    // Fallback: no vertical collision, update Y position
                    this.position.y = newPosition.y;
                }
            } else {
                // No vertical collision, update Y position
                this.position.y = newPosition.y;
            }
        }
        
        // Ground collision (falling through everything)
        if (this.position.y < this.groundLevel) {
            this.position.y = this.groundLevel;
            this.velocity.y = 0;
            this.canJump = true;
        }
    }
    
    updateCamera() {
        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        
        // Update camera position (offset by eye height)
        this.camera.position.copy(this.position);
        this.camera.position.y += this.eyeHeight;
    }
    
    getForwardDirection() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }
}

