import * as THREE from 'three';

export class WeaponAttachment {
    constructor(type, weapon) {
        this.type = type; // 'scope', 'silencer', 'extended_mag', 'damage_boost', 'fire_rate_boost'
        this.weapon = weapon;
        this.mesh = null;
        this.stats = this.getStats();
        
        this.createVisual();
    }
    
    getStats() {
        switch(this.type) {
            case 'scope':
                return { range: 1.5, fireRate: 0.9 }; // +50% range, -10% fire rate
            case 'silencer':
                return { damage: 0.85, fireRate: 1.1 }; // -15% damage, +10% fire rate
            case 'extended_mag':
                return { magazineSize: 1.5 }; // +50% magazine size
            case 'damage_boost':
                return { damage: 1.25 }; // +25% damage
            case 'fire_rate_boost':
                return { fireRate: 1.2 }; // +20% fire rate
            default:
                return {};
        }
    }
    
    createVisual() {
        if (!this.weapon || !this.weapon.gunModel) return;
        
        const group = new THREE.Group();
        
        switch(this.type) {
            case 'scope':
                // Scope on top of gun
                const scopeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16);
                const scopeMaterial = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    metalness: 0.9,
                    roughness: 0.1
                });
                this.mesh = new THREE.Mesh(scopeGeometry, scopeMaterial);
                this.mesh.rotation.x = Math.PI / 2;
                this.mesh.position.set(0, 0.1, 0.3);
                break;
                
            case 'silencer':
                // Silencer on barrel
                const silencerGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16);
                const silencerMaterial = new THREE.MeshStandardMaterial({
                    color: 0x222222,
                    metalness: 0.8,
                    roughness: 0.2
                });
                this.mesh = new THREE.Mesh(silencerGeometry, silencerMaterial);
                this.mesh.rotation.x = Math.PI / 2;
                this.mesh.position.set(0, 0, 0.7);
                break;
                
            case 'extended_mag':
                // Extended magazine
                const magGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.2);
                const magMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.7,
                    roughness: 0.3
                });
                this.mesh = new THREE.Mesh(magGeometry, magMaterial);
                this.mesh.position.set(0, -0.45, -0.3);
                break;
                
            default:
                // Small indicator for stat boosts
                const indicatorGeometry = new THREE.SphereGeometry(0.05, 8, 8);
                const indicatorMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffff00,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.5
                });
                this.mesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
                this.mesh.position.set(0.2, 0, 0);
                break;
        }
        
        if (this.mesh && this.weapon.gunModel) {
            this.weapon.gunModel.add(this.mesh);
        }
    }
    
    apply() {
        // Apply stat modifications to weapon (multiply current values)
        if (this.stats.range) {
            this.weapon.range = this.weapon.originalStats.range * this.stats.range;
        }
        if (this.stats.damage) {
            this.weapon.damage = this.weapon.originalStats.damage * this.stats.damage;
        }
        if (this.stats.fireRate) {
            this.weapon.fireRate = this.weapon.originalStats.fireRate * this.stats.fireRate;
        }
        if (this.stats.magazineSize) {
            this.weapon.magazineSize = Math.floor(this.weapon.originalStats.magazineSize * this.stats.magazineSize);
            this.weapon.currentAmmo = Math.min(this.weapon.currentAmmo, this.weapon.magazineSize);
        }
    }
    
    remove() {
        if (this.mesh && this.weapon.gunModel) {
            this.weapon.gunModel.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

