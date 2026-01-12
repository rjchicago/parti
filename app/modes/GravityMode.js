import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Gravity mode: particles orbit around landmarks like planets around a sun
 * Closer = faster orbit, further = slower (Kepler-like physics)
 */
export class GravityMode extends Mode {
    constructor() {
        super('gravity', '⚛️', 'Gravity');
        
        // Orbital parameters
        this.gravityStrength = 400;    // Gravitational pull (lower = slower orbits)
        this.minOrbitRadius = 30;      // Minimum orbit distance
        this.maxOrbitRadius = 600;     // Maximum orbit distance
        this.escapeChance = 0.0002;    // Chance per frame for orbit decay
        this.dampening = 0.95;         // Energy loss for stable orbits (lower = slower)
        
        // Buzz effect when close to landmarks
        this.buzzStrength = 0.8;
        this.buzzThreshold = 120;
        
        this.landmarks = [];
        
        // Face mask with golden/sun color
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#ffd700']
        });
    }

    initParticle(particle, canvasSize) {
        // Random position
        particle.x = Math.random() * canvasSize.width;
        particle.y = Math.random() * canvasSize.height;
        
        // Give initial tangential velocity for orbital motion
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        
        // Orbit properties
        particle.orbitTarget = null;      // Which landmark we're orbiting
        particle.orbitEccentricity = 0.1 + Math.random() * 0.4; // Elliptical factor
        particle.orbitPhase = Math.random() * Math.PI * 2;
        particle.escaping = false;
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        
        if (landmarks.length === 0) {
            // No landmarks - gentle drift
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            return;
        }
        
        // Find nearest landmark to orbit
        let nearestLandmark = null;
        let nearestDist = Infinity;
        
        for (const lm of landmarks) {
            const dx = lm.x - particle.x;
            const dy = lm.y - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestLandmark = lm;
            }
        }
        
        if (!nearestLandmark) return;
        
        const dx = nearestLandmark.x - particle.x;
        const dy = nearestLandmark.y - particle.y;
        const dist = Math.max(nearestDist, this.minOrbitRadius);
        
        // No gravity beyond max orbit - let particles drift freely
        if (dist > this.maxOrbitRadius) {
            // Just drift with slight dampening
            particle.vx *= 0.995;
            particle.vy *= 0.995;
            return;
        }
        
        // Gravitational acceleration (F = G/r², simplified)
        const gravity = this.gravityStrength / (dist * dist);
        
        // Add gravitational pull toward landmark
        particle.vx += (dx / dist) * gravity;
        particle.vy += (dy / dist) * gravity;
        
        // Add tangential velocity for orbital motion
        // Perpendicular to the radial direction
        const tangentX = -dy / dist;
        const tangentY = dx / dist;
        
        // Orbital speed decreases with distance (Kepler's 3rd law approximation)
        const orbitalSpeed = Math.sqrt(this.gravityStrength / dist) * 0.15;
        
        // Apply tangential force (keeps particles in orbit instead of falling in)
        particle.vx += tangentX * orbitalSpeed * 0.1;
        particle.vy += tangentY * orbitalSpeed * 0.1;
        
        // Eccentricity - add slight wobble for elliptical orbits
        const time = performance.now() * 0.001;
        const wobble = Math.sin(time * 2 + particle.orbitPhase) * particle.orbitEccentricity;
        particle.vx += tangentX * wobble * 0.3;
        particle.vy += tangentY * wobble * 0.3;
        
        // Occasional slight nudge for variety
        if (Math.random() < this.escapeChance) {
            particle.vx += (Math.random() - 0.5) * 0.3;
            particle.vy += (Math.random() - 0.5) * 0.3;
        }
        
        // Buzz effect when close to landmarks - particles vibrate instead of settling
        if (dist < this.buzzThreshold) {
            const buzzIntensity = (1 - dist / this.buzzThreshold) * this.buzzStrength;
            particle.vx += (Math.random() - 0.5) * buzzIntensity;
            particle.vy += (Math.random() - 0.5) * buzzIntensity;
        }
        
        // Dampening for stable orbits
        particle.vx *= this.dampening;
        particle.vy *= this.dampening;
    }

    getFriction() {
        return 1.0; // No external friction - handled internally
    }

    usesFriction() {
        return false;
    }

    getMaxSpeed() {
        return 12;
    }

    getTrailAlpha() {
        return 0.12; // Medium trails for orbital streaks
    }

    handleEdges(particle, canvasSize) {
        // Bounce off edges
        if (particle.x < 0) {
            particle.x = 0;
            particle.vx *= -0.8; // Reverse with slight energy loss
        } else if (particle.x > canvasSize.width) {
            particle.x = canvasSize.width;
            particle.vx *= -0.8;
        }
        
        if (particle.y < 0) {
            particle.y = 0;
            particle.vy *= -0.8;
        } else if (particle.y > canvasSize.height) {
            particle.y = canvasSize.height;
            particle.vy *= -0.8;
        }
    }

    getPresetTheme() {
        return 3; // Galaxy theme
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask overlay
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }
}
