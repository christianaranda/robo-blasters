export class SoundEffectManager {
    constructor() {
        this.volume = 0.5; // Default volume (0.0 to 1.0)
        this.audioPool = new Map(); // Pool of audio elements for each sound type
        this.maxPoolSize = 10; // Maximum audio elements per sound type
        
        // Create a single AudioContext that will be reused
        this.audioContext = null;
        this.initAudioContext();
        
        // Sound file paths (will use procedural generation or placeholder paths)
        this.soundPaths = {
            gunshot_pistol: null,
            gunshot_rifle: null,
            gunshot_shotgun: null,
            gunshot_smg: null,
            gunshot_sniper: null,
            hit: null,
            explosion: null,
            footstep: null,
            reload: null,
            jump: null,
            pickup: null,
            projectile_fire: null,
            empty_click: null,
            weapon_switch: null,
            low_health: null,
            powerup_spawn: null,
            menu_click: null,
            menu_hover: null,
            target_spawn: null,
            ricochet: null,
            headshot: null
        };
        
        // Initialize audio pools
        this.initializeAudioPools();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Resume audio context if it's suspended (required for autoplay policies)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (e) {
            console.warn('Failed to create AudioContext:', e);
        }
    }
    
    getAudioContext() {
        if (!this.audioContext) {
            this.initAudioContext();
        }
        // Resume if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }
    
    initializeAudioPools() {
        // Create audio pools for each sound type
        for (const soundType in this.soundPaths) {
            this.audioPool.set(soundType, []);
        }
    }
    
    // Generate procedural sound using Web Audio API
    generateGunshotSound(weaponType) {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        let duration = 0.1;
        let volume = 0.3;
        
        // Different characteristics for different weapons
        switch(weaponType) {
            case 'gunshot_pistol':
                duration = 0.08;
                volume = 0.25;
                break;
            case 'gunshot_rifle':
                duration = 0.12;
                volume = 0.35;
                break;
            case 'gunshot_shotgun':
                duration = 0.15;
                volume = 0.4;
                break;
            case 'gunshot_smg':
                duration = 0.06;
                volume = 0.2;
                break;
            case 'gunshot_sniper':
                duration = 0.2;
                volume = 0.45;
                break;
        }
        
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate gunshot-like sound (white noise with envelope)
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 20); // Exponential decay
            data[i] = (Math.random() * 2 - 1) * envelope * volume;
        }
        
        return buffer;
    }
    
    generateHitSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.05;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Sharp hit sound
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 30);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.2;
        }
        
        return buffer;
    }
    
    generateHeadshotSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.08;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Higher pitched, sharper hit sound
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 25);
            const freq = 1200 + Math.random() * 400;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
        }
        
        return buffer;
    }
    
    generateRicochetSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.15;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Metallic ping with decay
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8);
            const freq = 2000 - t * 1000; // Descending pitch
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
        }
        
        return buffer;
    }
    
    generateFootstepSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.1;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Thud-like footstep
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 15);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.15;
        }
        
        return buffer;
    }
    
    generateReloadSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.3;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Metallic click/clack sound with multiple clicks
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 5);
            // Add multiple click sounds
            const click1 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-(t - 0.05) * 50) * 0.1;
            const click2 = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-(t - 0.15) * 50) * 0.1;
            const click3 = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-(t - 0.25) * 50) * 0.1;
            data[i] = (click1 + click2 + click3) * envelope;
        }
        
        return buffer;
    }
    
    generateEmptyClickSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.1;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Metallic click when trying to shoot with no ammo
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 20);
            const freq = 500 + Math.random() * 200;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
        }
        
        return buffer;
    }
    
    generateWeaponSwitchSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.15;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Quick metallic swish
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 12);
            const freq = 300 + t * 200;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }
        
        return buffer;
    }
    
    generateJumpSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.15;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Quick whoosh/thud
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.2;
        }
        
        return buffer;
    }
    
    generatePickupSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.2;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Pleasant chime
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const freq = 800 + t * 200; // Rising tone
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8) * 0.3;
        }
        
        return buffer;
    }
    
    generatePowerUpSpawnSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.3;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Magical sparkle sound
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 5);
            const freq1 = 1000 + Math.sin(t * 10) * 200;
            const freq2 = 1500 + Math.sin(t * 15) * 300;
            data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * envelope * 0.2;
        }
        
        return buffer;
    }
    
    generateTargetSpawnSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.2;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Mechanical whirr
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10);
            const freq = 400 - t * 100; // Descending tone
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
        }
        
        return buffer;
    }
    
    generateExplosionSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.5;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Explosion (white noise with low frequency rumble)
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 3);
            const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.3;
            data[i] = ((Math.random() * 2 - 1) + rumble) * envelope * 0.4;
        }
        
        return buffer;
    }
    
    generateProjectileFireSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.08;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Quick zap-like sound
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 25);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.25;
        }
        
        return buffer;
    }
    
    generateLowHealthSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.5;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Warning beep
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const freq = 400 + Math.sin(t * 10) * 100; // Pulsing tone
            const envelope = Math.exp(-t * 2);
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
        }
        
        return buffer;
    }
    
    generateMenuClickSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.1;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Soft click
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 30);
            const freq = 600 + Math.random() * 200;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
        }
        
        return buffer;
    }
    
    generateMenuHoverSound() {
        const audioContext = this.getAudioContext();
        if (!audioContext) return null;
        
        const duration = 0.05;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Very subtle tick
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 40);
            const freq = 800;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.1;
        }
        
        return buffer;
    }
    
    // Play sound using Web Audio API
    playSoundFromBuffer(buffer, volume = 1.0) {
        if (!buffer) return null;
        
        try {
            const audioContext = this.getAudioContext();
            if (!audioContext) return null;
            
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            
            source.buffer = buffer;
            gainNode.gain.value = volume * this.volume;
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            source.start(0);
            
            return source;
        } catch (e) {
            console.warn('Sound playback failed:', e);
            return null;
        }
    }
    
    // Main play sound method
    playSound(soundType, options = {}) {
        const volume = options.volume || 1.0;
        let buffer = null;
        
        // Generate appropriate sound based on type
        switch(soundType) {
            case 'gunshot_pistol':
            case 'gunshot_rifle':
            case 'gunshot_shotgun':
            case 'gunshot_smg':
            case 'gunshot_sniper':
                buffer = this.generateGunshotSound(soundType);
                break;
            case 'hit':
                buffer = this.generateHitSound();
                break;
            case 'headshot':
                buffer = this.generateHeadshotSound();
                break;
            case 'ricochet':
                buffer = this.generateRicochetSound();
                break;
            case 'explosion':
                buffer = this.generateExplosionSound();
                break;
            case 'footstep':
                buffer = this.generateFootstepSound();
                break;
            case 'reload':
                buffer = this.generateReloadSound();
                break;
            case 'empty_click':
                buffer = this.generateEmptyClickSound();
                break;
            case 'weapon_switch':
                buffer = this.generateWeaponSwitchSound();
                break;
            case 'jump':
                buffer = this.generateJumpSound();
                break;
            case 'pickup':
                buffer = this.generatePickupSound();
                break;
            case 'powerup_spawn':
                buffer = this.generatePowerUpSpawnSound();
                break;
            case 'target_spawn':
                buffer = this.generateTargetSpawnSound();
                break;
            case 'projectile_fire':
                buffer = this.generateProjectileFireSound();
                break;
            case 'low_health':
                buffer = this.generateLowHealthSound();
                break;
            case 'menu_click':
                buffer = this.generateMenuClickSound();
                break;
            case 'menu_hover':
                buffer = this.generateMenuHoverSound();
                break;
            default:
                console.warn('Unknown sound type:', soundType);
                return;
        }
        
        if (buffer) {
            this.playSoundFromBuffer(buffer, volume);
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    getVolume() {
        return this.volume;
    }
}

