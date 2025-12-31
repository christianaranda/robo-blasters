import * as THREE from 'three';

export class Target {
    constructor(position, scene, designType = 'standard', camera = null, soundEffectManager = null, pointValue = null) {
        this.scene = scene;
        this.camera = camera; // Camera reference for billboard effect
        this.soundEffectManager = soundEffectManager;
        this.position = position.clone();
        this.health = 100;
        this.maxHealth = 100;
        this.isDestroyed = false;
        this.designType = designType;
        
        // Point value: 10 or 20 points (use provided value or random)
        this.pointValue = pointValue !== null ? pointValue : (Math.random() < 0.5 ? 10 : 20);
        
        // Movement properties - only blue Benders (20 points) move
        this.startPosition = position.clone();
        this.currentPosition = new THREE.Vector2(position.x, position.z);
        
        if (this.pointValue === 20) {
            // Blue Benders move around
            this.movementSpeed = 1.0 + Math.random() * 2.0; // Random speed between 1-3
            this.movementRange = 8.0 + Math.random() * 7.0; // Random range between 8-15
            this.velocity = new THREE.Vector2(
                (Math.random() - 0.5) * 2, // Random X velocity
                (Math.random() - 0.5) * 2  // Random Z velocity
            ).normalize().multiplyScalar(this.movementSpeed);
            this.bounds = {
                minX: position.x - this.movementRange,
                maxX: position.x + this.movementRange,
                minZ: position.z - this.movementRange,
                maxZ: position.z + this.movementRange
            };
        } else {
            // Red Benders (10 points) stay still
            this.movementSpeed = 0;
            this.movementRange = 0;
            this.velocity = new THREE.Vector2(0, 0);
            this.bounds = {
                minX: position.x,
                maxX: position.x,
                minZ: position.z,
                maxZ: position.z
            };
        }
        
        // Collision detection
        this.collisionObjects = [];
        this.targetRadius = 0.5; // Approximate radius for collision
        
        // Create target mesh
        this.createMesh();
        
        // Create health bar (for Benders only) - DISABLED
        // if (this.designType === 'standard' || this.designType === 'square' || this.designType === 'diamond') {
        //     this.createHealthBar();
        // }
        
        // Remove any existing health bars (in case they were created before)
        if (this.healthBarGroup && this.mesh) {
            this.mesh.remove(this.healthBarGroup);
            this.healthBarGroup = null;
            this.healthBarForeground = null;
        }
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    setCollisionObjects(objects) {
        this.collisionObjects = objects || [];
    }
    
    checkTargetCollision(newX, newZ) {
        if (!this.collisionObjects || this.collisionObjects.length === 0) {
            return false;
        }
        
        // Create a bounding box for the target at the new position
        const targetBox = new THREE.Box3();
        const min = new THREE.Vector3(
            newX - this.targetRadius,
            this.position.y,
            newZ - this.targetRadius
        );
        const max = new THREE.Vector3(
            newX + this.targetRadius,
            this.position.y + 2.0, // Target height
            newZ + this.targetRadius
        );
        targetBox.setFromPoints([min, max]);
        
        // Check collision with all collision objects
        for (const obj of this.collisionObjects) {
            if (!obj || !obj.visible) continue;
            
            // Skip if it's this target
            if (obj === this.mesh || (obj.userData && obj.userData.target === this)) {
                continue;
            }
            
            // Skip if object is destroyed (for targets)
            if (obj.userData && obj.userData.target && obj.userData.target.isDestroyed) {
                continue;
            }
            
            // Skip decorative barrels
            if (obj.userData && obj.userData.isObstacle === false) {
                continue;
            }
            
            try {
                // Update object's world matrix if needed
                if (obj.updateMatrixWorld) {
                    obj.updateMatrixWorld(false);
                }
                
                // Get bounding box of the object
                const objBox = new THREE.Box3().setFromObject(obj);
                
                // Check if bounding box is valid and not empty
                if (objBox.isEmpty()) {
                    continue;
                }
                
                // Check if target box intersects with object box
                if (targetBox.intersectsBox(objBox)) {
                    return true; // Collision detected
                }
            } catch (e) {
                continue;
            }
        }
        
        return false; // No collision
    }
    
    update(deltaTime, currentTime, playerPosition) {
        if (this.isDestroyed || !this.mesh) return;
        
        // Update shooting for blue Benders
        if (this.pointValue === 20 && playerPosition) {
            this.updateShooting(currentTime, playerPosition);
        }
        
        // Only move blue Benders (20 points) - red Benders (10 points) stay still
        if (this.pointValue === 20 && this.movementSpeed > 0) {
            // Calculate new position
            const newX = this.currentPosition.x + this.velocity.x * deltaTime;
            const newZ = this.currentPosition.y + this.velocity.y * deltaTime; // Y is Z in 2D space
            
            // Check for collisions before moving
            let collisionX = false;
            let collisionZ = false;
            
            // Test X movement
            if (this.checkTargetCollision(newX, this.currentPosition.y)) {
                this.velocity.x *= -1; // Reverse X direction
                collisionX = true;
            }
            
            // Test Z movement
            if (this.checkTargetCollision(this.currentPosition.x, newZ)) {
                this.velocity.y *= -1; // Reverse Z direction
                collisionZ = true;
            }
            
            // If both directions collide, pick a random new direction
            if (collisionX && collisionZ) {
                const angle = Math.random() * Math.PI * 2;
                this.velocity.x = Math.cos(angle) * this.movementSpeed;
                this.velocity.y = Math.sin(angle) * this.movementSpeed;
            }
            
            // Update position (only if no collision in that direction)
            if (!collisionX) {
                this.currentPosition.x = newX;
            }
            if (!collisionZ) {
                this.currentPosition.y = newZ;
            }
            
            // Bounce off boundaries
            if (this.currentPosition.x <= this.bounds.minX || this.currentPosition.x >= this.bounds.maxX) {
                this.velocity.x *= -1;
                this.currentPosition.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.currentPosition.x));
            }
            
            if (this.currentPosition.y <= this.bounds.minZ || this.currentPosition.y >= this.bounds.maxZ) {
                this.velocity.y *= -1;
                this.currentPosition.y = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.currentPosition.y));
            }
            
            // Apply movement to mesh
            this.mesh.position.x = this.currentPosition.x;
            this.mesh.position.z = this.currentPosition.y; // Y in Vector2 is Z in 3D
        }
        
        // Update world matrix for collision (recursively to update hitbox)
        this.mesh.updateMatrixWorld(true);
        
        // #region agent log
        if (Math.random() < 0.1 && this.hitBox) { // Sample 10% of updates
            const hitBoxWorldPos = new THREE.Vector3();
            this.hitBox.getWorldPosition(hitBoxWorldPos);
            fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'target.js:194',message:'Target updated',data:{meshPosition:{x:this.mesh.position.x.toFixed(2),y:this.mesh.position.y.toFixed(2),z:this.mesh.position.z.toFixed(2)},hitBoxWorldPos:{x:hitBoxWorldPos.x.toFixed(2),y:hitBoxWorldPos.y.toFixed(2),z:hitBoxWorldPos.z.toFixed(2)},hitBoxVisible:this.hitBox.visible,isDestroyed:this.isDestroyed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
        
        // Remove any existing health bars (cleanup for already-created targets)
        if (this.healthBarGroup && this.mesh) {
            if (this.healthBarGroup.parent === this.mesh) {
                this.mesh.remove(this.healthBarGroup);
            }
            this.healthBarGroup = null;
            this.healthBarForeground = null;
        }
        
        // Update health bar rotation to face camera - DISABLED
        // this.updateHealthBarRotation();
        
        // Update projectiles
        if (this.projectiles) {
            this.updateProjectiles(deltaTime);
        }
    }
    
    createMesh() {
        if (this.designType === 'square') {
            this.createSquareTarget();
        } else if (this.designType === 'diamond') {
            this.createDiamondTarget();
        } else {
            this.createStandardTarget();
        }
    }
    
    createStandardTarget() {
        // Create Bender robot from Futurama
        const targetGroup = new THREE.Group();
        
        // Color based on point value: 10 points = red, 20 points = blue
        const targetColor = this.pointValue === 10 ? 0xff0000 : 0x0000ff; // Red for 10, Blue for 20
        
        // Body (main cylinder - vertical, colored based on point value)
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.45, 1.0, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5; // Center body at y=0.5
        body.castShadow = true;
        body.receiveShadow = true;
        // Link body to target for hit detection
        body.userData.target = this;
        targetGroup.add(body);
        
        // Head (connected to body - cylinder, vertical, same color)
        const headGeometry = new THREE.CylinderGeometry(0.35, 0.38, 0.4, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.2, 0); // On top of body
        head.castShadow = true;
        body.add(head); // Add to body so it moves with body
        
        // Eyes (rectangular, glowing red on head - Bender style)
        const eyeGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.02);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Red base color
            emissive: 0xff0000, // Glowing red
            emissiveIntensity: 2.0, // Bright glow
            metalness: 0.0,
            roughness: 0.0
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 0.05, 0.35); // On front of head
        head.add(leftEye); // Add to head so it moves with head
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 0.05, 0.35); // On front of head
        head.add(rightEye); // Add to head so it moves with head
        
        // Antenna (small cylinder on top of head, same color)
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(0, 0.225, 0); // On top of head
        antenna.castShadow = true;
        head.add(antenna); // Add to head so it moves with head
        
        // Arms (connected to body - vertical cylinders on sides, same color)
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        
        // Left arm - vertical cylinder on left side of body
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.48, 0.5, 0); // On left side of body
        leftArm.castShadow = true;
        body.add(leftArm); // Add to body so it moves with body
        
        // Right arm - vertical cylinder on right side of body
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.48, 0.5, 0); // On right side of body
        rightArm.castShadow = true;
        body.add(rightArm); // Add to body so it moves with body
        
        // Hands (small boxes at end of arms, same color)
        const handGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const handMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(0, -0.25, 0); // At bottom of left arm
        leftHand.castShadow = true;
        leftArm.add(leftHand); // Add to arm so it moves with arm
        
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0, -0.25, 0); // At bottom of right arm
        rightHand.castShadow = true;
        rightArm.add(rightHand); // Add to arm so it moves with arm
        
        // Add pistol to blue Benders (20 point targets)
        if (this.pointValue === 20) {
            this.createPistol(rightHand);
        }
        
        // Legs (connected to bottom of body - vertical cylinders, same color)
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        
        // Left leg - connected at bottom of body
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.3, 0); // At bottom-left of body
        leftLeg.castShadow = true;
        body.add(leftLeg); // Add to body so it moves with body
        
        // Right leg - connected at bottom of body
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.3, 0); // At bottom-right of body
        rightLeg.castShadow = true;
        body.add(rightLeg); // Add to body so it moves with body
        
        // Feet (boxes at end of legs, same color)
        const footGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.25);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: targetColor,
            metalness: 0.9,
            roughness: 0.2
        });
        
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(0, -0.24, 0); // At bottom of left leg
        leftFoot.castShadow = true;
        leftLeg.add(leftFoot); // Add to leg so it moves with leg
        
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0, -0.24, 0); // At bottom of right leg
        rightFoot.castShadow = true;
        rightLeg.add(rightFoot); // Add to leg so it moves with leg
        
        // Create hit box (invisible, for collision detection only)
        const hitBoxGeometry = new THREE.BoxGeometry(1.0, 2.0, 0.8);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            visible: false
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.set(0, 1.0, 0); // Center at body height
        this.hitBox.visible = false;
        // Make hitbox detectable by raycasting even when invisible
        this.hitBox.raycast = THREE.Mesh.prototype.raycast;
        // Mark hitbox so we can identify it
        this.hitBox.userData.isHitBox = true;
        this.hitBox.userData.target = this; // Link directly to target
        // Add hitbox FIRST so it's checked before other parts (raycast order matters)
        targetGroup.add(this.hitBox);
        
        // Ensure target is vertical (standing up)
        targetGroup.rotation.set(0, 0, 0);
        
        // Link all body parts to target for hit detection
        targetGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && !child.userData.target) {
                child.userData.target = this;
            }
        });
        
        this.mesh = targetGroup;
        this.mesh.position.copy(this.position);
        this.mesh.userData.target = this;
        // Mark as Bender - cannot land on top
        this.mesh.userData.isBender = true;
        
        // Update matrix to ensure bounding box is calculated
        this.mesh.updateMatrixWorld(true);
        
        // Store reference to body for color changes
        this.boardMesh = body;
        
        // Create a Box3 for collision detection
        this.hitBoxBounds = new THREE.Box3().setFromObject(this.mesh);
        
        // Shooting properties for blue Benders
        if (this.pointValue === 20) {
            this.lastShotTime = 0;
            this.shootCooldown = 2000; // Shoot every 2 seconds
            this.projectiles = [];
            this.pistolMesh = null; // Will be set in createPistol
        }
        
        // Health bar properties
        this.healthBarGroup = null;
        this.healthBarForeground = null;
        
        // Animation frame ID for destruction animation (to allow cancellation)
        this.destructionAnimationFrame = null;
    }
    
    createHealthBar() {
        // Health bars disabled - do nothing
        return;
    }
    
    updateHealthBar() {
        // Health bars disabled - do nothing
        return;
    }
    
    updateHealthBarRotation() {
        // Health bars disabled - do nothing
        return;
    }
    
    createBullseyeTarget() {
        // Create a vertical bullseye target (no frame, just the target)
        const targetGroup = new THREE.Group();
        
        // Canvas/background (white surface behind the target)
        const canvasSize = 1.2;
        const canvasGeometry = new THREE.BoxGeometry(canvasSize, canvasSize, 0.02);
        const canvasMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5, // Off-white canvas color
            roughness: 0.8,
            metalness: 0.0
        });
        const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
        canvas.position.z = 0;
        canvas.receiveShadow = true;
        targetGroup.add(canvas);
        
        // Store reference to canvas for color changes
        this.boardMesh = canvas;
        
        // Bullseye rings (from outer to inner) - on the canvas
        const rings = [
            { radius: 0.5, color: 0xffffff }, // White outer ring
            { radius: 0.4, color: 0x000000 },   // Black
            { radius: 0.3, color: 0x0000ff },   // Blue
            { radius: 0.2, color: 0xff0000 },  // Red
            { radius: 0.1, color: 0xffff00 }   // Yellow center
        ];
        
        rings.forEach((ring, index) => {
            // Create ring using RingGeometry (vertical, flat on YZ plane)
            const ringGeometry = new THREE.RingGeometry(
                index > 0 ? rings[index - 1].radius : 0, // Inner radius
                ring.radius, // Outer radius
                32 // Segments
            );
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: ring.color,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.2
            });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = -Math.PI / 2; // Rotate to be vertical (facing player)
            ringMesh.position.z = 0.01 + 0.01 * index; // On canvas surface, slightly in front
            ringMesh.castShadow = true;
            targetGroup.add(ringMesh);
        });
        
        // Hit box (invisible, for collision detection)
        const hitBoxGeometry = new THREE.BoxGeometry(canvasSize, canvasSize, 0.2);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            visible: false
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.set(0, 0, 0);
        this.hitBox.visible = false;
        targetGroup.add(this.hitBox);
        
        // Ensure target is vertical (facing the player)
        targetGroup.rotation.set(0, 0, 0);
        
        this.mesh = targetGroup;
        this.mesh.position.copy(this.position);
        this.mesh.userData.target = this;
        
        // Update matrix to ensure bounding box is calculated
        this.mesh.updateMatrixWorld(true);
        
        // Create a Box3 for collision detection
        this.hitBoxBounds = new THREE.Box3().setFromObject(this.mesh);
    }
    
    createPistol(hand) {
        // Create a simple pistol model attached to the hand
        const pistolGroup = new THREE.Group();
        
        // Pistol body
        const bodyGeo = new THREE.BoxGeometry(0.15, 0.08, 0.3);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.3
        });
        const pistolBody = new THREE.Mesh(bodyGeo, bodyMat);
        pistolBody.position.set(0, 0, 0.15);
        pistolGroup.add(pistolBody);
        
        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.2
        });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, 0.35);
        pistolGroup.add(barrel);
        
        // Grip
        const gripGeo = new THREE.BoxGeometry(0.08, 0.12, 0.1);
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.5,
            roughness: 0.6
        });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.set(0, -0.1, 0.05);
        pistolGroup.add(grip);
        
        // Attach pistol to hand
        pistolGroup.position.set(0.05, 0, 0.05);
        pistolGroup.rotation.y = Math.PI / 2; // Point forward
        hand.add(pistolGroup);
        
        this.pistolMesh = pistolGroup;
    }
    
    updateShooting(currentTime, playerPosition) {
        if (!this.mesh || this.isDestroyed) return;
        
        // Check if enough time has passed since last shot
        if (currentTime - this.lastShotTime < this.shootCooldown) {
            return;
        }
        
        // Calculate direction to player
        const targetPos = this.mesh.position.clone();
        targetPos.y += 1.2; // Head height
        
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, targetPos).normalize();
        
        // Check line of sight - make sure no obstacles are blocking the shot
        if (this.collisionObjects && this.collisionObjects.length > 0) {
            const raycaster = new THREE.Raycaster();
            raycaster.set(targetPos, direction);
            const distanceToPlayer = targetPos.distanceTo(playerPosition);
            raycaster.far = distanceToPlayer + 1; // Check distance to player + buffer
            
            // Check if any obstacles block the line of sight
            const obstacleIntersects = raycaster.intersectObjects(this.collisionObjects, true);
            
            if (obstacleIntersects.length > 0) {
                const firstHit = obstacleIntersects[0];
                
                // If the first obstacle hit is closer than the player, the shot is blocked
                if (firstHit.distance < distanceToPlayer - 0.5) {
                    // Line of sight blocked - don't shoot
                    return;
                }
            }
        }
        
        // Create projectile
        this.shootProjectile(targetPos, direction);
        
        this.lastShotTime = currentTime;
    }
    
    shootProjectile(startPos, direction) {
        if (!this.scene) return;
        
        // Create projectile (small sphere)
        const projectileGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const projectileMat = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.0
        });
        const projectile = new THREE.Mesh(projectileGeo, projectileMat);
        projectile.position.copy(startPos);
        projectile.castShadow = true;
        this.scene.add(projectile);
        
        // Store projectile data
        const projectileData = {
            mesh: projectile,
            velocity: direction.clone().multiplyScalar(15), // Speed
            lifetime: 3000, // 3 seconds
            age: 0,
            damage: 10
        };
        
        if (!this.projectiles) {
            this.projectiles = [];
        }
        this.projectiles.push(projectileData);
        
        // Play projectile fire sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('projectile_fire', { volume: 0.6 });
        }
    }
    
    updateProjectiles(deltaTime) {
        // Don't update projectiles if target is destroyed
        if (this.isDestroyed || !this.projectiles || !this.scene) return;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Skip if projectile mesh is invalid
            if (!proj.mesh) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Update position
            proj.mesh.position.add(proj.velocity.clone().multiplyScalar(deltaTime));
            
            // Update age
            proj.age += deltaTime * 1000;
            
            // Remove if expired
            if (proj.age >= proj.lifetime) {
                this.scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    getProjectiles() {
        return this.projectiles || [];
    }
    
    createSquareTarget() {
        // Create Bender robot (same as standard)
        this.createStandardTarget();
        return;
        
        // Square rings
        const squareRings = [
            { size: 0.2, color: 0xff0000 }, // Red center
            { size: 0.35, color: 0xffff00 }, // Yellow
            { size: 0.5, color: 0x00ff00 }, // Green
            { size: 0.65, color: 0x0000ff }, // Blue
            { size: 0.8, color: 0xffffff }, // White
        ];
        
        squareRings.forEach((ring) => {
            const ringGeometry = new THREE.BoxGeometry(ring.size, ring.size, 0.05);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: ring.color,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.2
            });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.position.z = 0.08;
            targetGroup.add(ringMesh);
        });
        
        // Stand
        const standGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
        const standMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        });
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.y = -1.05;
        stand.castShadow = true;
        targetGroup.add(stand);
        
        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.6,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -1.6;
        base.castShadow = true;
        base.receiveShadow = true;
        targetGroup.add(base);
        
        // Hit box (invisible)
        const hitBoxGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.2);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            visible: false
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.set(0, 0, 0);
        this.hitBox.visible = false; // Hidden
        targetGroup.add(this.hitBox);
        
        targetGroup.rotation.set(0, 0, 0);
        this.mesh = targetGroup;
        this.mesh.position.copy(this.position);
        this.mesh.userData.target = this;
        this.mesh.updateMatrixWorld(true);
        this.boardMesh = board;
        this.hitBoxBounds = new THREE.Box3().setFromObject(this.mesh);
    }
    
    createDiamondTarget() {
        // Create Bender robot (same as standard)
        this.createStandardTarget();
        return;
        
        // Diamond rings
        const diamondRings = [
            { size: 0.15, color: 0xff0000 },
            { size: 0.25, color: 0xffff00 },
            { size: 0.35, color: 0x00ff00 },
            { size: 0.45, color: 0x0000ff },
            { size: 0.55, color: 0xffffff },
        ];
        
        diamondRings.forEach((ring) => {
            const ringShape = new THREE.Shape();
            ringShape.moveTo(0, ring.size);
            ringShape.lineTo(ring.size, 0);
            ringShape.lineTo(0, -ring.size);
            ringShape.lineTo(-ring.size, 0);
            ringShape.closePath();
            
            const ringGeometry = new THREE.ExtrudeGeometry(ringShape, {
                depth: 0.05,
                bevelEnabled: false
            });
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: ring.color,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.2
            });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.z = Math.PI / 4;
            ringMesh.position.z = 0.08;
            targetGroup.add(ringMesh);
        });
        
        // Stand
        const standGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
        const standMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        });
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.y = -1.05;
        stand.castShadow = true;
        targetGroup.add(stand);
        
        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.6,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -1.6;
        base.castShadow = true;
        base.receiveShadow = true;
        targetGroup.add(base);
        
        // Hit box (diamond shape, invisible)
        const hitBoxGeometry = new THREE.BoxGeometry(1.3, 1.3, 0.2);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            visible: false
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.rotation.z = Math.PI / 4;
        this.hitBox.position.set(0, 0, 0);
        this.hitBox.visible = false; // Hidden
        targetGroup.add(this.hitBox);
        
        targetGroup.rotation.set(0, 0, 0);
        this.mesh = targetGroup;
        this.mesh.position.copy(this.position);
        this.mesh.userData.target = this;
        this.mesh.updateMatrixWorld(true);
        this.boardMesh = board;
        this.hitBoxBounds = new THREE.Box3().setFromObject(this.mesh);
    }
    
    takeDamage(amount) {
        if (this.isDestroyed) return;
        
        this.health -= amount;
        
        // Play hit sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('hit', { volume: 0.7 });
        }
        
        // Update health bar - DISABLED
        // this.updateHealthBar();
        
        // Visual feedback - change color based on health
        const healthPercent = this.health / this.maxHealth;
        const color = new THREE.Color();
        if (healthPercent > 0.5) {
            color.lerpColors(new THREE.Color(0xff0000), new THREE.Color(0xffff00), (1 - healthPercent) * 2);
        } else {
            color.lerpColors(new THREE.Color(0xffff00), new THREE.Color(0x888888), (0.5 - healthPercent) * 2);
        }
        
        // Change color of the board background (not the rings)
        if (this.boardMesh) {
            this.boardMesh.material.color.copy(color);
        }
        
        // Add hit effect (brief scale animation)
        this.mesh.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => {
            if (this.mesh) {
                this.mesh.scale.set(1, 1, 1);
            }
        }, 100);
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Clean up projectiles immediately
        if (this.projectiles && this.scene) {
            this.projectiles.forEach(proj => {
                if (proj.mesh && proj.mesh.parent) {
                    this.scene.remove(proj.mesh);
                }
                if (proj.mesh) {
                    proj.mesh.geometry.dispose();
                    proj.mesh.material.dispose();
                }
            });
            this.projectiles = [];
        }
        
        // Play explosion sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('explosion');
        }
        
        // Hide health bar (if it exists - health bars are disabled)
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false;
            // Remove from mesh if it exists
            if (this.mesh && this.healthBarGroup.parent === this.mesh) {
                this.mesh.remove(this.healthBarGroup);
            }
        }
        
        // Immediately hide the mesh to remove from collision
        if (this.mesh) {
            this.mesh.visible = false;
        }
        
        // Quick destruction animation - fade out and scale down
        let opacity = 1.0;
        let scale = 1.0;
        const animationSpeed = 0.1;
        
        const destroyAnimation = () => {
            // Check if we should stop (mesh removed or target cleaned up)
            if (!this.mesh || this.destructionAnimationFrame === null) {
                this.remove();
                return;
            }
            
            // Fade out all materials in the mesh group
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child.material.transparent) {
                        child.material.transparent = true;
                    }
                    child.material.opacity = opacity;
                }
            });
            
            // Scale down
            scale -= animationSpeed;
            this.mesh.scale.set(scale, scale, scale);
            
            // Rotate slightly
            this.mesh.rotation.y += 0.1;
            
            opacity -= animationSpeed;
            
            if (opacity > 0 && scale > 0) {
                this.destructionAnimationFrame = requestAnimationFrame(destroyAnimation);
            } else {
                // Immediately remove when animation completes
                this.destructionAnimationFrame = null;
                this.remove();
            }
        };
        
        this.destructionAnimationFrame = requestAnimationFrame(destroyAnimation);
    }
    
    remove() {
        // Cancel any ongoing destruction animation
        if (this.destructionAnimationFrame !== null) {
            cancelAnimationFrame(this.destructionAnimationFrame);
            this.destructionAnimationFrame = null;
        }
        
        // Clean up any remaining projectiles
        if (this.projectiles && this.scene) {
            this.projectiles.forEach(proj => {
                if (proj.mesh && proj.mesh.parent) {
                    this.scene.remove(proj.mesh);
                }
                if (proj.mesh) {
                    proj.mesh.geometry.dispose();
                    proj.mesh.material.dispose();
                }
            });
            this.projectiles = [];
        }
        
        if (this.mesh) {
            // Reset scale and rotation to prevent state leakage
            this.mesh.scale.set(1, 1, 1);
            this.mesh.rotation.set(0, 0, 0);
            
            // Remove all children and dispose of their resources
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            
            // Remove from scene
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        
        // Clear references
        this.boardMesh = null;
        this.hitBox = null;
        this.healthBarGroup = null;
        this.healthBarForeground = null;
    }
    
    getMesh() {
        return this.mesh;
    }
}

export class TargetManager {
    constructor(scene, difficulty = 'medium', camera = null, soundEffectManager = null, isEndless = false, skipInitialSpawn = false) {
        this.scene = scene;
        this.camera = camera; // Store camera reference
        this.soundEffectManager = soundEffectManager; // Store sound effect manager
        this.isEndless = isEndless; // Endless mode flag
        this.targets = [];
        this.spawnArea = {
            minX: -20,
            maxX: 20,
            minZ: -20,
            maxZ: 20,
            y: 1
        };
        
        // Set blue robot count based on difficulty (these are the 20-point robots)
        switch(difficulty) {
            case 'easy':
                this.blueRobotCount = 3;
                break;
            case 'medium':
                this.blueRobotCount = 5;
                break;
            case 'hard':
                this.blueRobotCount = 10;
                break;
            case 'hardcore':
                this.blueRobotCount = 15;
                break;
            default:
                this.blueRobotCount = 5; // Default to medium
        }
        
        // Red robots (10 points) only spawn in endless mode
        this.redRobotCount = this.isEndless ? (1 + Math.floor(Math.random() * 5)) : 0; // Random between 1-5 in endless, 0 in classic
        
        this.score = 0;
        this.collisionObjects = []; // Obstacles and other objects to avoid
        
        // Only spawn targets if not skipping initial spawn (for survival mode)
        if (!skipInitialSpawn) {
            this.spawnTargets();
        }
    }
    
    setCollisionObjects(objects) {
        this.collisionObjects = objects || [];
        // Also pass to all targets
        this.targets.forEach(target => {
            if (target && !target.isDestroyed) {
                target.setCollisionObjects(this.collisionObjects);
            }
        });
    }
    
    spawnTargets() {
        // Spawn blue robots (20 points) - fixed count based on difficulty
        for (let i = 0; i < this.blueRobotCount; i++) {
            const position = this.getRandomSpawnPosition();
            // Create different target designs
            const designType = Math.random() < 0.7 ? 'standard' : (Math.random() < 0.5 ? 'square' : 'diamond');
            // Pass pointValue 20 to constructor to create blue robot
            const target = new Target(position, this.scene, designType, this.camera, this.soundEffectManager, 20);
            // Ensure targets are vertical (face the player)
            target.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0); // Random Y rotation but keep vertical
            this.targets.push(target);
            
            // Play spawn sound (staggered slightly)
            if (this.soundEffectManager && i === 0) {
                setTimeout(() => {
                    this.soundEffectManager.playSound('target_spawn', { volume: 0.5 });
                }, i * 100);
            }
        }
        
        // Spawn red robots (10 points) - random 1-5 count
        for (let i = 0; i < this.redRobotCount; i++) {
            const position = this.getRandomSpawnPosition();
            // Create different target designs
            const designType = Math.random() < 0.7 ? 'standard' : (Math.random() < 0.5 ? 'square' : 'diamond');
            // Pass pointValue 10 to constructor to create red robot
            const target = new Target(position, this.scene, designType, this.camera, this.soundEffectManager, 10);
            // Ensure targets are vertical (face the player)
            target.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0); // Random Y rotation but keep vertical
            this.targets.push(target);
        }
    }
    
    getRandomSpawnPosition() {
        let x = Math.random() * (this.spawnArea.maxX - this.spawnArea.minX) + this.spawnArea.minX;
        let z = Math.random() * (this.spawnArea.maxZ - this.spawnArea.minZ) + this.spawnArea.minZ;
        
        // Ensure targets don't spawn too close to player start (0, 0, 0)
        const distance = Math.sqrt(x ** 2 + z ** 2);
        if (distance < 5) {
            const angle = Math.atan2(z, x);
            x = Math.cos(angle) * 5;
            z = Math.sin(angle) * 5;
        }
        
        return new THREE.Vector3(x, this.spawnArea.y, z);
    }
    
    handleHit(targetMesh, hitPoint, damage) {
        let target = null;
        
        // First check if this is the hitbox itself (has direct target reference)
        if (targetMesh.userData && targetMesh.userData.isHitBox && targetMesh.userData.target) {
            target = targetMesh.userData.target;
        }
        // Then check if it's the main mesh
        else if (targetMesh.userData && targetMesh.userData.target) {
            target = targetMesh.userData.target;
        }
        // Try to find by checking if it's the main mesh
        else {
            target = this.targets.find(t => t.mesh === targetMesh);
        }
        
        // If still not found, check all children of all targets
        if (!target) {
            for (const t of this.targets) {
                if (t.mesh && t.mesh.children) {
                    // Check if targetMesh is a child or if any child has userData pointing to this target
                    if (t.mesh.children.includes(targetMesh) || 
                        t.mesh.children.some(child => child === targetMesh || 
                            (child.userData && child.userData.target === t))) {
                        target = t;
                        break;
                    }
                }
            }
        }
        
        // #region agent log
        const foundTarget = !!target;
        const isHitBox = targetMesh.userData && targetMesh.userData.isHitBox;
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'target.js:1094',message:'HandleHit called',data:{foundTarget:foundTarget,isHitBox:isHitBox,hitMeshType:targetMesh?.type,hasUserData:!!targetMesh?.userData?.target,hasDirectTarget:!!targetMesh?.userData?.target,damage:damage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        
        if (target && !target.isDestroyed) {
            target.takeDamage(damage);
            
            if (target.isDestroyed) {
                // Use target's point value instead of hardcoded 10
                this.score += target.pointValue;
                
                // In endless mode, respawn the target after a short delay
                if (this.isEndless) {
                    setTimeout(() => {
                        this.respawnTarget(target);
                    }, 1000); // Respawn after 1 second
                }
                // Otherwise, game ends when all targets are destroyed
            }
        }
    }
    
    respawnTarget(oldTarget) {
        // Remove old target completely
        if (oldTarget.mesh) {
            oldTarget.remove();
        }
        
        // Create new target at random position (ensure it's vertical)
        const index = this.targets.indexOf(oldTarget);
        if (index !== -1) {
            const position = this.getRandomSpawnPosition();
            // Randomly choose target design
            const designType = Math.random() < 0.7 ? 'standard' : (Math.random() < 0.5 ? 'square' : 'diamond');
            const newTarget = new Target(position, this.scene, designType, this.camera, this.soundEffectManager);
            // Ensure new target is vertical
            newTarget.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0); // Random Y rotation but vertical
            this.targets[index] = newTarget;
        }
    }
    
    getTargets() {
        return this.targets
            .filter(t => !t.isDestroyed && t.mesh !== null)
            .map(t => t.mesh);
    }
    
    updateTargets(deltaTime, currentTime, playerPosition) {
        // Update collision objects to include other targets
        const allCollisionObjects = [...this.collisionObjects];
        // Add other targets to collision list
        this.targets.forEach(target => {
            if (target && !target.isDestroyed && target.mesh) {
                allCollisionObjects.push(target.mesh);
            }
        });
        
        // Update each target with full collision list
        this.targets.forEach(target => {
            if (target && !target.isDestroyed) {
                target.setCollisionObjects(allCollisionObjects);
                target.update(deltaTime, currentTime, playerPosition);
            }
        });
    }
    
    getAllProjectiles() {
        const allProjectiles = [];
        this.targets.forEach(target => {
            if (target && !target.isDestroyed && target.getProjectiles) {
                const projs = target.getProjectiles();
                if (projs && projs.length > 0) {
                    allProjectiles.push(...projs);
                }
            }
        });
        return allProjectiles;
    }
    
    getScore() {
        return this.score;
    }
    
    areAllTargetsDestroyed() {
        // Check if all targets are destroyed
        return this.targets.length > 0 && this.targets.every(target => target.isDestroyed);
    }
    
    cleanupProjectiles() {
        // Clean up all projectiles from all targets
        this.targets.forEach(target => {
            if (target && target.projectiles) {
                target.projectiles.forEach(proj => {
                    if (proj.mesh && proj.mesh.parent) {
                        proj.mesh.parent.remove(proj.mesh);
                    }
                    if (proj.mesh) {
                        proj.mesh.geometry.dispose();
                        proj.mesh.material.dispose();
                    }
                });
                target.projectiles = [];
            }
        });
    }
    
    cleanup() {
        // Clean up all projectiles first
        this.cleanupProjectiles();
        
        // Remove all targets
        this.targets.forEach(target => {
            if (target) {
                target.remove();
            }
        });
        this.targets = [];
    }
}

