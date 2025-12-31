import * as THREE from 'three';
import { Weapon } from './weapon.js';
import { WeaponAttachment } from './weaponAttachment.js';

// Weapon configurations
const WEAPON_CONFIGS = {
    pistol: {
        name: 'Pistol',
        maxAmmo: 30,
        magazineSize: 15,
        fireRate: 300, // rounds per minute
        damage: 25,
        range: 500,
        reloadTime: 1500,
        color: 0x0066ff // Blue
    },
    rifle: {
        name: 'Rifle',
        maxAmmo: 90,
        magazineSize: 30,
        fireRate: 600,
        damage: 30,
        range: 800,
        reloadTime: 2000,
        color: 0x00ff00 // Green
    },
    shotgun: {
        name: 'Shotgun',
        maxAmmo: 24,
        magazineSize: 8,
        fireRate: 60,
        damage: 50,
        range: 300,
        reloadTime: 3000,
        color: 0xff6600 // Orange
    },
    smg: {
        name: 'SMG',
        maxAmmo: 120,
        magazineSize: 30,
        fireRate: 900,
        damage: 15,
        range: 400,
        reloadTime: 1500,
        color: 0xffff00 // Yellow
    },
    sniper: {
        name: 'Sniper',
        maxAmmo: 20,
        magazineSize: 5,
        fireRate: 30,
        damage: 100,
        range: 2000,
        reloadTime: 2500,
        color: 0xff00ff // Magenta
    }
};

export class WeaponManager {
    constructor(camera, scene, soundEffectManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.soundEffectManager = soundEffectManager;
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.damageBoost = 1.0;
        this.damageBoostEndTime = 0;
        
        // Attachment system
        this.availableAttachments = ['scope', 'silencer', 'extended_mag', 'damage_boost', 'fire_rate_boost'];
        this.equippedAttachments = new Map(); // Map<weapon, Set<attachmentType>>
        
        // Create all weapons
        this.createWeapons();
        
        // Setup hotbar UI
        this.setupHotbar();
    }
    
    createWeapons() {
        const weaponTypes = ['pistol', 'rifle', 'shotgun', 'smg', 'sniper'];
        
        weaponTypes.forEach((type, index) => {
            const config = WEAPON_CONFIGS[type];
            const weapon = new Weapon(this.camera, this.scene, config, this.soundEffectManager);
            weapon.weaponType = type;
            weapon.weaponName = config.name;
            this.weapons.push(weapon);
            
            // Hide all weapons except the first one
            if (weapon.gunModel) {
                weapon.gunModel.visible = (index === 0);
            }
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'weaponManager.js:94',message:'Weapon created',data:{type:type,name:config.name,hasGunModel:!!weapon.gunModel,hasSoundManager:!!weapon.soundEffectManager,hasConfig:!!weapon.config,currentAmmo:weapon.currentAmmo,damage:weapon.damage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
            // #endregion
        });
    }
    
    setupHotbar() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.switchWeapon(index);
            });
        });
        
        // Number key switching
        document.addEventListener('keydown', (e) => {
            const key = e.code;
            if (key >= 'Digit1' && key <= 'Digit5') {
                const index = parseInt(key.replace('Digit', '')) - 1;
                if (index < this.weapons.length) {
                    this.switchWeapon(index);
                }
            }
        });
    }
    
    switchWeapon(index) {
        if (index < 0 || index >= this.weapons.length) return;
        if (index === this.currentWeaponIndex) return;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bda41e12-0745-4148-84b8-3fd6e6c315e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'weaponManager.js:117',message:'Switching weapon',data:{fromIndex:this.currentWeaponIndex,toIndex:index,weaponType:this.weapons[index]?.weaponType,hasGunModel:!!this.weapons[index]?.gunModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Play weapon switch sound
        if (this.soundEffectManager) {
            this.soundEffectManager.playSound('weapon_switch');
        }
        
        // Hide current weapon
        if (this.weapons[this.currentWeaponIndex].gunModel) {
            this.weapons[this.currentWeaponIndex].gunModel.visible = false;
        }
        
        // Show new weapon
        this.currentWeaponIndex = index;
        if (this.weapons[this.currentWeaponIndex].gunModel) {
            this.weapons[this.currentWeaponIndex].gunModel.visible = true;
        }
        
        // Update hotbar UI
        document.querySelectorAll('.hotbar-slot').forEach((slot, i) => {
            if (i === index) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
        
        // Update UI with new weapon info
        if (this.onWeaponSwitch) {
            this.onWeaponSwitch(this.getCurrentWeapon());
        }
    }
    
    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }
    
    update(deltaTime, currentTime) {
        this.getCurrentWeapon().update(deltaTime, currentTime);
    }
    
    shoot(currentTime, targets, obstacles = []) {
        return this.getCurrentWeapon().shoot(currentTime, targets, obstacles);
    }
    
    reload(currentTime) {
        this.getCurrentWeapon().reload(currentTime);
    }
    
    getAmmoInfo() {
        return this.getCurrentWeapon().getAmmoInfo();
    }
    
    hideAllWeapons() {
        this.weapons.forEach(weapon => {
            if (weapon.gunModel) {
                weapon.gunModel.visible = false;
            }
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.visible = false;
            }
        });
    }
    
    showCurrentWeapon() {
        const currentWeapon = this.weapons[this.currentWeaponIndex];
        if (currentWeapon && currentWeapon.gunModel) {
            currentWeapon.gunModel.visible = true;
        }
    }
    
    applyDamageBoost(multiplier, duration) {
        this.damageBoost = multiplier;
        this.damageBoostEndTime = Date.now() + duration;
        
        // Update all weapons with damage boost
        this.weapons.forEach(weapon => {
            weapon.damageBoost = multiplier;
        });
    }
    
    update(deltaTime, currentTime) {
        // Check if damage boost expired
        if (this.damageBoost > 1.0 && Date.now() >= this.damageBoostEndTime) {
            this.damageBoost = 1.0;
            this.weapons.forEach(weapon => {
                weapon.damageBoost = 1.0;
            });
        }
        
        // Update current weapon
        if (this.weapons.length > 0) {
            this.weapons[this.currentWeaponIndex].update(deltaTime, currentTime);
        }
    }
    
    // Attachment management
    getAvailableAttachments() {
        return this.availableAttachments;
    }
    
    getEquippedAttachments(weapon) {
        if (!this.equippedAttachments.has(weapon)) {
            this.equippedAttachments.set(weapon, new Set());
        }
        return Array.from(this.equippedAttachments.get(weapon));
    }
    
    attach(weapon, attachmentType) {
        if (!this.availableAttachments.includes(attachmentType)) {
            return false;
        }
        
        // Check if already attached
        const equipped = this.getEquippedAttachments(weapon);
        if (equipped.includes(attachmentType)) {
            return false; // Already attached
        }
        
        // Attach to weapon
        const success = weapon.attach(attachmentType);
        if (success) {
            if (!this.equippedAttachments.has(weapon)) {
                this.equippedAttachments.set(weapon, new Set());
            }
            this.equippedAttachments.get(weapon).add(attachmentType);
            return true;
        }
        
        return false;
    }
    
    detach(weapon, attachmentType) {
        const equipped = this.getEquippedAttachments(weapon);
        if (!equipped.includes(attachmentType)) {
            return false; // Not attached
        }
        
        // Detach from weapon
        const success = weapon.detach(attachmentType);
        if (success) {
            this.equippedAttachments.get(weapon).delete(attachmentType);
            return true;
        }
        
        return false;
    }
}

