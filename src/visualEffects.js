import * as THREE from 'three';

export class VisualEffectsManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 5.0; // How fast shake decreases
        this.shakeOffset = new THREE.Vector3();
        this.originalCameraPosition = new THREE.Vector3();
        this.shakeRotation = new THREE.Euler();
        this.originalCameraRotation = new THREE.Euler();
        
        // Hit indicator
        this.hitIndicatorElement = null;
        this.hitIndicatorTimeout = null;
        
        // Damage numbers
        this.damageNumbers = [];
        this.damageNumberContainer = null;
        
        // Particle systems
        this.particleSystems = [];
        
        this.setupHitIndicator();
        this.setupDamageNumbers();
    }
    
    setupHitIndicator() {
        // Create hit indicator overlay element
        this.hitIndicatorElement = document.createElement('div');
        this.hitIndicatorElement.id = 'hit-indicator';
        this.hitIndicatorElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.1s;
            border: 8px solid rgba(255, 0, 0, 0.5);
            box-sizing: border-box;
        `;
        document.body.appendChild(this.hitIndicatorElement);
    }
    
    setupDamageNumbers() {
        // Create container for damage numbers
        this.damageNumberContainer = document.createElement('div');
        this.damageNumberContainer.id = 'damage-numbers-container';
        this.damageNumberContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
        `;
        document.body.appendChild(this.damageNumberContainer);
    }
    
    // Screen shake
    addShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }
    
    updateShake(deltaTime) {
        if (this.shakeIntensity > 0) {
            // Apply random offset with smoother interpolation
            const smoothFactor = 0.3;
            const targetOffset = new THREE.Vector3(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity * 0.5
            );
            
            // Smooth interpolation for less jarring shake
            this.shakeOffset.lerp(targetOffset, smoothFactor);
            
            // Apply slight rotation shake for more impact
            this.shakeRotation.set(
                (Math.random() - 0.5) * this.shakeIntensity * 0.02,
                (Math.random() - 0.5) * this.shakeIntensity * 0.02,
                (Math.random() - 0.5) * this.shakeIntensity * 0.01
            );
            
            // Decay shake intensity
            this.shakeIntensity -= this.shakeDecay * deltaTime;
            if (this.shakeIntensity < 0) {
                this.shakeIntensity = 0;
                this.shakeOffset.set(0, 0, 0);
                this.shakeRotation.set(0, 0, 0);
            }
        } else {
            this.shakeOffset.set(0, 0, 0);
            this.shakeRotation.set(0, 0, 0);
        }
    }
    
    applyShakeToCamera() {
        if (this.shakeIntensity > 0) {
            this.camera.position.add(this.shakeOffset);
            // Apply rotation shake for more dynamic effect
            this.camera.rotation.x += this.shakeRotation.x;
            this.camera.rotation.y += this.shakeRotation.y;
            this.camera.rotation.z += this.shakeRotation.z;
        }
    }
    
    removeShakeFromCamera() {
        if (this.shakeIntensity > 0) {
            this.camera.position.sub(this.shakeOffset);
            // Remove rotation shake
            this.camera.rotation.x -= this.shakeRotation.x;
            this.camera.rotation.y -= this.shakeRotation.y;
            this.camera.rotation.z -= this.shakeRotation.z;
        }
    }
    
    // Hit indicator
    showHitIndicator() {
        if (this.hitIndicatorElement) {
            this.hitIndicatorElement.style.opacity = '1';
            
            // Clear existing timeout
            if (this.hitIndicatorTimeout) {
                clearTimeout(this.hitIndicatorTimeout);
            }
            
            // Hide after short duration
            this.hitIndicatorTimeout = setTimeout(() => {
                if (this.hitIndicatorElement) {
                    this.hitIndicatorElement.style.opacity = '0';
                }
            }, 150);
        }
    }
    
    // Damage numbers
    showDamageNumber(position, damage, color = '#ffffff') {
        // Convert 3D position to screen coordinates
        const vector = position.clone();
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        // Create damage number element
        const damageElement = document.createElement('div');
        damageElement.className = 'damage-number';
        damageElement.textContent = `-${Math.round(damage)}`;
        damageElement.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            color: ${color};
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: damageFloat 1s ease-out forwards;
        `;
        
        // Add animation keyframes if not already added
        if (!document.getElementById('damage-animation-style')) {
            const style = document.createElement('style');
            style.id = 'damage-animation-style';
            style.textContent = `
                @keyframes damageFloat {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) translateY(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) translateY(-50px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.damageNumberContainer.appendChild(damageElement);
        
        // Remove after animation
        setTimeout(() => {
            if (damageElement.parentNode) {
                damageElement.parentNode.removeChild(damageElement);
            }
        }, 1000);
    }
    
    // Particle effects
    createHitParticles(position, count = 15) {
        const particles = [];
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // Vary colors (orange to yellow)
            const colorVariation = Math.random();
            colors[i3] = 1.0; // R
            colors[i3 + 1] = 0.5 + colorVariation * 0.5; // G
            colors[i3 + 2] = 0.0; // B
            
            // Vary sizes
            sizes[i] = 0.08 + Math.random() * 0.06;
            
            // Random velocity with more spread
            velocities.push({
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 6,
                z: (Math.random() - 0.5) * 6
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            vertexColors: true,
            size: 0.1,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData.velocities = velocities;
        particleSystem.userData.lifetime = 0.6; // 0.6 seconds
        particleSystem.userData.age = 0;
        
        this.scene.add(particleSystem);
        this.particleSystems.push(particleSystem);
        
        return particleSystem;
    }
    
    createExplosionParticles(position, count = 30) {
        const particles = [];
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // Random velocity with outward direction
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            velocities.push({
                x: Math.cos(angle) * speed,
                y: Math.random() * 2 + 1,
                z: Math.sin(angle) * speed
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xff6600,
            size: 0.15,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData.velocities = velocities;
        particleSystem.userData.lifetime = 1.0; // 1 second
        particleSystem.userData.age = 0;
        
        this.scene.add(particleSystem);
        this.particleSystems.push(particleSystem);
        
        return particleSystem;
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const particleSystem = this.particleSystems[i];
            const positions = particleSystem.geometry.attributes.position.array;
            const colorAttr = particleSystem.geometry.attributes.color;
            const sizeAttr = particleSystem.geometry.attributes.size;
            const colors = colorAttr ? colorAttr.array : null;
            const sizes = sizeAttr ? sizeAttr.array : null;
            const velocities = particleSystem.userData.velocities;
            particleSystem.userData.age += deltaTime;
            
            const age = particleSystem.userData.age;
            const lifetime = particleSystem.userData.lifetime;
            const progress = age / lifetime;
            
            // Update positions
            for (let j = 0; j < velocities.length; j++) {
                const j3 = j * 3;
                positions[j3] += velocities[j].x * deltaTime;
                positions[j3 + 1] += velocities[j].y * deltaTime;
                positions[j3 + 2] += velocities[j].z * deltaTime;
                
                // Apply gravity
                velocities[j].y -= 9.8 * deltaTime;
                
                // Fade colors over time
                if (colors) {
                    const fadeFactor = 1 - progress;
                    colors[j3 + 1] = (0.5 + Math.random() * 0.5) * fadeFactor; // Green component fades
                }
                
                // Shrink particles over time
                if (sizes) {
                    sizes[j] *= (1 - deltaTime * 0.5);
                }
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
            if (colorAttr) {
                colorAttr.needsUpdate = true;
            }
            if (sizeAttr) {
                sizeAttr.needsUpdate = true;
            }
            
            // Fade out
            particleSystem.material.opacity = 1 - progress;
            
            // Remove if expired
            if (age >= lifetime) {
                this.scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
                this.particleSystems.splice(i, 1);
            }
        }
    }
    
    update(deltaTime) {
        this.updateShake(deltaTime);
        this.updateParticles(deltaTime);
    }
    
    cleanup() {
        // Clean up all particle systems
        for (const particleSystem of this.particleSystems) {
            this.scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
        }
        this.particleSystems = [];
        
        // Clean up damage numbers
        if (this.damageNumberContainer) {
            this.damageNumberContainer.innerHTML = '';
        }
    }
}

