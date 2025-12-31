import * as THREE from 'three';
import { Player } from './player.js';
import { WeaponManager } from './weaponManager.js';
import { Target, TargetManager } from './target.js';
import { AudioManager } from './audioManager.js';
import { SoundEffectManager } from './soundEffectManager.js';
import { VisualEffectsManager } from './visualEffects.js';
import { PowerUpManager } from './powerup.js';
import { MiniMapManager } from './minimap.js';
import { NetworkClient } from './networkClient.js';

// Texture generation helpers
function createBarkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base brown color
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add vertical bark lines
    ctx.strokeStyle = '#4a2c1a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
        const x = (i * 256 / 20) + Math.random() * 5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.random() * 3 - 1.5, 256);
        ctx.stroke();
    }
    
    // Add some horizontal lines for bark texture
    ctx.strokeStyle = '#3d1f0f';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
        const y = (i * 256 / 15) + Math.random() * 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2); // Repeat vertically for trunk
    return texture;
}

function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base concrete gray
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add concrete block pattern
    const blockSize = 64;
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    
    for (let y = 0; y < 512; y += blockSize) {
        for (let x = 0; x < 512; x += blockSize) {
            // Add slight offset for staggered pattern
            const offset = (y / blockSize) % 2 === 0 ? 0 : blockSize / 2;
            ctx.strokeRect(x + offset, y, blockSize, blockSize);
            
            // Add some texture variation
            ctx.fillStyle = `rgba(${120 + Math.random() * 20}, ${120 + Math.random() * 20}, ${120 + Math.random() * 20}, 0.3)`;
            ctx.fillRect(x + offset + 2, y + 2, blockSize - 4, blockSize - 4);
        }
    }
    
    // Add some noise for texture
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    }
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

function createLeafTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base green
    const green = new THREE.Color().setHSL(0.25, 0.7, 0.3);
    ctx.fillStyle = `rgb(${Math.floor(green.r * 255)}, ${Math.floor(green.g * 255)}, ${Math.floor(green.b * 255)})`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add leaf pattern with darker green spots
    const darkGreen = new THREE.Color().setHSL(0.25, 0.8, 0.2);
    ctx.fillStyle = `rgb(${Math.floor(darkGreen.r * 255)}, ${Math.floor(darkGreen.g * 255)}, ${Math.floor(darkGreen.b * 255)})`;
    
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = 10 + Math.random() * 20;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add some lighter highlights
    const lightGreen = new THREE.Color().setHSL(0.25, 0.6, 0.4);
    ctx.fillStyle = `rgba(${Math.floor(lightGreen.r * 255)}, ${Math.floor(lightGreen.g * 255)}, ${Math.floor(lightGreen.b * 255)}, 0.5)`;
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = 5 + Math.random() * 10;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.weaponManager = null;
        this.targetManager = null;
        this.powerUpManager = null;
        this.obstacles = []; // Store obstacles for collision
        
        this.clock = null;
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isAttachmentMenuOpen = false;
        this.isHelpMenuOpen = false;
        this.tutorialCurrentSlide = 0;
        this.wasPausedByBlur = false; // Track if paused by window blur
        
        // Performance settings
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS; // milliseconds per frame
        this.lastFrameTime = 0;
        
        // Difficulty setting
        this.difficulty = 'medium'; // Default to medium
        
        // Endless mode setting
        this.isEndless = false;
        
        // Survival mode (wave-based)
        this.isSurvivalMode = false;
        this.currentWave = 1;
        this.waveState = 'waiting'; // waiting, spawning, active, complete, break
        this.waveEnemiesRemaining = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesTotal = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 3000; // 3 seconds between spawn groups
        this.breakTimeRemaining = 0;
        this.breakDuration = 15000; // 15 seconds break
        this.waveScore = 0;
        this.highestWave = this.loadHighestWave();
        
        // High score system (per-difficulty)
        this.highScores = {
            easy: this.loadHighScore('easy'),
            medium: this.loadHighScore('medium'),
            hard: this.loadHighScore('hard'),
            hardcore: this.loadHighScore('hardcore')
        };
        this.highScore = this.highScores[this.difficulty]; // Current difficulty's high score
        
        // Audio manager
        this.audioManager = new AudioManager();
        
        // Sound effect manager
        this.soundEffectManager = new SoundEffectManager();
        
        // Visual effects manager (will be initialized after renderer)
        this.visualEffectsManager = null;
        
        // Multiplayer/Network
        this.networkClient = new NetworkClient();
        this.isMultiplayer = false;
        this.otherPlayers = new Map(); // Map of other player IDs to their game objects
        this.lastNetworkUpdate = 0;
        this.networkUpdateInterval = 100; // Update network every 100ms
        
        // Check WebGL support before initializing
        if (!this.checkWebGLSupport()) {
            this.showWebGLError();
            return; // Stop initialization if WebGL not supported
        }
        
        this.setupUI();
        try {
            this.init();
        } catch (error) {
            this.showError('Failed to initialize game: ' + error.message);
            console.error('Game initialization error:', error);
        }
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    showWebGLError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10000; font-family: Arial, sans-serif; padding: 20px; text-align: center;';
        errorDiv.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff0000;">WebGL Not Supported</h1>
            <p style="font-size: 24px; margin-bottom: 20px;">Your browser or device does not support WebGL, which is required to run this game.</p>
            <p style="font-size: 18px; margin-bottom: 10px;">Please try:</p>
            <ul style="font-size: 18px; text-align: left; max-width: 600px; margin: 0 auto;">
                <li>Updating your browser to the latest version</li>
                <li>Enabling hardware acceleration in your browser settings</li>
                <li>Using a different browser (Chrome, Firefox, Edge, or Safari)</li>
                <li>Checking if your graphics drivers are up to date</li>
            </ul>
        `;
        document.body.appendChild(errorDiv);
    }
    
    showError(message) {
        // Remove any existing error divs first - be very specific
        const existingErrors = document.querySelectorAll('div[data-error-div="true"]');
        existingErrors.forEach(el => {
            // Double check it's actually an error div before removing
            if (el.hasAttribute('data-error-div') && el.getAttribute('data-error-div') === 'true') {
                el.remove();
            }
        });
        
        const errorDiv = document.createElement('div');
        errorDiv.setAttribute('data-error-div', 'true');
        errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10000; font-family: Arial, sans-serif; padding: 20px; text-align: center;';
        errorDiv.innerHTML = `
            <h1 style="font-size: 36px; margin-bottom: 20px; color: #ff0000;">Error</h1>
            <p style="font-size: 20px; margin-bottom: 30px;">${message}</p>
            <button id="error-reload-button" style="padding: 15px 40px; font-size: 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
        
        const reloadButton = document.getElementById('error-reload-button');
        if (reloadButton) {
            reloadButton.onclick = () => {
                window.location.reload();
            };
        }
    }
    
    clearErrors() {
        // #region agent log
        const endlessBefore = document.getElementById('endless-mode-checkbox');
        const multiplayerBefore = document.getElementById('multiplayer-button');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:265',message:'clearErrors called',data:{endlessExists:!!endlessBefore,multiplayerExists:!!multiplayerBefore,endlessParent:endlessBefore?.parentElement?.id,multiplayerParent:multiplayerBefore?.parentElement?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion
        
        // Remove any existing error divs - be very specific to only remove error divs
        const existingErrors = document.querySelectorAll('div[data-error-div="true"]');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:268',message:'Error cleanup query results',data:{errorCount:existingErrors.length,errorIds:Array.from(existingErrors).map(el=>el.id||'no-id'),errorTags:Array.from(existingErrors).map(el=>el.tagName)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        existingErrors.forEach(el => {
            // #region agent log
            const endlessDuring = document.getElementById('endless-mode-checkbox');
            const multiplayerDuring = document.getElementById('multiplayer-button');
            fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:270',message:'Processing error element',data:{elId:el.id||'no-id',elTag:el.tagName,willRemove:el.tagName === 'DIV' && el.hasAttribute('data-error-div') && el.getAttribute('data-error-div') === 'true',endlessExists:!!endlessDuring,multiplayerExists:!!multiplayerDuring},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            // Triple check: must be a div, have the attribute, and have error-like styling
            if (el.tagName === 'DIV' && 
                el.hasAttribute('data-error-div') && 
                el.getAttribute('data-error-div') === 'true' &&
                (el.style.position === 'fixed' || el.style.background === 'red' || el.style.background.includes('rgba(0, 0, 0'))) {
                el.remove();
            }
        });
        
        // #region agent log
        const endlessAfter = document.getElementById('endless-mode-checkbox');
        const multiplayerAfter = document.getElementById('multiplayer-button');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:280',message:'clearErrors completed',data:{endlessExists:!!endlessAfter,multiplayerExists:!!multiplayerAfter,endlessVisible:endlessAfter?.offsetParent !== null,multiplayerVisible:multiplayerAfter?.offsetParent !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion
    }
    
    loadHighScore(difficulty) {
        try {
            const saved = localStorage.getItem(`roboBlastersHighScore_${difficulty}`);
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            console.warn('Could not load high score:', e);
            return 0;
        }
    }
    
    saveHighScore(score, difficulty) {
        try {
            localStorage.setItem(`roboBlastersHighScore_${difficulty}`, score.toString());
            this.highScores[difficulty] = score;
            if (difficulty === this.difficulty) {
                this.highScore = score;
            }
        } catch (e) {
            console.warn('Could not save high score:', e);
        }
    }
    
    updateHighScore(score) {
        if (score > this.highScore) {
            this.saveHighScore(score, this.difficulty);
            this.highScore = score; // Update current high score
            return true; // New high score!
        }
        return false;
    }
    
    updateHighScoreForDifficulty() {
        // Update current high score when difficulty changes
        this.highScore = this.highScores[this.difficulty];
    }
    
    setupSettings() {
        const volumeSlider = document.getElementById('volume-slider');
        const volumeDisplay = document.getElementById('volume-display');
        
        if (volumeSlider && volumeDisplay) {
            // Load saved volume
            const savedVolume = this.loadVolume();
            volumeSlider.value = savedVolume;
            volumeDisplay.textContent = savedVolume;
            
            // Remove existing listeners to avoid duplicates
            const newSlider = volumeSlider.cloneNode(true);
            volumeSlider.parentNode.replaceChild(newSlider, volumeSlider);
            
            // Update volume when slider changes
            newSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                if (volumeDisplay) {
                    volumeDisplay.textContent = volume;
                }
                this.setVolume(volume / 100);
                this.saveVolume(volume);
            });
        }
        
        // Update current track name
        this.updateTrackDisplay();
        
        // Setup track navigation buttons
        const prevTrackButton = document.getElementById('prev-track-button');
        const nextTrackButton = document.getElementById('next-track-button');
        
        if (prevTrackButton) {
            prevTrackButton.onclick = () => {
                if (this.audioManager) {
                    this.audioManager.previousTrack();
                    this.updateTrackDisplay();
                }
            };
        }
        
        if (nextTrackButton) {
            nextTrackButton.onclick = () => {
                if (this.audioManager) {
                    this.audioManager.nextTrack();
                    this.updateTrackDisplay();
                }
            };
        }
    }
    
    updateTrackDisplay() {
        const trackNameEl = document.getElementById('current-track-name');
        if (trackNameEl && this.audioManager) {
            const trackName = this.audioManager.getCurrentTrackName();
            const trackIndex = this.audioManager.getCurrentTrackIndex();
            const trackCount = this.audioManager.getTrackCount();
            trackNameEl.textContent = `${trackName} (${trackIndex + 1}/${trackCount})`;
        }
    }
    
    loadVolume() {
        try {
            const saved = localStorage.getItem('roboBlastersVolume');
            return saved ? parseInt(saved, 10) : 50;
        } catch (e) {
            return 50;
        }
    }
    
    saveVolume(volume) {
        try {
            localStorage.setItem('roboBlastersVolume', volume.toString());
        } catch (e) {
            console.warn('Could not save volume:', e);
        }
    }
    
    loadDifficulty() {
        try {
            const saved = localStorage.getItem('roboBlastersDifficulty');
            return saved || 'medium'; // Default to medium
        } catch (e) {
            return 'medium';
        }
    }
    
    saveDifficulty(difficulty) {
        try {
            localStorage.setItem('roboBlastersDifficulty', difficulty);
        } catch (e) {
            console.warn('Could not save difficulty:', e);
        }
    }
    
    loadHighestWave() {
        try {
            const saved = localStorage.getItem('roboBlastersHighestWave');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }
    
    saveHighestWave(wave) {
        try {
            if (wave > this.highestWave) {
                localStorage.setItem('roboBlastersHighestWave', wave.toString());
                this.highestWave = wave;
            }
        } catch (e) {
            console.warn('Could not save highest wave:', e);
        }
    }
    
    calculateWaveEnemyCount(wave) {
        // Base count from difficulty
        let baseCount = 5; // default medium
        switch(this.difficulty) {
            case 'easy':
                baseCount = 3;
                break;
            case 'medium':
                baseCount = 5;
                break;
            case 'hard':
                baseCount = 10;
                break;
            case 'hardcore':
                baseCount = 15;
                break;
        }
        
        // Scaling: baseCount + (wave - 1) * scalingFactor
        const scalingFactor = Math.floor(baseCount * 0.3); // 30% increase per wave
        return baseCount + (wave - 1) * scalingFactor;
    }
    
    calculateWaveEnemyHealth(wave) {
        // 10% health increase per wave
        return 100 * (1 + wave * 0.1);
    }
    
    isBossWave(wave) {
        // Boss waves every 5 waves (5, 10, 15, 20, etc.)
        return wave % 5 === 0;
    }
    
    startWave(wave) {
        if (!wave || wave < 1) {
            console.error('Invalid wave number:', wave);
            return;
        }
        
        if (!this.targetManager) {
            console.error('TargetManager not initialized');
            return;
        }
        
        this.currentWave = wave;
        this.waveState = 'spawning';
        this.waveEnemiesTotal = this.calculateWaveEnemyCount(wave);
        this.waveEnemiesRemaining = this.waveEnemiesTotal;
        this.waveEnemiesSpawned = 0;
        // Store score at wave start to calculate wave score later
        this.waveStartScore = this.targetManager ? this.targetManager.getScore() : 0;
        this.lastSpawnTime = Date.now();
        
        // Update UI
        this.updateWaveUI();
    }
    
    spawnWaveEnemyGroup() {
        if (!this.targetManager || this.waveEnemiesSpawned >= this.waveEnemiesTotal) {
            return;
        }
        
        // Spawn 2-3 enemies at a time
        const groupSize = Math.min(2 + Math.floor(Math.random() * 2), this.waveEnemiesTotal - this.waveEnemiesSpawned);
        const isBoss = this.isBossWave(this.currentWave) && this.waveEnemiesSpawned === 0;
        
        for (let i = 0; i < groupSize; i++) {
            const position = this.targetManager.getRandomSpawnPosition();
            const designType = Math.random() < 0.7 ? 'standard' : (Math.random() < 0.5 ? 'square' : 'diamond');
            
            let target;
            if (isBoss && i === 0) {
                // Spawn boss robot
                target = this.createBossTarget(position, designType);
            } else {
                // Determine if blue or red robot
                const isBlue = Math.random() < 0.7 || !this.isEndless; // 70% blue, or all blue if not endless
                const pointValue = isBlue ? 20 : 10;
                target = new Target(position, this.scene, designType, this.camera, this.soundEffectManager, pointValue);
                
                // Scale health based on wave
                const waveHealth = this.calculateWaveEnemyHealth(this.currentWave);
                target.health = waveHealth;
                target.maxHealth = waveHealth;
            }
            
            target.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
            
            // Add to target manager's targets array
            this.targetManager.targets.push(target);
            
            // Set collision objects for the new target
            if (this.targetManager.collisionObjects && this.targetManager.collisionObjects.length > 0) {
                target.setCollisionObjects(this.targetManager.collisionObjects);
            }
            
            this.waveEnemiesSpawned++;
        }
        
        this.lastSpawnTime = Date.now();
    }
    
    createBossTarget(position, designType) {
        const target = new Target(position, this.scene, designType, this.camera, this.soundEffectManager, 20);
        
        // Boss stats: 3x health, 2x size, 50 points
        target.health = this.calculateWaveEnemyHealth(this.currentWave) * 3;
        target.maxHealth = target.health;
        target.pointValue = 50;
        
        // Scale mesh to 2x size
        target.mesh.scale.set(2, 2, 2);
        
        // Add glow effect - safely handle materials
        target.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                try {
                    // Handle material arrays
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    const newMaterials = [];
                    
                    materials.forEach((material) => {
                        if (material && material.isMaterial) {
                            // Clone material to avoid affecting other instances and ensure uniforms are initialized
                            const clonedMaterial = material.clone();
                            
                            // Only set emissive properties if the material supports them
                            if (clonedMaterial.emissive !== undefined) {
                                clonedMaterial.emissive = new THREE.Color(0xff0000);
                            }
                            if (clonedMaterial.emissiveIntensity !== undefined) {
                                clonedMaterial.emissiveIntensity = 0.5;
                            }
                            
                            // Ensure material needs update
                            clonedMaterial.needsUpdate = true;
                            newMaterials.push(clonedMaterial);
                        } else {
                            newMaterials.push(material);
                        }
                    });
                    
                    // Replace materials
                    if (Array.isArray(child.material)) {
                        child.material = newMaterials;
                    } else {
                        child.material = newMaterials[0];
                    }
                } catch (error) {
                    console.warn('Error modifying boss material:', error);
                    // Continue without modification if there's an error
                }
            }
        });
        
        // Mark as boss
        target.mesh.userData.isBoss = true;
        
        return target;
    }
    
    checkWaveComplete() {
        if (!this.targetManager) return false;
        
        try {
            const activeTargets = this.targetManager.targets.filter(t => t && !t.isDestroyed);
            this.waveEnemiesRemaining = activeTargets.length;
            
            if (this.waveEnemiesRemaining === 0 && this.waveEnemiesSpawned >= this.waveEnemiesTotal) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking wave complete:', error);
            return false;
        }
    }
    
    completeWave() {
        try {
            this.waveState = 'complete';
            this.saveHighestWave(this.currentWave);
            
            // Calculate wave score (score gained this wave)
            const currentTotalScore = this.targetManager ? this.targetManager.getScore() : 0;
            this.waveScore = currentTotalScore - (this.waveStartScore || 0);
            
            // Start break
            this.startWaveBreak();
        } catch (error) {
            console.error('Error completing wave:', error);
            // Try to recover by starting next wave
            if (this.currentWave) {
                this.startWave(this.currentWave + 1);
            }
        }
    }
    
    startWaveBreak() {
        this.waveState = 'break';
        this.breakTimeRemaining = this.breakDuration;
        
        // Heal player (partial restore)
        if (this.player) {
            const healAmount = Math.floor(this.player.maxHealth * 0.3); // 30% heal
            this.player.heal(healAmount);
        }
        
        // Refill ammo
        if (this.weaponManager) {
            this.weaponManager.weapons.forEach(weapon => {
                weapon.currentAmmo = weapon.maxAmmo;
                weapon.magazineAmmo = weapon.magazineSize;
            });
        }
        
        this.updateWaveUI();
    }
    
    setVolume(volume) {
        if (this.audioManager) {
            this.audioManager.setVolume(volume);
        }
    }
    
    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        const leaderboardSection = document.querySelector('.pause-section:has(#leaderboard-list)');
        if (!leaderboardList) return;
        
        // Get or create difficulty selector
        let difficultySelector = document.getElementById('leaderboard-difficulty-selector');
        if (!difficultySelector && leaderboardSection) {
            // Create difficulty selector
            const selectorContainer = document.createElement('div');
            selectorContainer.style.cssText = 'margin-bottom: 15px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap;';
            
            const label = document.createElement('label');
            label.textContent = 'Difficulty: ';
            label.style.cssText = 'color: white; font-size: 16px;';
            
            difficultySelector = document.createElement('select');
            difficultySelector.id = 'leaderboard-difficulty-selector';
            difficultySelector.style.cssText = 'padding: 8px 12px; font-size: 16px; background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; cursor: pointer;';
            
            const difficulties = [
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
                { value: 'hardcore', label: 'Hardcore' }
            ];
            
            difficulties.forEach(diff => {
                const option = document.createElement('option');
                option.value = diff.value;
                option.textContent = diff.label;
                if (diff.value === this.difficulty) {
                    option.selected = true;
                }
                difficultySelector.appendChild(option);
            });
            
            // Create mode selector
            const modeLabel = document.createElement('label');
            modeLabel.textContent = 'Mode: ';
            modeLabel.style.cssText = 'color: white; font-size: 16px;';
            
            const modeSelector = document.createElement('select');
            modeSelector.id = 'leaderboard-mode-selector';
            modeSelector.style.cssText = 'padding: 8px 12px; font-size: 16px; background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; cursor: pointer;';
            
            const modes = [
                { value: 'normal', label: 'Normal' },
                { value: 'endless', label: 'Endless' },
                { value: 'survival', label: 'Survival' }
            ];
            
            modes.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.value;
                option.textContent = mode.label;
                if (mode.value === this.getGameMode()) {
                    option.selected = true;
                }
                modeSelector.appendChild(option);
            });
            
            const updateDisplay = () => {
                const selectedDifficulty = difficultySelector.value;
                const selectedMode = modeSelector.value;
                this.displayLeaderboardForDifficulty(selectedDifficulty, selectedMode);
            };
            
            difficultySelector.addEventListener('change', updateDisplay);
            modeSelector.addEventListener('change', updateDisplay);
            
            selectorContainer.appendChild(label);
            selectorContainer.appendChild(difficultySelector);
            selectorContainer.appendChild(modeLabel);
            selectorContainer.appendChild(modeSelector);
            
            // Insert before leaderboard list
            const h2 = leaderboardSection.querySelector('h2');
            if (h2 && h2.nextSibling) {
                leaderboardSection.insertBefore(selectorContainer, h2.nextSibling);
            } else {
                leaderboardSection.appendChild(selectorContainer);
            }
        }
        
        // Display leaderboard for current difficulty and mode
        this.displayLeaderboardForDifficulty(this.difficulty, this.getGameMode());
    }
    
    displayLeaderboardForDifficulty(difficulty, mode = null) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        const gameMode = mode || this.getGameMode();
        const scores = this.loadLeaderboard(difficulty, gameMode);
        const highScore = this.highScores[difficulty] || 0;
        
        leaderboardList.innerHTML = '';
        
        if (scores.length === 0 && highScore === 0) {
            leaderboardList.innerHTML = '<li class="no-scores">No scores yet</li>';
            return;
        }
        
        // Show top 10 scores
        scores.forEach((scoreEntry, index) => {
            const item = document.createElement('li');
            item.className = 'leaderboard-item';
            
            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'leaderboard-score';
            scoreSpan.textContent = scoreEntry.score;
            
            const dateSpan = document.createElement('span');
            dateSpan.className = 'leaderboard-date';
            const date = new Date(scoreEntry.date);
            dateSpan.textContent = date.toLocaleDateString();
            
            item.appendChild(rank);
            item.appendChild(scoreSpan);
            item.appendChild(dateSpan);
            leaderboardList.appendChild(item);
        });
        
        // Update selectors if they exist
        const difficultySelector = document.getElementById('leaderboard-difficulty-selector');
        if (difficultySelector) {
            difficultySelector.value = difficulty;
        }
        
        const modeSelector = document.getElementById('leaderboard-mode-selector');
        if (modeSelector) {
            modeSelector.value = gameMode;
        }
    }
    
    getGameMode() {
        // Determine current game mode
        if (this.isSurvivalMode) {
            return 'survival';
        } else if (this.isEndless) {
            return 'endless';
        }
        return 'normal';
    }
    
    loadLeaderboard(difficulty, mode = null) {
        try {
            const gameMode = mode || this.getGameMode();
            const key = `roboBlastersLeaderboard_${difficulty}_${gameMode}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const scores = JSON.parse(saved);
                // Sort by score (descending) and limit to top 10
                return scores.sort((a, b) => b.score - a.score).slice(0, 10);
            }
        } catch (e) {
            console.warn('Could not load leaderboard:', e);
        }
        return [];
    }
    
    saveToLeaderboard(score) {
        try {
            const gameMode = this.getGameMode();
            const scores = this.loadLeaderboard(this.difficulty, gameMode);
            // Check if this score is already in the leaderboard
            const existingScore = scores.find(s => s.score === score && Math.abs(s.date - Date.now()) < 1000);
            if (!existingScore) {
                scores.push({
                    score: score,
                    date: Date.now(),
                    mode: gameMode
                });
                // Sort by score (descending) and limit to top 10
                const sortedScores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
                const key = `roboBlastersLeaderboard_${this.difficulty}_${gameMode}`;
                localStorage.setItem(key, JSON.stringify(sortedScores));
            }
        } catch (e) {
            console.warn('Could not save to leaderboard:', e);
        }
    }
    
    setupUI() {
        const startButton = document.getElementById('start-button');
        const startScreen = document.getElementById('start-screen');
        
        // Setup difficulty buttons
        const difficultyButtons = document.querySelectorAll('.difficulty-button');
        
        // Load saved difficulty preference
        const savedDifficulty = this.loadDifficulty();
        this.difficulty = savedDifficulty;
        
        // First, remove selected class and aria-checked from all buttons
        difficultyButtons.forEach(button => {
            button.classList.remove('selected');
            button.setAttribute('aria-checked', 'false');
        });
        
        // Set the selected button based on saved preference
        difficultyButtons.forEach(button => {
            if (button.getAttribute('data-difficulty') === savedDifficulty) {
                button.classList.add('selected');
                button.setAttribute('aria-checked', 'true');
            }
        });
        
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Play menu click sound
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('menu_click');
                }
                // Remove selected class from all buttons
                difficultyButtons.forEach(btn => {
                    btn.classList.remove('selected');
                    btn.setAttribute('aria-checked', 'false');
                });
                // Add selected class to clicked button
                button.classList.add('selected');
                button.setAttribute('aria-checked', 'true');
                // Set difficulty
                this.difficulty = button.getAttribute('data-difficulty');
                // Save difficulty preference
                this.saveDifficulty(this.difficulty);
                // Update high score display for new difficulty
                this.updateHighScoreForDifficulty();
                // Update leaderboard display
                this.updateLeaderboard();
            });
        });
        
        startButton.addEventListener('click', () => {
            // #region agent log
            const endlessBeforeStart = document.getElementById('endless-mode-checkbox');
            const multiplayerBeforeStart = document.getElementById('multiplayer-button');
            fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:596',message:'Start button clicked',data:{endlessExists:!!endlessBeforeStart,multiplayerExists:!!multiplayerBeforeStart,endlessVisible:endlessBeforeStart?.offsetParent !== null,multiplayerVisible:multiplayerBeforeStart?.offsetParent !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
            // #endregion
            
            // Play menu click sound
            if (this.soundEffectManager) {
                this.soundEffectManager.playSound('menu_click');
            }
            startScreen.classList.add('hidden');
            
            // #region agent log
            const endlessAfterHide = document.getElementById('endless-mode-checkbox');
            const multiplayerAfterHide = document.getElementById('multiplayer-button');
            fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:604',message:'After hiding start screen',data:{endlessExists:!!endlessAfterHide,multiplayerExists:!!multiplayerAfterHide,endlessVisible:endlessAfterHide?.offsetParent !== null,multiplayerVisible:multiplayerAfterHide?.offsetParent !== null,startScreenHidden:startScreen.classList.contains('hidden')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
            // #endregion
            
            this.start();
        });
        
        // Setup help button
        this.setupHelpButton();
        
        // Setup multiplayer UI
        this.setupMultiplayerUI();
    }
    
    setupMultiplayerUI() {
        // #region agent log
        const endlessAtSetup = document.getElementById('endless-mode-checkbox');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:610',message:'setupMultiplayerUI called',data:{endlessExists:!!endlessAtSetup,endlessVisible:endlessAtSetup?.offsetParent !== null,endlessParent:endlessAtSetup?.parentElement?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D'})}).catch(()=>{});
        // #endregion
        
        const multiplayerButton = document.getElementById('multiplayer-button');
        const createPartyButton = document.getElementById('create-party-button');
        const joinPartyButton = document.getElementById('join-party-button');
        const leavePartyButton = document.getElementById('leave-party-button');
        const backToMenuButton = document.getElementById('back-to-menu-button');
        const readyButton = document.getElementById('ready-button');
        const startPartyGameButton = document.getElementById('start-party-game-button');
        const playerNameInput = document.getElementById('player-name-input');
        const roomCodeInput = document.getElementById('room-code-input');
        const partyLobby = document.getElementById('party-lobby');
        const startScreen = document.getElementById('start-screen');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:625',message:'Elements found in setupMultiplayerUI',data:{multiplayerExists:!!multiplayerButton,startScreenExists:!!startScreen,multiplayerVisible:multiplayerButton?.offsetParent !== null,startScreenHidden:startScreen?.classList.contains('hidden')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D'})}).catch(()=>{});
        // #endregion
        
        // Multiplayer button on start screen
        if (multiplayerButton) {
            multiplayerButton.addEventListener('click', () => {
                startScreen.classList.add('hidden');
                partyLobby.classList.remove('hidden');
                this.networkClient.connect();
                this.updateConnectionStatus();
            });
        }
        
        // Create party
        if (createPartyButton) {
            createPartyButton.addEventListener('click', () => {
                const playerName = playerNameInput.value.trim() || 'Player' + Math.floor(Math.random() * 1000);
                this.networkClient.createRoom(playerName);
            });
        }
        
        // Join party
        if (joinPartyButton) {
            joinPartyButton.addEventListener('click', () => {
                const roomCode = roomCodeInput.value.trim().toUpperCase();
                const playerName = playerNameInput.value.trim() || 'Player' + Math.floor(Math.random() * 1000);
                if (roomCode.length === 6) {
                    this.networkClient.joinRoom(roomCode, playerName);
                } else {
                    alert('Please enter a valid 6-character room code');
                }
            });
        }
        
        // Leave party
        if (leavePartyButton) {
            leavePartyButton.addEventListener('click', () => {
                this.networkClient.disconnect();
                partyLobby.classList.add('hidden');
                startScreen.classList.remove('hidden');
                this.isMultiplayer = false;
            });
        }
        
        // Back to menu button (from party actions)
        if (backToMenuButton) {
            backToMenuButton.addEventListener('click', () => {
                // Disconnect if connected
                if (this.networkClient && this.networkClient.isConnected) {
                    this.networkClient.disconnect();
                }
                partyLobby.classList.add('hidden');
                startScreen.classList.remove('hidden');
                this.isMultiplayer = false;
            });
        }
        
        // Ready button
        if (readyButton) {
            readyButton.addEventListener('click', () => {
                this.networkClient.toggleReady();
            });
        }
        
        // Start game button (leader only)
        if (startPartyGameButton) {
            startPartyGameButton.addEventListener('click', () => {
                this.networkClient.startGame();
            });
        }
        
        // Setup network client callbacks
        this.networkClient.onRoomJoined = (data) => {
            const partyInfo = document.getElementById('party-info');
            const partyActions = document.getElementById('party-actions');
            if (partyInfo) partyInfo.classList.remove('hidden');
            if (partyActions) partyActions.classList.add('hidden');
            const roomCodeDisplay = document.getElementById('room-code-display');
            if (roomCodeDisplay) roomCodeDisplay.textContent = data.roomId;
            this.updatePlayerList(data.players);
        };
        
        this.networkClient.onPlayerJoined = (player) => {
            this.updatePlayerList(this.networkClient.players);
        };
        
        this.networkClient.onPlayerLeft = (playerId) => {
            this.updatePlayerList(this.networkClient.players);
            // Remove other player from scene if they left
            if (this.otherPlayers.has(playerId)) {
                const otherPlayer = this.otherPlayers.get(playerId);
                if (otherPlayer.mesh) {
                    this.scene.remove(otherPlayer.mesh);
                }
                this.otherPlayers.delete(playerId);
            }
        };
        
        this.networkClient.onReadyChanged = (data) => {
            this.updatePlayerList(this.networkClient.players);
        };
        
        this.networkClient.onAllReady = () => {
            if (this.networkClient.isLeader) {
                const startButton = document.getElementById('start-party-game-button');
                if (startButton) startButton.classList.remove('hidden');
            }
        };
        
        this.networkClient.onDifficultyChanged = (difficulty) => {
            this.difficulty = difficulty;
            // Update difficulty buttons
            const lobby = document.getElementById('party-lobby');
            if (lobby) {
                lobby.querySelectorAll('.difficulty-button').forEach(btn => {
                    btn.classList.remove('selected');
                    if (btn.getAttribute('data-difficulty') === difficulty) {
                        btn.classList.add('selected');
                    }
                });
            }
        };
        
        this.networkClient.onGameStarting = (data) => {
            this.isMultiplayer = true;
            this.difficulty = data.difficulty;
            this.multiplayerScores.clear();
            this.teamScore = 0;
            // Initialize scores for all players
            data.players.forEach(player => {
                this.multiplayerScores.set(player.id, 0);
            });
            if (partyLobby) partyLobby.classList.add('hidden');
            this.start();
        };
        
        this.networkClient.onPlayerMoved = (data) => {
            if (data.playerId !== this.networkClient.playerId) {
                this.updateOtherPlayerPosition(data.playerId, data.position, data.rotation);
            }
        };
        
        this.networkClient.onPlayerShot = (data) => {
            // Handle other player shooting (visual effects only)
            if (data.playerId !== this.networkClient.playerId) {
                // Could add muzzle flash or other effects for other players
            }
        };
        
        this.networkClient.onTargetHit = (data) => {
            // Server-validated target hit from another player
            if (data.playerId !== this.networkClient.playerId && this.targetManager) {
                // Apply damage to target
                const targets = this.targetManager.getTargets();
                const target = targets.find(t => t.mesh && t.mesh.userData.targetId === data.targetId);
                if (target) {
                    target.takeDamage(data.damage);
                }
            }
        };
        
        this.networkClient.onPlayerHealthUpdated = (data) => {
            // Update other player's health display
            if (data.playerId !== this.networkClient.playerId) {
                const otherPlayer = this.otherPlayers.get(data.playerId);
                if (otherPlayer) {
                    otherPlayer.health = data.health;
                    otherPlayer.maxHealth = data.maxHealth;
                }
            }
        };
        
        this.networkClient.onLeaderChanged = (data) => {
            this.networkClient.isLeader = data.playerId === this.networkClient.playerId;
            this.updatePlayerList(this.networkClient.players);
        };
        
        this.networkClient.onScoreUpdated = (data) => {
            this.multiplayerScores.set(data.playerId, data.score);
            
            // Calculate team score (sum of all player scores)
            let totalScore = 0;
            this.multiplayerScores.forEach(score => {
                totalScore += score;
            });
            this.teamScore = totalScore;
            
            // Update UI
            this.updateMultiplayerHUD();
        };
        
        this.networkClient.onTargetStateUpdated = (data) => {
            // Sync target state from other players
            if (this.targetManager && data.targetId) {
                const targets = this.targetManager.getTargets();
                const target = targets.find(t => t.mesh && t.mesh.userData.targetId === data.targetId);
                if (target && !target.isDestroyed && data.isDestroyed) {
                    // Target was destroyed by another player
                    target.destroy();
                }
            }
        };
        
        this.networkClient.onPowerUpPickedUp = (data) => {
            // Remove power-up if another player picked it up
            if (this.powerUpManager && data.powerUpId) {
                this.powerUpManager.removePowerUp(data.powerUpId);
            }
        };
        
        this.networkClient.onError = (error) => {
            alert('Error: ' + error.message);
        };
        
        // Difficulty buttons in lobby
        if (partyLobby) {
            const lobbyDifficultyButtons = partyLobby.querySelectorAll('.difficulty-button');
            lobbyDifficultyButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (this.networkClient.isLeader) {
                        lobbyDifficultyButtons.forEach(btn => btn.classList.remove('selected'));
                        button.classList.add('selected');
                        const difficulty = button.getAttribute('data-difficulty');
                        this.networkClient.setDifficulty(difficulty);
                    }
                });
            });
        }
    }
    
    updatePlayerList(players) {
        const playerList = document.getElementById('player-list');
        const playerCount = document.querySelector('#party-players h3');
        if (!playerList) return;
        
        playerList.innerHTML = '';
        
        if (playerCount) {
            playerCount.textContent = `Players (${players.length}/4)`;
        }
        
        players.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="player-name">${player.name}${player.isLeader ? ' <span class="player-leader">(Leader)</span>' : ''}</span>
                <span class="player-status ${player.isReady ? 'player-ready' : ''}">${player.isReady ? 'Ready' : 'Not Ready'}</span>
            `;
            playerList.appendChild(li);
        });
        
        // Update ready button text
        const readyButton = document.getElementById('ready-button');
        const currentPlayer = players.find(p => p.id === this.networkClient.playerId);
        if (readyButton && currentPlayer) {
            readyButton.textContent = currentPlayer.isReady ? 'Not Ready' : 'Ready';
            readyButton.style.background = currentPlayer.isReady ? '#f44336' : '#ff9800';
        }
        
        // Show/hide start button for leader
        const startButton = document.getElementById('start-party-game-button');
        if (startButton) {
            if (this.networkClient.isLeader && players.length >= 1) {
                startButton.classList.remove('hidden');
            } else {
                startButton.classList.add('hidden');
            }
        }
    }
    
    updateConnectionStatus() {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        
        if (this.networkClient.isConnected) {
            if (indicator) indicator.style.background = '#4CAF50';
            if (text) text.textContent = 'Connected';
        } else {
            if (indicator) indicator.style.background = '#f44336';
            if (text) text.textContent = 'Disconnected';
        }
        
        // Update periodically
        setTimeout(() => this.updateConnectionStatus(), 1000);
    }
    
    updateOtherPlayerPosition(playerId, position, rotation) {
        if (!this.scene) return;
        
        if (!this.otherPlayers.has(playerId)) {
            // Create visual representation for other player
            const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            this.scene.add(mesh);
            
            this.otherPlayers.set(playerId, {
                mesh: mesh,
                health: 100,
                maxHealth: 100
            });
        }
        
        const otherPlayer = this.otherPlayers.get(playerId);
        if (otherPlayer && otherPlayer.mesh) {
            otherPlayer.mesh.position.set(position.x, position.y, position.z);
            otherPlayer.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }
    
    isPlayerAtSpawnPoint() {
        if (!this.player || !this.player.position) {
            return false;
        }
        
        const pos = this.player.position;
        const spawnCenterX = 0;
        const spawnCenterZ = 0;
        const spawnRadius = 2.5; // Slightly larger than platform radius (1.8)
        const minY = 3.5;
        const maxY = 5.5;
        
        // Check if player is within spawn zone
        const distanceFromCenter = Math.sqrt(
            Math.pow(pos.x - spawnCenterX, 2) + 
            Math.pow(pos.z - spawnCenterZ, 2)
        );
        
        const isWithinRadius = distanceFromCenter <= spawnRadius;
        const isWithinHeight = pos.y >= minY && pos.y <= maxY;
        
        return isWithinRadius && isWithinHeight;
    }
    
    init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
            this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
            
            // Create camera with better far plane for ground visibility
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                2000 // Increased far plane
            );
            
            // Create renderer
            const container = document.getElementById('canvas-container');
            if (!container) {
                throw new Error('Canvas container not found');
            }
            
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            if (!this.renderer) {
                throw new Error('Failed to create WebGL renderer');
            }
            
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.domElement.id = 'game-canvas'; // Add ID for easier selection
            container.appendChild(this.renderer.domElement);
        
        // Initialize visual effects manager
        this.visualEffectsManager = new VisualEffectsManager(this.scene, this.camera, this.renderer);
        
        // Setup lighting
        this.setupLighting();
        
        // Create environment
        this.createEnvironment();
        
        // Create targets first (needed for collision) - pass difficulty and camera
        this.targetManager = new TargetManager(this.scene, this.difficulty, this.camera, this.soundEffectManager, this.isEndless);
        
        // Create player with collision objects
        this.player = new Player(this.camera, this.scene, this.soundEffectManager);
        this.setupPlayerCallbacks();
        
        // Create weapon manager with multiple weapons
        this.weaponManager = new WeaponManager(this.camera, this.scene, this.soundEffectManager);
        this.setupWeaponCallbacks();
        
        // Create power-up manager
        this.powerUpManager = new PowerUpManager(this.scene, this.soundEffectManager);
        
        // Create mini-map
        const minimapCanvas = document.getElementById('minimap');
        if (minimapCanvas) {
            this.miniMapManager = new MiniMapManager(minimapCanvas, this.scene, this.camera);
        }
        
        // Update player with collision objects
        this.updatePlayerCollisions();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Initialize audio manager with playlist
        const musicPlaylist = [
            'assets/music.mp3',
            'assets/music2.mp3',
            'assets/music3.mp3',
            'assets/music4.mp3'
        ];
        this.audioManager.init(musicPlaylist);
        
        // Load saved volume
        const savedVolume = this.loadVolume();
        this.setVolume(savedVolume / 100);
        
        // Handle mouse click for shooting
        document.addEventListener('click', (e) => {
            if (this.isRunning && !this.isPaused && !this.isAttachmentMenuOpen && !this.isHelpMenuOpen && document.pointerLockElement && !this.isPlayerAtSpawnPoint()) {
                const currentTime = this.clock.getElapsedTime() * 1000;
                // Get all obstacles for ricochet detection
                const obstacles = this.obstacles || [];
                this.weaponManager.shoot(currentTime, this.targetManager.getTargets(), obstacles);
                
                // Send shoot event to server (multiplayer)
                if (this.isMultiplayer && this.networkClient.isConnected && this.camera) {
                    const direction = new THREE.Vector3();
                    this.camera.getWorldDirection(direction);
                    const currentWeapon = this.weaponManager.getCurrentWeapon();
                    this.networkClient.sendPlayerShoot(
                        currentWeapon ? currentWeapon.name : 'unknown',
                        direction
                    );
                }
            }
        });
        
        // Handle reload
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.isRunning && !this.isPaused && !this.isAttachmentMenuOpen && !this.isHelpMenuOpen) {
                const currentTime = this.clock.getElapsedTime() * 1000;
                this.weaponManager.reload(currentTime);
            }
            
            // Skip wave break with Space or Enter
            if ((e.code === 'Space' || e.code === 'Enter') && this.isSurvivalMode && this.waveState === 'break' && this.isRunning && !this.isPaused) {
                this.breakTimeRemaining = 0;
            }
            
            // Handle pause/unpause
            if (e.code === 'KeyP' && this.isRunning && !this.isAttachmentMenuOpen) {
                this.togglePause();
            }
            
            // Attachment menu toggle (T key)
            if (e.code === 'KeyT' && this.isRunning && !this.isPaused && !this.isGameOver) {
                this.toggleAttachmentMenu();
            }
            
            // Help menu toggle (H key) - works in game and main menu
            if (e.code === 'KeyH') {
                this.toggleHelpMenu();
            }
            
            // Quick restart shortcut (F5 or R when game over)
            if ((e.code === 'F5' || (e.code === 'KeyR' && this.isGameOver)) && this.isGameOver) {
                e.preventDefault(); // Prevent browser refresh on F5
                this.restart();
            }
            
            // Keyboard navigation for menus
            this.handleKeyboardNavigation(e);
        });
        
        // Hide loading screen once initialization is complete
        this.hideLoadingScreen();
        
        } catch (error) {
            this.hideLoadingScreen();
            this.showError('Failed to initialize game: ' + error.message);
            console.error('Game initialization error:', error);
            throw error; // Re-throw to be caught by constructor
        }
    }
    
    showLoadingScreen() {
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.95); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10001; font-family: Arial, sans-serif;';
            loadingOverlay.innerHTML = `
                <h1 style="font-size: 48px; margin-bottom: 30px;">ROBO BLASTERS</h1>
                <div id="loading-spinner" style="width: 50px; height: 50px; border: 5px solid rgba(255, 255, 255, 0.3); border-top-color: #00ff00; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                <p id="loading-text" style="font-size: 24px;">Loading game...</p>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loadingOverlay);
        } else {
            loadingOverlay.style.display = 'flex';
        }
    }
    
    hideLoadingScreen() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    togglePause() {
        if (this.isAttachmentMenuOpen || this.isHelpMenuOpen) return; // Can't pause while menus are open
        
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            if (this.isPaused) {
                pauseOverlay.classList.remove('hidden');
                // Pause music
                if (this.audioManager) {
                    this.audioManager.pause();
                }
                // Exit pointer lock when paused
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                // Update leaderboard and settings
                this.updateLeaderboard();
                this.setupSettings();
                this.updateTrackDisplay();
                
                // Setup return to menu button
                const pauseReturnButton = document.getElementById('pause-return-button');
                if (pauseReturnButton) {
                    pauseReturnButton.onclick = () => {
                        this.returnToMenu();
                    };
                }
            } else {
                pauseOverlay.classList.add('hidden');
                // Resume music
                if (this.audioManager) {
                    this.audioManager.resume();
                }
                // Re-request pointer lock when unpaused
                setTimeout(() => {
                    this.player.requestPointerLock();
                }, 100);
            }
        }
    }
    
    toggleAttachmentMenu() {
        this.isAttachmentMenuOpen = !this.isAttachmentMenuOpen;
        const attachmentMenu = document.getElementById('attachment-menu');
        
        if (attachmentMenu) {
            if (this.isAttachmentMenuOpen) {
                attachmentMenu.classList.remove('hidden');
                // Pause the game when menu opens
                this.isPaused = true;
                // Pause music
                if (this.audioManager) {
                    this.audioManager.pause();
                }
                // Exit pointer lock when menu is open
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                // Update menu content
                this.updateAttachmentMenu();
                
                // Setup close button
                const closeButton = document.getElementById('attachment-close-button');
                if (closeButton) {
                    closeButton.onclick = () => {
                        if (this.soundEffectManager) {
                            this.soundEffectManager.playSound('menu_click');
                        }
                        this.toggleAttachmentMenu();
                    };
                }
            } else {
                attachmentMenu.classList.add('hidden');
                // Resume the game when menu closes
                this.isPaused = false;
                // Resume music
                if (this.audioManager) {
                    this.audioManager.resume();
                }
                // Re-request pointer lock when menu closes
                setTimeout(() => {
                    if (this.isRunning && !this.isPaused) {
                        this.player.requestPointerLock();
                    }
                }, 100);
            }
        }
    }
    
    setupHelpButton() {
        const helpButton = document.getElementById('help-button');
        if (helpButton && !helpButton.dataset.listenerAttached) {
            // Mark as attached to prevent duplicate listeners
            helpButton.dataset.listenerAttached = 'true';
            
            // Attach click handler - use direct onclick assignment
            helpButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('menu_click');
                }
                this.toggleHelpMenu();
                return false;
            };
        }
    }
    
    toggleHelpMenu() {
        this.isHelpMenuOpen = !this.isHelpMenuOpen;
        const helpOverlay = document.getElementById('help-overlay');
        
        if (helpOverlay) {
            if (this.isHelpMenuOpen) {
                helpOverlay.classList.remove('hidden');
                // Reset to first slide
                this.tutorialCurrentSlide = 0;
                this.updateTutorialSlide();
                // Only pause if game is running
                if (this.isRunning) {
                    this.isPaused = true;
                    // Pause music
                    if (this.audioManager) {
                        this.audioManager.pause();
                    }
                    // Exit pointer lock when menu is open
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                }
                
                // Setup close button
                const closeButton = document.getElementById('help-close-button');
                if (closeButton) {
                    closeButton.onclick = () => {
                        if (this.soundEffectManager) {
                            this.soundEffectManager.playSound('menu_click');
                        }
                        this.toggleHelpMenu();
                    };
                }
                
                // Setup navigation buttons
                this.setupTutorialNavigation();
            } else {
                helpOverlay.classList.add('hidden');
                // Only resume if game is running
                if (this.isRunning) {
                    this.isPaused = false;
                    // Resume music
                    if (this.audioManager) {
                        this.audioManager.resume();
                    }
                    // Re-request pointer lock when menu closes
                    setTimeout(() => {
                        if (this.isRunning && !this.isPaused) {
                            this.player.requestPointerLock();
                        }
                    }, 100);
                }
            }
        }
    }
    
    setupTutorialNavigation() {
        const prevButton = document.getElementById('tutorial-prev');
        const nextButton = document.getElementById('tutorial-next');
        
        if (prevButton) {
            prevButton.onclick = () => {
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('menu_click');
                }
                if (this.tutorialCurrentSlide > 0) {
                    this.tutorialCurrentSlide--;
                    this.updateTutorialSlide();
                }
            };
        }
        
        if (nextButton) {
            nextButton.onclick = () => {
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('menu_click');
                }
                const slides = document.querySelectorAll('.tutorial-slide');
                if (this.tutorialCurrentSlide < slides.length - 1) {
                    this.tutorialCurrentSlide++;
                    this.updateTutorialSlide();
                }
            };
        }
    }
    
    updateTutorialSlide() {
        const slides = document.querySelectorAll('.tutorial-slide');
        const pageIndicator = document.getElementById('tutorial-page-indicator');
        const prevButton = document.getElementById('tutorial-prev');
        const nextButton = document.getElementById('tutorial-next');
        
        // Hide all slides
        slides.forEach((slide, index) => {
            if (index === this.tutorialCurrentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        
        // Update page indicator
        if (pageIndicator) {
            pageIndicator.textContent = `${this.tutorialCurrentSlide + 1} / ${slides.length}`;
        }
        
        // Update button states
        if (prevButton) {
            prevButton.disabled = this.tutorialCurrentSlide === 0;
        }
        if (nextButton) {
            nextButton.disabled = this.tutorialCurrentSlide === slides.length - 1;
        }
    }
    
    updateAttachmentMenu() {
        if (!this.weaponManager) return;
        
        const weapon = this.weaponManager.getCurrentWeapon();
        const weaponNameEl = document.getElementById('attachment-weapon-name');
        const attachmentListEl = document.getElementById('attachment-list');
        
        if (!weaponNameEl || !attachmentListEl) return;
        
        // Get available attachments
        const availableAttachments = this.weaponManager.getAvailableAttachments();
        const equippedAttachments = this.weaponManager.getEquippedAttachments(weapon);
        
        // Update weapon name with attachment count
        const equippedCount = equippedAttachments.length;
        weaponNameEl.textContent = `${weapon.weaponName || 'Current Weapon'} (${equippedCount}/2 attachments)`;
        
        // Clear list
        attachmentListEl.innerHTML = '';
        
        // Attachment descriptions
        const attachmentDescriptions = {
            'scope': { name: 'Scope', stats: '+50% Range, -10% Fire Rate' },
            'silencer': { name: 'Silencer', stats: '-15% Damage, +10% Fire Rate' },
            'extended_mag': { name: 'Extended Magazine', stats: '+50% Magazine Size' },
            'damage_boost': { name: 'Damage Boost', stats: '+25% Damage' },
            'fire_rate_boost': { name: 'Fire Rate Boost', stats: '+20% Fire Rate' }
        };
        
        // Check if weapon has reached attachment limit (2)
        const hasReachedLimit = equippedAttachments.length >= 2;
        
        // Create attachment items
        availableAttachments.forEach(attachmentType => {
            const isEquipped = equippedAttachments.includes(attachmentType);
            const desc = attachmentDescriptions[attachmentType] || { name: attachmentType, stats: '' };
            
            const item = document.createElement('div');
            item.className = `attachment-item ${isEquipped ? 'equipped' : ''}`;
            
            const info = document.createElement('div');
            info.className = 'attachment-info';
            
            const name = document.createElement('div');
            name.className = 'attachment-name';
            name.textContent = desc.name;
            
            const stats = document.createElement('div');
            stats.className = 'attachment-stats';
            stats.textContent = desc.stats;
            
            info.appendChild(name);
            info.appendChild(stats);
            
            const button = document.createElement('button');
            button.className = `attachment-button ${isEquipped ? 'equipped' : ''}`;
            button.textContent = isEquipped ? 'Unequip' : 'Equip';
            
            // Disable button if limit reached and not already equipped
            if (!isEquipped && hasReachedLimit) {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.textContent = 'Limit Reached';
            }
            
            button.onclick = () => {
                if (this.soundEffectManager) {
                    this.soundEffectManager.playSound('menu_click');
                }
                if (isEquipped) {
                    this.weaponManager.detach(weapon, attachmentType);
                } else {
                    // Check limit before attaching
                    if (equippedAttachments.length >= 2) {
                        return; // Can't equip more than 2
                    }
                    this.weaponManager.attach(weapon, attachmentType);
                }
                // Update UI
                this.updateAttachmentMenu();
                this.updateUI(); // Update ammo display in case magazine size changed
            };
            
            item.appendChild(info);
            item.appendChild(button);
            attachmentListEl.appendChild(item);
        });
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);
    }
    
    createEnvironment() {
        // Create large, always-visible ground plane with improved texture
        const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
        
        // Create ground texture with variation
        const groundCanvas = document.createElement('canvas');
        groundCanvas.width = 512;
        groundCanvas.height = 512;
        const groundCtx = groundCanvas.getContext('2d');
        
        // Base grass color
        groundCtx.fillStyle = '#4a7c59';
        groundCtx.fillRect(0, 0, 512, 512);
        
        // Add texture variation (dirt patches, darker grass)
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 20 + Math.random() * 40;
            const brightness = 0.7 + Math.random() * 0.3;
            groundCtx.fillStyle = `rgba(${74 * brightness}, ${124 * brightness}, ${89 * brightness}, 0.5)`;
            groundCtx.beginPath();
            groundCtx.arc(x, y, size, 0, Math.PI * 2);
            groundCtx.fill();
        }
        
        const groundTexture = new THREE.CanvasTexture(groundCanvas);
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(8, 8);
        
        const groundMaterial = new THREE.MeshStandardMaterial({
            map: groundTexture,
            color: 0x4a7c59,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        ground.frustumCulled = false;
        this.scene.add(ground);
        
        // Add grid lines on ground for detail
        const gridHelper = new THREE.GridHelper(500, 50, 0x2a4a3a, 0x2a4a3a);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
        
        // Add grass texture effect with small boxes
        for (let i = 0; i < 400; i++) {
            const grassGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
            const grassMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.25, 0.7, 0.3 + Math.random() * 0.2)
            });
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(
                (Math.random() - 0.5) * 400,
                0.15,
                (Math.random() - 0.5) * 400
            );
            grass.rotation.y = Math.random() * Math.PI * 2;
            grass.castShadow = true;
            grass.frustumCulled = false;
            this.scene.add(grass);
        }
        
        // Add elevated platforms for vertical gameplay
        // this.createElevatedPlatforms(); // Disabled - user didn't request these table-like objects
        
        // Add strategic structures
        this.createStrategicStructures();
        
        // Add varied obstacles and structures
        this.createVariedObstacles();
        
        // Add decorative elements
        this.createDecorativeElements();
        
        // Add boundary markers (visual only, no collision)
        this.createBoundaryMarkers();
    }
    
    createElevatedPlatforms() {
        // Create elevated platforms for vertical gameplay
        const platformPositions = [
            { x: -15, z: -15, size: 4, height: 2 },
            { x: 15, z: -15, size: 4, height: 2 },
            { x: -15, z: 15, size: 4, height: 2 },
            { x: 15, z: 15, size: 4, height: 2 },
            { x: 0, z: -20, size: 3, height: 1.5 },
            { x: 0, z: 20, size: 3, height: 1.5 },
            { x: -20, z: 0, size: 3, height: 1.5 },
            { x: 20, z: 0, size: 3, height: 1.5 }
        ];
        
        platformPositions.forEach((pos, index) => {
            // Platform top
            const platformGeometry = new THREE.BoxGeometry(pos.size, 0.2, pos.size);
            const platformMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.7,
                metalness: 0.2
            });
            const platform = new THREE.Mesh(platformGeometry, platformMaterial);
            platform.position.set(pos.x, pos.height, pos.z);
            platform.receiveShadow = true;
            platform.castShadow = true;
            platform.userData.isObstacle = true;
            platform.userData.isPlatform = true;
            this.scene.add(platform);
            this.obstacles.push(platform);
            
            // Platform supports (pillars)
            const supportGeometry = new THREE.CylinderGeometry(0.2, 0.2, pos.height, 8);
            const supportMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.8
            });
            
            const supportPositions = [
                { x: -pos.size/2 + 0.3, z: -pos.size/2 + 0.3 },
                { x: pos.size/2 - 0.3, z: -pos.size/2 + 0.3 },
                { x: -pos.size/2 + 0.3, z: pos.size/2 - 0.3 },
                { x: pos.size/2 - 0.3, z: pos.size/2 - 0.3 }
            ];
            
            supportPositions.forEach(supPos => {
                const support = new THREE.Mesh(supportGeometry, supportMaterial);
                support.position.set(pos.x + supPos.x, pos.height / 2, pos.z + supPos.z);
                support.castShadow = true;
                support.receiveShadow = true;
                support.userData.isObstacle = true;
                this.scene.add(support);
                this.obstacles.push(support);
            });
            
            // Add ramps for access (some platforms)
            if (index < 4) {
                const rampGeometry = new THREE.BoxGeometry(2, 0.2, pos.size);
                const ramp = new THREE.Mesh(rampGeometry, platformMaterial);
                const angle = Math.atan2(pos.z, pos.x);
                ramp.position.set(
                    pos.x - Math.cos(angle) * (pos.size/2 + 1),
                    pos.height / 2,
                    pos.z - Math.sin(angle) * (pos.size/2 + 1)
                );
                ramp.rotation.z = -Math.PI / 6;
                ramp.rotation.y = angle;
                ramp.receiveShadow = true;
                ramp.castShadow = true;
                ramp.userData.isObstacle = true;
                ramp.userData.isRamp = true;
                this.scene.add(ramp);
                this.obstacles.push(ramp);
            }
        });
    }
    
    createStrategicStructures() {
        // Create central tower structure
        const towerGroup = new THREE.Group();
        
        // Tower base
        const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 16);
        const towerTexture = createWallTexture();
        const baseMaterial = new THREE.MeshStandardMaterial({
            map: towerTexture,
            color: 0xffffff, // White to show texture properly
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.5;
        base.castShadow = true;
        base.receiveShadow = true;
        base.userData.isObstacle = true;
        towerGroup.add(base);
        
        // Tower middle
        const middleGeometry = new THREE.CylinderGeometry(1.5, 2, 3, 16);
        const middleMaterial = new THREE.MeshStandardMaterial({
            map: towerTexture,
            color: 0xffffff, // White to show texture properly
            roughness: 0.7,
            metalness: 0.3
        });
        const middle = new THREE.Mesh(middleGeometry, middleMaterial);
        middle.position.y = 2.5;
        middle.castShadow = true;
        middle.receiveShadow = true;
        middle.userData.isObstacle = true;
        towerGroup.add(middle);
        
        // Tower top platform
        const topGeometry = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 16);
        const topMaterial = new THREE.MeshStandardMaterial({
            map: towerTexture,
            color: 0xffffff, // White to show texture properly
            roughness: 0.7,
            metalness: 0.3
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 4.15;
        top.receiveShadow = true;
        top.castShadow = true;
        top.userData.isObstacle = true;
        top.userData.isPlatform = true;
        towerGroup.add(top);
        
        towerGroup.position.set(0, 0, 0);
        this.scene.add(towerGroup);
        this.obstacles.push(towerGroup);
        
        // Create corner buildings
        const cornerPositions = [
            { x: -25, z: -25 },
            { x: 25, z: -25 },
            { x: -25, z: 25 },
            { x: 25, z: 25 }
        ];
        
        cornerPositions.forEach(pos => {
            const building = new THREE.Group();
            
            // Building base
            const buildingSize = 3 + Math.random() * 2;
            const buildingHeight = 2 + Math.random() * 2;
            const buildingGeometry = new THREE.BoxGeometry(buildingSize, buildingHeight, buildingSize);
            const buildingMaterial = new THREE.MeshStandardMaterial({
                map: createWallTexture(),
                color: 0x888888,
                roughness: 0.7,
                metalness: 0.1
            });
            const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
            buildingMesh.position.y = buildingHeight / 2;
            buildingMesh.castShadow = true;
            buildingMesh.receiveShadow = true;
            buildingMesh.userData.isObstacle = true;
            building.add(buildingMesh);
            
            // Building roof
            const roofGeometry = new THREE.BoxGeometry(buildingSize + 0.2, 0.3, buildingSize + 0.2);
            const roofMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.9
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = buildingHeight + 0.15;
            roof.receiveShadow = true;
            roof.castShadow = true;
            roof.userData.isObstacle = true;
            roof.userData.isPlatform = true;
            building.add(roof);
            
            building.position.set(pos.x, 0, pos.z);
            building.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(building);
            this.obstacles.push(building);
        });
    }
    
    createBoundaryMarkers() {
        // Add visual boundary markers (no collision)
        const boundarySize = 200;
        const markerCount = 20;
        
        for (let i = 0; i < markerCount; i++) {
            const angle = (i / markerCount) * Math.PI * 2;
            const distance = boundarySize / 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create boundary post
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                emissive: 0xff6600,
                emissiveIntensity: 0.3
            });
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(x, 0.75, z);
            post.userData.isObstacle = false; // No collision
            this.scene.add(post);
        }
    }
    
    createVariedObstacles() {
        // Create different types of obstacles - more walls for cover
        const obstacleTypes = ['wall', 'crate', 'barrel', 'pillar', 'box'];
        
        // Create more obstacles total, with emphasis on walls
        const totalObstacles = 40;
        for (let i = 0; i < totalObstacles; i++) {
            // 50% chance of wall, 50% chance of other obstacles
            let type;
            if (Math.random() < 0.5) {
                type = 'wall';
            } else {
                type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            }
            const obstacle = this.createObstacle(type, i);
            if (obstacle) {
                // Ensure obstacles don't spawn too close to player start (0, 0, 0)
                const distance = Math.sqrt(obstacle.position.x ** 2 + obstacle.position.z ** 2);
                if (distance < 5) {
                    // Move obstacle further away from spawn
                    const angle = Math.atan2(obstacle.position.z, obstacle.position.x);
                    obstacle.position.x = Math.cos(angle) * 5;
                    obstacle.position.z = Math.sin(angle) * 5;
                }
                // Ensure obstacle is marked for collision
                obstacle.userData.isObstacle = true;
                obstacle.visible = true;
                this.scene.add(obstacle);
                this.obstacles.push(obstacle);
            }
        }
    }
    
    createObstacle(type, index) {
        let obstacle;
        
        switch(type) {
            case 'wall':
                // Concrete walls - varied sizes for better cover
                const wallWidth = 1.5 + Math.random() * 2; // 1.5 to 3.5 units wide
                const wallHeight = 2.5 + Math.random() * 1.5; // 2.5 to 4 units tall
                const wallDepth = 0.4 + Math.random() * 0.3; // 0.4 to 0.7 units deep
                const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
                
                // Create wall texture
                const wallTexture = createWallTexture();
                const wallMaterial = new THREE.MeshStandardMaterial({
                    map: wallTexture,
                    color: 0xffffff, // White to show texture properly
                    roughness: 0.7,
                    metalness: 0.1
                });
                obstacle = new THREE.Mesh(wallGeometry, wallMaterial);
                obstacle.position.set(
                    (Math.random() - 0.5) * 40,
                    wallHeight / 2,
                    (Math.random() - 0.5) * 40
                );
                // Random rotation for variety
                obstacle.rotation.y = Math.random() * Math.PI * 2;
                // Mark as wall - cannot land on top
                obstacle.userData.isWall = true;
                break;
                
            case 'crate':
                // Wooden crates
                const crateGeometry = new THREE.BoxGeometry(1, 1, 1);
                const crateMaterial = new THREE.MeshStandardMaterial({
                    color: 0x8b4513,
                    roughness: 0.8
                });
                obstacle = new THREE.Mesh(crateGeometry, crateMaterial);
                obstacle.position.set(
                    (Math.random() - 0.5) * 40,
                    0.5,
                    (Math.random() - 0.5) * 40
                );
                // Add crate straps
                const strap1 = new THREE.Mesh(
                    new THREE.BoxGeometry(1.1, 0.1, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0x654321 })
                );
                strap1.position.y = 0.3;
                obstacle.add(strap1);
                const strap2 = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 1.1, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0x654321 })
                );
                strap2.position.x = 0.3;
                obstacle.add(strap2);
                break;
                
            case 'barrel':
                // Metal barrels
                const barrelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 16);
                const barrelMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.8,
                    roughness: 0.3
                });
                obstacle = new THREE.Mesh(barrelGeometry, barrelMaterial);
                obstacle.position.set(
                    (Math.random() - 0.5) * 40,
                    0.5,
                    (Math.random() - 0.5) * 40
                );
                // Add barrel bands
                for (let i = 0; i < 3; i++) {
                    const band = new THREE.Mesh(
                        new THREE.TorusGeometry(0.4, 0.02, 8, 16),
                        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 })
                    );
                    band.rotation.x = Math.PI / 2;
                    band.position.y = -0.3 + i * 0.3;
                    obstacle.add(band);
                }
                break;
                
            case 'pillar':
                // Stone pillars
                const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 16);
                const pillarMaterial = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    roughness: 0.9
                });
                obstacle = new THREE.Mesh(pillarGeometry, pillarMaterial);
                obstacle.position.set(
                    (Math.random() - 0.5) * 40,
                    1.5,
                    (Math.random() - 0.5) * 40
                );
                // Mark as pillar - cannot land on top
                obstacle.userData.isPillar = true;
                break;
                
            case 'box':
                // Cardboard boxes
                const boxSize = 0.8 + Math.random() * 0.4;
                const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
                const boxMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.1, 0.3, 0.6 + Math.random() * 0.2),
                    roughness: 0.9
                });
                obstacle = new THREE.Mesh(boxGeometry, boxMaterial);
                obstacle.position.set(
                    (Math.random() - 0.5) * 40,
                    boxSize / 2,
                    (Math.random() - 0.5) * 40
                );
                obstacle.rotation.y = Math.random() * Math.PI * 2;
                break;
        }
        
        if (obstacle) {
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            obstacle.userData.isObstacle = true;
            obstacle.updateMatrixWorld(true);
        }
        
        return obstacle;
    }
    
    createDecorativeElements() {
        // Add trees (with collision)
        for (let i = 0; i < 20; i++) {
            const tree = this.createTree();
            let x = (Math.random() - 0.5) * 80;
            let z = (Math.random() - 0.5) * 80;
            // Ensure trees don't spawn too close to player start
            const distance = Math.sqrt(x ** 2 + z ** 2);
            if (distance < 5) {
                const angle = Math.atan2(z, x);
                x = Math.cos(angle) * 5;
                z = Math.sin(angle) * 5;
            }
            tree.position.set(x, 0, z);
            tree.userData.isObstacle = true;
            tree.updateMatrixWorld(true);
            this.scene.add(tree);
            this.obstacles.push(tree); // Add to collision
        }
        
        // Add rocks (with collision)
        for (let i = 0; i < 30; i++) {
            const rock = this.createRock();
            let x = (Math.random() - 0.5) * 80;
            let z = (Math.random() - 0.5) * 80;
            // Ensure rocks don't spawn too close to player start
            const distance = Math.sqrt(x ** 2 + z ** 2);
            if (distance < 5) {
                const angle = Math.atan2(z, x);
                x = Math.cos(angle) * 5;
                z = Math.sin(angle) * 5;
            }
            rock.position.set(x, 0, z);
            rock.userData.isObstacle = true;
            rock.updateMatrixWorld(true);
            this.scene.add(rock);
            this.obstacles.push(rock); // Add to collision
        }
        
        // Add some decorative barrels (non-collision, just for atmosphere)
        for (let i = 0; i < 10; i++) {
            const barrel = this.createDecorativeBarrel();
            barrel.position.set(
                (Math.random() - 0.5) * 60,
                0.4,
                (Math.random() - 0.5) * 60
            );
            barrel.userData.isObstacle = false; // Explicitly mark as non-collision
            this.scene.add(barrel);
            // Don't add to obstacles array
        }
    }
    
    createTree() {
        const tree = new THREE.Group();
        
        // Trunk with bark texture
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const barkTexture = createBarkTexture();
        const trunkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            color: 0xffffff, // White to show texture properly
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1; // Center of trunk at y=1, so it extends from y=0 to y=2
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        // Ensure trunk has collision data - mark as tree trunk for proper collision
        trunk.userData.isObstacle = true;
        trunk.userData.isTree = true;
        trunk.userData.isTreeTrunk = true; // Specific marker for trunk collision
        tree.add(trunk);
        
        // Foliage (multiple spheres for natural look) with leaf texture
        const leafTexture = createLeafTexture();
        const foliageMaterial = new THREE.MeshStandardMaterial({
            map: leafTexture,
            color: 0xffffff, // White to show texture properly
            roughness: 0.8
        });
        
        for (let i = 0; i < 3; i++) {
            const foliageSize = 1 + Math.random() * 0.5;
            const foliageGeometry = new THREE.SphereGeometry(foliageSize, 8, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(
                (Math.random() - 0.5) * 0.5,
                2 + i * 0.8,
                (Math.random() - 0.5) * 0.5
            );
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            tree.add(foliage);
        }
        
        // Mark all parts for collision
        tree.castShadow = true;
        tree.receiveShadow = true;
        
        // Mark as tree - cannot land on top
        tree.userData.isTree = true;
        tree.userData.isObstacle = true;
        
        // Ensure all child meshes (trunk, foliage) are marked for collision
        tree.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.isObstacle = true;
            }
        });
        
        return tree;
    }
    
    createRock() {
        const rock = new THREE.Group();
        const rockSize = 0.3 + Math.random() * 0.4;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, 0.2, 0.4 + Math.random() * 0.2),
            roughness: 0.9
        });
        const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
        rockMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rockMesh.position.y = rockSize;
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        rock.add(rockMesh);
        
        // Mark for collision
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        return rock;
    }
    
    createDecorativeBarrel() {
        const barrel = new THREE.Group();
        const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7
        });
        const barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrelMesh.castShadow = true;
        barrel.add(barrelMesh);
        
        return barrel;
    }
    
    setupPlayerCallbacks() {
        this.player.onHealthChange = (current, max) => {
            this.updateUI();
        };
        
        this.player.onDeath = () => {
            this.showGameOver();
        };
        
        // Store original takeDamage to add visual effects
        const originalTakeDamage = this.player.takeDamage.bind(this.player);
        this.player.takeDamage = (amount) => {
            originalTakeDamage(amount);
            if (this.visualEffectsManager) {
                this.visualEffectsManager.addShake(0.3);
                this.visualEffectsManager.showHitIndicator();
            }
            // Play low health warning sound if health is below 30%
            if (this.player && this.player.health <= this.player.maxHealth * 0.3 && this.soundEffectManager) {
                this.soundEffectManager.playSound('low_health', { volume: 0.7 });
            }
        };
    }
    
    setupWeaponCallbacks() {
        // Set callbacks for all weapons
        this.weaponManager.weapons.forEach(weapon => {
            weapon.onHit = (targetMesh, hitPoint, damage) => {
                this.targetManager.handleHit(targetMesh, hitPoint, damage);
                
                // Send target hit to server (multiplayer)
                if (this.isMultiplayer && this.networkClient.isConnected && targetMesh && targetMesh.userData.target) {
                    const target = targetMesh.userData.target;
                    // Generate or get target ID
                    if (!target.mesh.userData.targetId) {
                        target.mesh.userData.targetId = 'target_' + Date.now() + '_' + Math.random();
                    }
                    this.networkClient.sendTargetHit(
                        target.mesh.userData.targetId,
                        damage,
                        hitPoint
                    );
                }
                
                // Show damage number and hit particles
                if (this.visualEffectsManager && hitPoint) {
                    this.visualEffectsManager.showDamageNumber(hitPoint, damage, '#ffaa00');
                    this.visualEffectsManager.createHitParticles(hitPoint);
                }
                
                this.updateUI();
            };
            
            weapon.onReload = () => {
                this.updateUI();
            };
        });
        
        // Update UI when weapon switches
        this.weaponManager.onWeaponSwitch = (weapon) => {
            this.updateUI();
            // Update attachment menu if open
            if (this.isAttachmentMenuOpen) {
                this.updateAttachmentMenu();
            }
        };
    }
    
    start() {
        // #region agent log
        const endlessAtStart = document.getElementById('endless-mode-checkbox');
        const multiplayerAtStart = document.getElementById('multiplayer-button');
        const startScreenAtStart = document.getElementById('start-screen');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:1855',message:'start() called',data:{endlessExists:!!endlessAtStart,multiplayerExists:!!multiplayerAtStart,startScreenExists:!!startScreenAtStart,endlessVisible:endlessAtStart?.offsetParent !== null,multiplayerVisible:multiplayerAtStart?.offsetParent !== null,startScreenHidden:startScreenAtStart?.classList.contains('hidden'),endlessDisplay:endlessAtStart?.style.display,multiplayerDisplay:multiplayerAtStart?.style.display,endlessParent:endlessAtStart?.parentElement?.id,multiplayerParent:multiplayerAtStart?.parentElement?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
        // #endregion
        
        // Read endless mode setting from checkbox
        const endlessCheckbox = document.getElementById('endless-mode-checkbox');
        this.isEndless = endlessCheckbox ? endlessCheckbox.checked : false;
        
        // Read survival mode setting from checkbox
        const survivalCheckbox = document.getElementById('survival-mode-checkbox');
        this.isSurvivalMode = survivalCheckbox ? survivalCheckbox.checked : false;
        
        // Initialize wave system if survival mode
        if (this.isSurvivalMode) {
            this.currentWave = 1;
            this.waveState = 'waiting';
            this.waveEnemiesRemaining = 0;
            this.waveEnemiesSpawned = 0;
            this.waveEnemiesTotal = 0;
            this.lastSpawnTime = 0;
            this.breakTimeRemaining = 0;
        }
        
        // Recreate targets if they were cleaned up (e.g., after returning to menu)
        if (!this.targetManager || this.targetManager.targets.length === 0) {
            if (this.targetManager) {
                this.targetManager.cleanup();
            }
            // Skip initial spawn in survival mode (waves will handle spawning)
            this.targetManager = new TargetManager(this.scene, this.difficulty, this.camera, this.soundEffectManager, this.isEndless, this.isSurvivalMode);
            // Reset score
            this.targetManager.score = 0;
            
            // In survival mode, start first wave
            if (this.isSurvivalMode) {
                this.startWave(1);
            }
            
            // Set collision objects for targets
            if (this.obstacles) {
                const allObstacles = this.obstacles.filter(obj => 
                    obj && obj.visible !== false && 
                    (!obj.userData || obj.userData.isObstacle !== false)
                );
                this.targetManager.setCollisionObjects(allObstacles);
            }
            
            // Update player collision objects
            this.updatePlayerCollisions();
        }
        
        // Update high score for current difficulty when starting
        this.updateHighScoreForDifficulty();
        
        this.isRunning = true;
        this.clock = new THREE.Clock(); // Reset clock
        this.clock.start();
        this.lastFrameTime = performance.now(); // Initialize frame time tracking
        this.animate();
        
        // Start background music
        if (this.audioManager) {
            this.audioManager.play();
        }
        
        // Request pointer lock after a short delay to ensure canvas is ready
        setTimeout(() => {
            this.player.requestPointerLock();
        }, 100);
        
        // Setup window blur/focus handlers for auto-pause
        this.setupWindowBlurHandlers();
    }
    
    setupWindowBlurHandlers() {
        // Auto-pause when window loses focus
        window.addEventListener('blur', () => {
            if (this.isRunning && !this.isPaused && !this.isGameOver && !this.isAttachmentMenuOpen && !this.isHelpMenuOpen) {
                this.wasPausedByBlur = true;
                this.isPaused = true;
                const pauseOverlay = document.getElementById('pause-overlay');
                if (pauseOverlay) {
                    pauseOverlay.classList.remove('hidden');
                }
                // Pause music
                if (this.audioManager) {
                    this.audioManager.pause();
                }
                // Exit pointer lock when paused
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        });
        
        // Auto-resume when window regains focus (if paused by blur)
        window.addEventListener('focus', () => {
            if (this.isRunning && this.isPaused && this.wasPausedByBlur && !this.isGameOver) {
                this.wasPausedByBlur = false;
                this.isPaused = false;
                const pauseOverlay = document.getElementById('pause-overlay');
                if (pauseOverlay) {
                    pauseOverlay.classList.add('hidden');
                }
                // Resume music
                if (this.audioManager) {
                    this.audioManager.resume();
                }
                // Re-request pointer lock when unpaused
                setTimeout(() => {
                    this.player.requestPointerLock();
                }, 100);
            }
        });
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;
        
        // Frame rate limiting - only update if enough time has passed
        if (elapsed >= this.frameTime) {
            this.lastFrameTime = currentTime - (elapsed % this.frameTime);
            
            // Always render, but only update game logic when not paused and not game over
            if (!this.isPaused && !this.isGameOver) {
            try {
            const deltaTime = this.clock.getDelta();
            const currentTime = this.clock.getElapsedTime() * 1000;
            
            // Validate deltaTime to prevent issues
            if (!deltaTime || isNaN(deltaTime) || deltaTime <= 0 || deltaTime > 1) {
                // Skip this frame if deltaTime is invalid
                this.renderer.render(this.scene, this.camera);
                requestAnimationFrame(() => this.animate());
                return;
            }
            
            // Update visual effects (screen shake, particles)
            if (this.visualEffectsManager) {
                this.visualEffectsManager.update(deltaTime);
                this.visualEffectsManager.applyShakeToCamera();
            }
            
            // Update game systems
            this.player.update(deltaTime);
            this.weaponManager.update(deltaTime, currentTime);
            
            // Network synchronization (multiplayer)
            if (this.isMultiplayer && this.networkClient.isConnected) {
                const now = Date.now();
                if (now - this.lastNetworkUpdate >= this.networkUpdateInterval) {
                    // Send player position and rotation
                    this.networkClient.sendPlayerMove(
                        this.player.position,
                        {
                            x: this.camera.rotation.x,
                            y: this.camera.rotation.y,
                            z: this.camera.rotation.z
                        }
                    );
                    
                    // Send player health
                    this.networkClient.sendPlayerHealth(
                        this.player.health,
                        this.player.maxHealth
                    );
                    
                    this.lastNetworkUpdate = now;
                }
            }
            
            // Wave-based survival mode logic
            if (this.isSurvivalMode) {
                try {
                    this.updateWaveSystem(deltaTime, currentTime);
                } catch (waveError) {
                    console.error('Error in wave system:', waveError);
                    // Continue game loop even if wave system has error
                }
            }
            
            // Update collision objects first (needed for target collision)
            this.updatePlayerCollisions();
            
            // Update target manager with obstacles for target collision detection
            if (this.targetManager) {
                const allObstacles = [...this.obstacles];
                // Filter out decorative objects
                const validObstacles = allObstacles.filter(obj => 
                    obj && obj.visible !== false && 
                    (!obj.userData || obj.userData.isObstacle !== false)
                );
                this.targetManager.setCollisionObjects(validObstacles);
            }
            
            // Update moving targets (they'll check collisions with obstacles and other targets)
            if (this.targetManager) {
                this.targetManager.updateTargets(deltaTime, currentTime, this.player.position);
                
                // Check if all targets are destroyed (win condition) - skip in endless mode and survival mode
                if (!this.isEndless && !this.isSurvivalMode && this.targetManager.areAllTargetsDestroyed()) {
                    this.showVictory();
                }
            }
            
            // Check for projectile hits on player
            this.checkProjectileHits();
            
            // Check for power-up pickups
            this.checkPowerUpPickups();
            
            // Update power-ups
            if (this.powerUpManager) {
                this.powerUpManager.update(deltaTime, currentTime);
            }
            
            // Update mini-map
            if (this.miniMapManager) {
                const enemies = this.targetManager ? this.targetManager.targets.filter(t => !t.isDestroyed).map(t => ({ position: t.position })) : [];
                const powerUps = this.powerUpManager ? this.powerUpManager.getAllPowerUps() : [];
                
                // Add other players to minimap in multiplayer
                const otherPlayerPositions = [];
                if (this.isMultiplayer) {
                    this.otherPlayers.forEach((otherPlayer, playerId) => {
                        if (otherPlayer.mesh) {
                            otherPlayerPositions.push({
                                position: otherPlayer.mesh.position,
                                isPlayer: true
                            });
                        }
                    });
                }
                
                this.miniMapManager.update(this.player.position, enemies, powerUps, otherPlayerPositions);
            }
            
            // Update UI
            this.updateUI();
            
            // Sync score in multiplayer
            if (this.isMultiplayer && this.networkClient.isConnected && this.targetManager) {
                const currentScore = this.targetManager.getScore();
                if (currentScore !== this.lastSyncedScore) {
                    this.networkClient.sendScoreUpdate(currentScore);
                    this.lastSyncedScore = currentScore;
                }
            }
            } catch (error) {
                console.error('Error in game loop:', error);
                // Continue rendering even if there's an error
            }
            } else {
                // When paused, still call getDelta() to prevent time accumulation
                this.clock.getDelta();
            }
            
            // Always render (even when paused)
            this.renderer.render(this.scene, this.camera);
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    updatePlayerCollisions() {
        if (!this.player) return;
        
        // Get all collision objects (targets + obstacles)
        const collisionObjects = [];
        
        // Add obstacles
        if (this.obstacles && Array.isArray(this.obstacles)) {
            for (const obstacle of this.obstacles) {
                if (obstacle && obstacle.visible !== false) {
                    // Skip decorative barrels
                    if (obstacle.userData && obstacle.userData.isObstacle === false) {
                        continue;
                    }
                    collisionObjects.push(obstacle);
                }
            }
        }
        
        // Add targets
        if (this.targetManager) {
            const targets = this.targetManager.getTargets();
            if (targets && Array.isArray(targets)) {
                for (const target of targets) {
                    if (target && target.visible !== false) {
                        // Check if target is destroyed
                        if (target.userData && target.userData.target) {
                            if (!target.userData.target.isDestroyed) {
                                collisionObjects.push(target);
                            }
                        } else {
                            collisionObjects.push(target);
                        }
                    }
                }
            }
        }
        
        // Set collision objects on player
        this.player.setCollisionObjects(collisionObjects);
    }
    
    checkProjectileHits() {
        if (!this.targetManager || !this.player) return;
        
        const projectiles = this.targetManager.getAllProjectiles();
        const playerBox = new THREE.Box3();
        const playerMin = new THREE.Vector3(
            this.player.position.x - this.player.playerRadius,
            this.player.position.y,
            this.player.position.z - this.player.playerRadius
        );
        const playerMax = new THREE.Vector3(
            this.player.position.x + this.player.playerRadius,
            this.player.position.y + this.player.playerHeight,
            this.player.position.z + this.player.playerRadius
        );
        playerBox.setFromPoints([playerMin, playerMax]);
        
        const projectilesToRemove = [];
        
        projectiles.forEach((proj, index) => {
            if (!proj.mesh) return;
            
            const projBox = new THREE.Box3().setFromObject(proj.mesh);
            
            // First check if projectile hits an obstacle (walls, crates, etc.)
            let hitObstacle = false;
            if (this.obstacles && Array.isArray(this.obstacles)) {
                for (const obstacle of this.obstacles) {
                    if (!obstacle || obstacle.visible === false) continue;
                    
                    // Skip decorative objects
                    if (obstacle.userData && obstacle.userData.isObstacle === false) {
                        continue;
                    }
                    
                    try {
                        // Update obstacle's world matrix
                        if (obstacle.updateMatrixWorld) {
                            obstacle.updateMatrixWorld(true);
                        }
                        
                        // Get bounding box of obstacle
                        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                        
                        // Check if projectile hits obstacle
                        if (!obstacleBox.isEmpty() && projBox.intersectsBox(obstacleBox)) {
                            hitObstacle = true;
                            break;
                        }
                    } catch (e) {
                        // Skip obstacles that cause errors
                        continue;
                    }
                }
            }
            
            // If projectile hit an obstacle, remove it (bullet stops)
            if (hitObstacle) {
                projectilesToRemove.push(proj);
            }
            // Otherwise check if it hits the player
            else if (playerBox.intersectsBox(projBox)) {
                // Hit player
                this.player.takeDamage(proj.damage);
                
                // Mark for removal
                projectilesToRemove.push(proj);
            }
        });
        
        // Remove hit projectiles
        projectilesToRemove.forEach(proj => {
            // Find and remove from target's projectile list
            this.targetManager.targets.forEach(target => {
                if (target && target.projectiles) {
                    const idx = target.projectiles.indexOf(proj);
                    if (idx !== -1) {
                        target.projectiles.splice(idx, 1);
                    }
                }
            });
            
            // Remove from scene
            if (proj.mesh && proj.mesh.parent) {
                proj.mesh.parent.remove(proj.mesh);
            }
            if (proj.mesh) {
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
            }
        });
    }
    
    checkPowerUpPickups() {
        if (!this.powerUpManager || !this.player) return;
        
        const pickedUp = this.powerUpManager.checkPickup(this.player.position, this.player.playerRadius);
        if (pickedUp) {
            switch(pickedUp.type) {
                case 'health':
                    this.player.heal(25);
                    break;
                case 'ammo':
                    // Refill all weapons
                    this.weaponManager.weapons.forEach(weapon => {
                        weapon.currentAmmo = weapon.magazineSize;
                    });
                    break;
                case 'damage_boost':
                    // Apply damage boost to all weapons for 10 seconds
                    this.weaponManager.applyDamageBoost(2.0, 10000);
                    break;
            }
        }
    }
    
    updateUI() {
        const ammoInfo = this.weaponManager.getAmmoInfo();
        document.getElementById('ammo').textContent = ammoInfo.current;
        document.getElementById('ammo-max').textContent = ammoInfo.max;
        document.getElementById('score').textContent = this.targetManager.getScore();
        
        // Update high score display (for current difficulty)
        const highScoreEl = document.getElementById('high-score');
        if (highScoreEl) {
            this.updateHighScoreForDifficulty(); // Ensure high score is current for difficulty
            highScoreEl.textContent = this.highScore;
        }
        
        const healthInfo = this.player.getHealth();
        document.getElementById('health').textContent = healthInfo.current;
        
        // Update multiplayer UI if in multiplayer mode
        if (this.isMultiplayer) {
            this.updateMultiplayerHUD();
        }
    }
    
    updateWaveSystem(deltaTime, currentTime) {
        // Safety check: ensure deltaTime is valid
        if (!deltaTime || isNaN(deltaTime) || deltaTime <= 0 || deltaTime > 1) {
            // If deltaTime is invalid or too large, skip this update
            return;
        }
        
        const now = Date.now();
        
        switch(this.waveState) {
            case 'waiting':
                // Start first wave
                this.startWave(1);
                break;
                
            case 'spawning':
                // Spawn enemies gradually
                if (now - this.lastSpawnTime >= this.spawnInterval && this.waveEnemiesSpawned < this.waveEnemiesTotal) {
                    this.spawnWaveEnemyGroup();
                }
                
                // Check if all enemies spawned
                if (this.waveEnemiesSpawned >= this.waveEnemiesTotal) {
                    this.waveState = 'active';
                }
                break;
                
            case 'active':
                // Check if wave is complete
                if (this.checkWaveComplete()) {
                    this.completeWave();
                }
                break;
                
            case 'break':
                // Countdown break timer - clamp deltaTime to prevent large jumps
                const clampedDelta = Math.min(deltaTime, 0.1); // Max 100ms per frame
                this.breakTimeRemaining -= clampedDelta * 1000; // Convert to milliseconds
                
                // Ensure breakTimeRemaining doesn't go too negative
                if (this.breakTimeRemaining < -1000) {
                    this.breakTimeRemaining = 0;
                }
                
                // Skip key check is handled in keydown event listener
                
                if (this.breakTimeRemaining <= 0) {
                    // Start next wave
                    this.startWave(this.currentWave + 1);
                }
                break;
        }
        
        // Update wave UI
        this.updateWaveUI();
    }
    
    updateWaveUI() {
        const waveDisplay = document.getElementById('wave-display');
        const waveEnemiesRemainingEl = document.getElementById('wave-enemies-remaining');
        const waveBreakTimer = document.getElementById('wave-break-timer');
        const waveBreakOverlay = document.getElementById('wave-break-overlay');
        
        if (this.isSurvivalMode) {
            // Show wave UI
            if (waveDisplay) {
                waveDisplay.classList.remove('hidden');
                const waveNumberEl = document.getElementById('wave-number');
                if (waveNumberEl) waveNumberEl.textContent = this.currentWave;
            }
            
            if (waveEnemiesRemainingEl && this.waveState === 'active') {
                waveEnemiesRemainingEl.classList.remove('hidden');
                waveEnemiesRemainingEl.textContent = `Enemies: ${this.waveEnemiesRemaining}`;
            } else if (waveEnemiesRemainingEl) {
                waveEnemiesRemainingEl.classList.add('hidden');
            }
            
            // Show break overlay
            if (this.waveState === 'break') {
                if (waveBreakOverlay) {
                    waveBreakOverlay.classList.remove('hidden');
                    const breakTimerEl = document.getElementById('break-timer');
                    const breakStatsEl = document.getElementById('break-stats');
                    if (breakTimerEl) {
                        // Ensure breakTimeRemaining is valid
                        const validTime = Math.max(0, this.breakTimeRemaining || 0);
                        const seconds = Math.ceil(validTime / 1000);
                        breakTimerEl.textContent = `Next Wave: ${seconds}s (Press Space to skip)`;
                    }
                    if (breakStatsEl) {
                        breakStatsEl.innerHTML = `
                            <p>Wave ${this.currentWave} Complete!</p>
                            <p>Score: ${this.waveScore || 0}</p>
                            <p>Enemies Defeated: ${this.waveEnemiesTotal || 0}</p>
                        `;
                    }
                }
            } else {
                if (waveBreakOverlay) {
                    waveBreakOverlay.classList.add('hidden');
                }
            }
        } else {
            // Hide wave UI in normal mode
            if (waveDisplay) waveDisplay.classList.add('hidden');
            if (waveEnemiesRemainingEl) waveEnemiesRemainingEl.classList.add('hidden');
            if (waveBreakOverlay) waveBreakOverlay.classList.add('hidden');
        }
    }
    
    updateMultiplayerHUD() {
        const multiplayerHUD = document.getElementById('multiplayer-hud');
        const teamScoreContainer = document.getElementById('team-score-container');
        const teamScoreEl = document.getElementById('team-score');
        
        if (this.isMultiplayer) {
            if (multiplayerHUD) multiplayerHUD.classList.remove('hidden');
            if (teamScoreContainer) teamScoreContainer.classList.remove('hidden');
            if (teamScoreEl) teamScoreEl.textContent = this.teamScore;
            
            // Update player list
            const playerList = document.getElementById('player-list-hud-list');
            if (playerList) {
                playerList.innerHTML = '';
                
                // Add current player
                const currentPlayer = this.networkClient.players.find(p => p.id === this.networkClient.playerId);
                if (currentPlayer) {
                    const li = document.createElement('li');
                    const healthPercent = (this.player.health / this.player.maxHealth) * 100;
                    li.innerHTML = `
                        <div>
                            <span class="player-name">${currentPlayer.name} (You)</span>
                            <span class="player-score">${this.targetManager ? this.targetManager.getScore() : 0}</span>
                        </div>
                        <div class="player-health-bar">
                            <div class="player-health-fill" style="width: ${healthPercent}%"></div>
                        </div>
                    `;
                    playerList.appendChild(li);
                }
                
                // Add other players
                this.networkClient.players.forEach(player => {
                    if (player.id !== this.networkClient.playerId) {
                        const otherPlayer = this.otherPlayers.get(player.id);
                        const health = otherPlayer ? otherPlayer.health : 100;
                        const maxHealth = otherPlayer ? otherPlayer.maxHealth : 100;
                        const score = this.multiplayerScores.get(player.id) || 0;
                        const healthPercent = (health / maxHealth) * 100;
                        
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <div>
                                <span class="player-name">${player.name}</span>
                                <span class="player-score">${score}</span>
                            </div>
                            <div class="player-health-bar">
                                <div class="player-health-fill" style="width: ${healthPercent}%"></div>
                            </div>
                        `;
                        playerList.appendChild(li);
                    }
                });
            }
            
            // Update latency (simplified - would need ping/pong for real latency)
            const latencyDisplay = document.getElementById('latency-display');
            if (latencyDisplay) {
                const latency = this.networkClient.getLatency();
                latencyDisplay.textContent = latency > 0 ? `Ping: ${latency}ms` : 'Connected';
            }
        } else {
            if (multiplayerHUD) multiplayerHUD.classList.add('hidden');
            if (teamScoreContainer) teamScoreContainer.classList.add('hidden');
        }
    }
    
    showGameOver() {
        this.isGameOver = true;
        this.isPaused = true; // Also pause the game
        
        // Pause music
        if (this.audioManager) {
            this.audioManager.pause();
        }
        
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Hide all weapons
        if (this.weaponManager) {
            this.weaponManager.hideAllWeapons();
        }
        
        // Clean up all projectiles from targets
        if (this.targetManager) {
            this.targetManager.cleanupProjectiles();
        }
        
        // Update high score
        const finalScore = this.targetManager ? this.targetManager.getScore() : 0;
        const isNewHighScore = this.updateHighScore(finalScore);
        
        // Save to leaderboard only if it's a new high score
        if (isNewHighScore && finalScore > 0) {
            this.saveToLeaderboard(finalScore);
        }
        
        // Show game over screen
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const finalScoreEl = document.getElementById('final-score');
        const finalHighScoreEl = document.getElementById('final-high-score');
        
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('hidden');
            if (finalScoreEl) {
                finalScoreEl.textContent = finalScore;
                // Highlight if new high score
                if (isNewHighScore) {
                    finalScoreEl.style.color = '#ffff00';
                    finalScoreEl.style.fontSize = '36px';
                    finalScoreEl.style.fontWeight = 'bold';
                } else {
                    finalScoreEl.style.color = '';
                    finalScoreEl.style.fontSize = '';
                    finalScoreEl.style.fontWeight = '';
                }
            }
            if (finalHighScoreEl) {
                finalHighScoreEl.textContent = this.highScore;
            }
        }
        
        // Setup restart button
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.onclick = () => {
                this.restart();
            };
        }
        
        // Setup return to menu button
        const returnToMenuButton = document.getElementById('return-to-menu-button');
        if (returnToMenuButton) {
            returnToMenuButton.onclick = () => {
                this.returnToMenu();
            };
        }
        
        // Setup share buttons
        this.setupShareButtons(finalScore, this.difficulty);
    }
    
    setupShareButtons(score, difficulty) {
        const shareButton = document.getElementById('share-score-button');
        const copyButton = document.getElementById('copy-score-button');
        
        if (shareButton) {
            shareButton.onclick = () => {
                this.shareScore(score, difficulty);
            };
        }
        
        if (copyButton) {
            copyButton.onclick = () => {
                this.copyScoreToClipboard(score, difficulty, copyButton);
            };
        }
    }
    
    shareScore(score, difficulty) {
        const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        const text = `I scored ${score} points in Robo Blasters on ${difficultyText} difficulty! Can you beat my score?`;
        const url = window.location.href;
        
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Robo Blasters Score',
                text: text,
                url: url
            }).catch(err => {
                console.log('Error sharing:', err);
                // Fallback to clipboard
                this.copyScoreToClipboard(score, difficulty);
            });
        } else {
            // Fallback to clipboard
            this.copyScoreToClipboard(score, difficulty);
        }
    }
    
    copyScoreToClipboard(score, difficulty, button = null) {
        const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        const text = `I scored ${score} points in Robo Blasters on ${difficultyText} difficulty! Can you beat my score? ${window.location.href}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopyFeedback(button);
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback to old method
                this.fallbackCopyToClipboard(text, button);
            });
        } else {
            // Fallback to old method
            this.fallbackCopyToClipboard(text, button);
        }
    }
    
    fallbackCopyToClipboard(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyFeedback(button);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    showCopyFeedback(button) {
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        }
    }
    
    showVictory() {
        this.isGameOver = true;
        this.isPaused = true; // Also pause the game
        
        // Pause music
        if (this.audioManager) {
            this.audioManager.pause();
        }
        
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Hide all weapons
        if (this.weaponManager) {
            this.weaponManager.hideAllWeapons();
        }
        
        // Clean up all projectiles from targets
        if (this.targetManager) {
            this.targetManager.cleanupProjectiles();
        }
        
        // Update high score
        const finalScore = this.targetManager ? this.targetManager.getScore() : 0;
        const isNewHighScore = this.updateHighScore(finalScore);
        
        // Save to leaderboard only if it's a new high score
        if (isNewHighScore && finalScore > 0) {
            this.saveToLeaderboard(finalScore);
        }
        
        // Show victory screen
        const victoryOverlay = document.getElementById('victory-overlay');
        const victoryScoreEl = document.getElementById('victory-score');
        const victoryHighScoreEl = document.getElementById('victory-high-score');
        
        if (victoryOverlay) {
            victoryOverlay.classList.remove('hidden');
            if (victoryScoreEl) {
                victoryScoreEl.textContent = finalScore;
                // Highlight if new high score
                if (isNewHighScore) {
                    victoryScoreEl.style.color = '#ffff00';
                    victoryScoreEl.style.fontSize = '36px';
                    victoryScoreEl.style.fontWeight = 'bold';
                } else {
                    victoryScoreEl.style.color = '';
                    victoryScoreEl.style.fontSize = '';
                    victoryScoreEl.style.fontWeight = '';
                }
            }
            if (victoryHighScoreEl) {
                victoryHighScoreEl.textContent = this.highScore;
            }
        }
        
        // Setup restart button
        const victoryRestartButton = document.getElementById('victory-restart-button');
        if (victoryRestartButton) {
            victoryRestartButton.onclick = () => {
                this.restart();
            };
        }
        
        // Setup return to menu button
        const victoryReturnToMenuButton = document.getElementById('victory-return-to-menu-button');
        if (victoryReturnToMenuButton) {
            victoryReturnToMenuButton.onclick = () => {
                this.returnToMenu();
            };
        }
        
        // Setup share buttons
        this.setupVictoryShareButtons(finalScore, this.difficulty);
    }
    
    setupVictoryShareButtons(score, difficulty) {
        const shareButton = document.getElementById('victory-share-score-button');
        const copyButton = document.getElementById('victory-copy-score-button');
        
        if (shareButton) {
            shareButton.onclick = () => {
                this.shareScore(score, difficulty);
            };
        }
        
        if (copyButton) {
            copyButton.onclick = () => {
                this.copyScoreToClipboard(score, difficulty, copyButton);
            };
        }
    }
    
    returnToMenu() {
        // Stop the game
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Pause music
        if (this.audioManager) {
            this.audioManager.pause();
        }
        
        // Hide all overlays
        const pauseOverlay = document.getElementById('pause-overlay');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const victoryOverlay = document.getElementById('victory-overlay');
        const helpOverlay = document.getElementById('help-overlay');
        const attachmentMenu = document.getElementById('attachment-menu');
        if (pauseOverlay) {
            pauseOverlay.classList.add('hidden');
        }
        if (gameOverOverlay) {
            gameOverOverlay.classList.add('hidden');
        }
        if (victoryOverlay) {
            victoryOverlay.classList.add('hidden');
        }
        if (helpOverlay) {
            helpOverlay.classList.add('hidden');
        }
        if (attachmentMenu) {
            attachmentMenu.classList.add('hidden');
        }
        
        // Reset menu states
        this.isHelpMenuOpen = false;
        this.isAttachmentMenuOpen = false;
        
        // Show start screen
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
        }
        
        // Clean up game state
        this.cleanupGame();
    }
    
    cleanupGame() {
        // Clean up targets and projectiles
        if (this.targetManager) {
            this.targetManager.cleanup();
        }
        
        // Clean up power-ups
        if (this.powerUpManager) {
            this.powerUpManager.cleanup();
        }
        
        // Hide all weapons
        if (this.weaponManager) {
            this.weaponManager.hideAllWeapons();
        }
        
        // Reset player
        if (this.player) {
            this.player.reset();
        }
    }
    
    restart() {
        // Hide game over screen, victory screen and menus
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const victoryOverlay = document.getElementById('victory-overlay');
        const helpOverlay = document.getElementById('help-overlay');
        const attachmentMenu = document.getElementById('attachment-menu');
        if (gameOverOverlay) {
            gameOverOverlay.classList.add('hidden');
        }
        if (victoryOverlay) {
            victoryOverlay.classList.add('hidden');
        }
        if (helpOverlay) {
            helpOverlay.classList.add('hidden');
        }
        if (attachmentMenu) {
            attachmentMenu.classList.add('hidden');
        }
        
        // Reset menu states
        this.isHelpMenuOpen = false;
        this.isAttachmentMenuOpen = false;
        
        // Reset game state
        this.isGameOver = false;
        this.isPaused = false;
        
        // Reset player
        if (this.player) {
            this.player.reset();
        }
        
        // Reset targets
        if (this.targetManager) {
            this.targetManager.cleanup();
        }
        this.targetManager = new TargetManager(this.scene, this.difficulty, this.camera, this.soundEffectManager, this.isEndless);
        // Reset score (but keep high score)
        this.targetManager.score = 0;
        
        // Set collision objects for targets
        if (this.targetManager && this.obstacles) {
            const allObstacles = this.obstacles.filter(obj => 
                obj && obj.visible !== false && 
                (!obj.userData || obj.userData.isObstacle !== false)
            );
            this.targetManager.setCollisionObjects(allObstacles);
        }
        
        // Reset weapon manager
        if (this.weaponManager) {
            // Recreate weapon manager
            this.weaponManager = new WeaponManager(this.camera, this.scene);
            this.setupWeaponCallbacks();
            // Show current weapon (first weapon is shown by default)
            this.weaponManager.showCurrentWeapon();
        }
        
        // Reset score and UI
        this.updateUI();
        
        // Restart clock
        this.clock = new THREE.Clock();
        this.clock.start();
        
        // Resume music
        if (this.audioManager) {
            this.audioManager.play();
        }
        
        // Re-request pointer lock
        setTimeout(() => {
            if (this.player && this.player.requestPointerLock) {
                this.player.requestPointerLock();
            }
        }, 100);
    }
    
    handleKeyboardNavigation(e) {
        // Handle keyboard navigation for difficulty buttons
        if (document.getElementById('start-screen') && !document.getElementById('start-screen').classList.contains('hidden')) {
            const difficultyButtons = Array.from(document.querySelectorAll('.difficulty-button'));
            const currentIndex = difficultyButtons.findIndex(btn => btn.classList.contains('selected'));
            
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
                if (currentIndex !== -1) {
                    let newIndex = currentIndex;
                    if (e.code === 'ArrowLeft') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : difficultyButtons.length - 1;
                    } else {
                        newIndex = currentIndex < difficultyButtons.length - 1 ? currentIndex + 1 : 0;
                    }
                    
                    difficultyButtons.forEach(btn => {
                        btn.classList.remove('selected');
                        btn.setAttribute('aria-checked', 'false');
                    });
                    
                    difficultyButtons[newIndex].classList.add('selected');
                    difficultyButtons[newIndex].setAttribute('aria-checked', 'true');
                    this.difficulty = difficultyButtons[newIndex].getAttribute('data-difficulty');
                    this.saveDifficulty(this.difficulty);
                    this.updateHighScoreForDifficulty();
                    this.updateLeaderboard();
                    
                    if (this.soundEffectManager) {
                        this.soundEffectManager.playSound('menu_click');
                    }
                }
            }
            
            // Enter or Space to start game
            if ((e.code === 'Enter' || e.code === 'Space') && e.target === document.body) {
                e.preventDefault();
                const startButton = document.getElementById('start-button');
                if (startButton) {
                    startButton.click();
                }
            }
        }
        
        // Handle keyboard navigation for tutorial slides
        if (this.isHelpMenuOpen) {
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                const prevButton = document.getElementById('tutorial-prev');
                if (prevButton && !prevButton.disabled) {
                    prevButton.click();
                }
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                const nextButton = document.getElementById('tutorial-next');
                if (nextButton && !nextButton.disabled) {
                    nextButton.click();
                }
            } else if (e.code === 'Escape') {
                e.preventDefault();
                const closeButton = document.getElementById('help-close-button');
                if (closeButton) {
                    closeButton.click();
                }
            }
        }
        
        // Handle Escape key to close modals
        if (e.code === 'Escape') {
            if (this.isAttachmentMenuOpen) {
                e.preventDefault();
                this.toggleAttachmentMenu();
            } else if (this.isPaused && !this.isGameOver) {
                e.preventDefault();
                this.togglePause();
            }
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('[Service Worker] Registered successfully:', registration.scope);
                
                // Check for updates on page load
                registration.update();
            })
            .catch((error) => {
                console.warn('[Service Worker] Registration failed:', error);
            });
    });
}

// Check elements immediately when script loads (before DOMContentLoaded)
// #region agent log
if (document.readyState === 'loading' || document.readyState === 'interactive') {
    const checkEarly = () => {
        const endlessEarly = document.getElementById('endless-mode-checkbox');
        const multiplayerEarly = document.getElementById('multiplayer-button');
        const startScreenEarly = document.getElementById('start-screen');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2890',message:'Early check - before DOMContentLoaded',data:{readyState:document.readyState,endlessExists:!!endlessEarly,multiplayerExists:!!multiplayerEarly,startScreenExists:!!startScreenEarly,endlessInDOM:document.body.contains(endlessEarly),multiplayerInDOM:document.body.contains(multiplayerEarly)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
    };
    if (document.body) {
        checkEarly();
    } else {
        document.addEventListener('DOMContentLoaded', checkEarly, { once: true });
    }
}
// #endregion

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // #region agent log
    const endlessOnLoad = document.getElementById('endless-mode-checkbox');
    const multiplayerOnLoad = document.getElementById('multiplayer-button');
    const startScreenOnLoad = document.getElementById('start-screen');
    fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2905',message:'DOMContentLoaded - initial state',data:{endlessExists:!!endlessOnLoad,multiplayerExists:!!multiplayerOnLoad,startScreenExists:!!startScreenOnLoad,endlessVisible:endlessOnLoad?.offsetParent !== null,multiplayerVisible:multiplayerOnLoad?.offsetParent !== null,startScreenHidden:startScreenOnLoad?.classList.contains('hidden'),endlessInDOM:document.body.contains(endlessOnLoad),multiplayerInDOM:document.body.contains(multiplayerOnLoad)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D,E'})}).catch(()=>{});
    // #endregion
    
    // Remove any existing error divs from previous loads - be very specific
    // Only remove divs that are error overlays, not any other elements
    const existingErrors = document.querySelectorAll('div[data-error-div="true"]');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2850',message:'Error cleanup before Game init',data:{errorCount:existingErrors.length,errorIds:Array.from(existingErrors).map(el=>el.id||'no-id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    existingErrors.forEach(el => {
        // #region agent log
        const endlessDuringCleanup = document.getElementById('endless-mode-checkbox');
        const multiplayerDuringCleanup = document.getElementById('multiplayer-button');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2854',message:'Processing error element in DOMContentLoaded',data:{elId:el.id||'no-id',willRemove:el.tagName === 'DIV' && el.hasAttribute('data-error-div') && el.getAttribute('data-error-div') === 'true',endlessExists:!!endlessDuringCleanup,multiplayerExists:!!multiplayerDuringCleanup},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Triple check: must be a div, have the attribute, and match the value
        if (el.tagName === 'DIV' && 
            el.hasAttribute('data-error-div') && 
            el.getAttribute('data-error-div') === 'true' &&
            (el.style.position === 'fixed' || el.style.background === 'red' || el.style.background.includes('rgba(0, 0, 0'))) {
            el.remove();
        }
    });
    
    // #region agent log
    const endlessAfterCleanup = document.getElementById('endless-mode-checkbox');
    const multiplayerAfterCleanup = document.getElementById('multiplayer-button');
    fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2865',message:'After error cleanup, before Game init',data:{endlessExists:!!endlessAfterCleanup,multiplayerExists:!!multiplayerAfterCleanup,endlessVisible:endlessAfterCleanup?.offsetParent !== null,multiplayerVisible:multiplayerAfterCleanup?.offsetParent !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    try {
        window.game = new Game();
        console.log('Game initialized successfully');
        
        // #region agent log
        const endlessAfterInit = document.getElementById('endless-mode-checkbox');
        const multiplayerAfterInit = document.getElementById('multiplayer-button');
        const startScreenAfterInit = document.getElementById('start-screen');
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2875',message:'After Game initialization',data:{endlessExists:!!endlessAfterInit,multiplayerExists:!!multiplayerAfterInit,startScreenExists:!!startScreenAfterInit,endlessVisible:endlessAfterInit?.offsetParent !== null,multiplayerVisible:multiplayerAfterInit?.offsetParent !== null,startScreenHidden:startScreenAfterInit?.classList.contains('hidden'),endlessParent:endlessAfterInit?.parentElement?.id,multiplayerParent:multiplayerAfterInit?.parentElement?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D,E'})}).catch(()=>{});
        // #endregion
        
        // Verify critical UI elements still exist after initialization
        const endlessCheckbox = document.getElementById('endless-mode-checkbox');
        const multiplayerButton = document.getElementById('multiplayer-button');
        if (!endlessCheckbox) {
            console.warn('Endless mode checkbox not found after initialization');
        }
        if (!multiplayerButton) {
            console.warn('Multiplayer button not found after initialization');
        }
        
        // #region agent log - Periodic check after a delay to see if elements disappear
        const checkElements = (delay, label) => {
            setTimeout(() => {
                const endlessDelayed = document.getElementById('endless-mode-checkbox');
                const multiplayerDelayed = document.getElementById('multiplayer-button');
                const startScreenDelayed = document.getElementById('start-screen');
                
                let endlessComputed = null;
                let multiplayerComputed = null;
                let startScreenComputed = null;
                
                if (endlessDelayed) {
                    endlessComputed = window.getComputedStyle(endlessDelayed);
                }
                if (multiplayerDelayed) {
                    multiplayerComputed = window.getComputedStyle(multiplayerDelayed);
                }
                if (startScreenDelayed) {
                    startScreenComputed = window.getComputedStyle(startScreenDelayed);
                }
                
                fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:2952',message:`Delayed check ${label} with computed styles`,data:{endlessExists:!!endlessDelayed,multiplayerExists:!!multiplayerDelayed,startScreenExists:!!startScreenDelayed,endlessVisible:endlessDelayed?.offsetParent !== null,multiplayerVisible:multiplayerDelayed?.offsetParent !== null,startScreenHidden:startScreenDelayed?.classList.contains('hidden'),endlessDisplay:endlessDelayed?.style.display,multiplayerDisplay:multiplayerDelayed?.style.display,endlessComputedDisplay:endlessComputed?.display,endlessComputedVisibility:endlessComputed?.visibility,endlessComputedOpacity:endlessComputed?.opacity,multiplayerComputedDisplay:multiplayerComputed?.display,multiplayerComputedVisibility:multiplayerComputed?.visibility,startScreenComputedDisplay:startScreenComputed?.display,endlessParent:endlessDelayed?.parentElement?.id,multiplayerParent:multiplayerDelayed?.parentElement?.id,endlessRect:endlessDelayed ? {width:endlessDelayed.getBoundingClientRect().width,height:endlessDelayed.getBoundingClientRect().height,top:endlessDelayed.getBoundingClientRect().top,left:endlessDelayed.getBoundingClientRect().left} : null,multiplayerRect:multiplayerDelayed ? {width:multiplayerDelayed.getBoundingClientRect().width,height:multiplayerDelayed.getBoundingClientRect().height,top:multiplayerDelayed.getBoundingClientRect().top,left:multiplayerDelayed.getBoundingClientRect().left} : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
            }, delay);
        };
        
        checkElements(2000, '2s after init');
        checkElements(5000, '5s after init');
        checkElements(10000, '10s after init');
        // #endregion
    } catch (error) {
        console.error('Error initializing game:', error);
        console.error('Stack trace:', error.stack);
        const errorDiv = document.createElement('div');
        errorDiv.setAttribute('data-error-div', 'true');
        errorDiv.style.cssText = 'color: white; padding: 20px; font-size: 24px; background: red; position: fixed; top: 0; left: 0; width: 100%; z-index: 10000;';
        errorDiv.textContent = `Error loading game: ${error.message}. Check console for details.`;
        document.body.appendChild(errorDiv);
    }
});

