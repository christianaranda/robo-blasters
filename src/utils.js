import * as THREE from 'three';

/**
 * Create a raycaster from camera position and direction
 * @param {THREE.Camera} camera - The camera to cast from
 * @param {THREE.Vector3} direction - The direction vector
 * @param {number} near - Near clipping plane
 * @param {number} far - Far clipping plane
 * @returns {THREE.Raycaster} The configured raycaster
 */
export function createRaycaster(camera, direction, near = 0.1, far = 1000) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.near = near;
    raycaster.far = far;
    return raycaster;
}

/**
 * Check if a point is within bounds
 * @param {THREE.Vector3} point - Point to check
 * @param {THREE.Box3} bounds - Bounding box
 * @returns {boolean} True if point is within bounds
 */
export function isPointInBounds(point, bounds) {
    return bounds.containsPoint(point);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Get distance between two 3D points
 * @param {THREE.Vector3} a - First point
 * @param {THREE.Vector3} b - Second point
 * @returns {number} Distance
 */
export function distance(a, b) {
    return a.distanceTo(b);
}

