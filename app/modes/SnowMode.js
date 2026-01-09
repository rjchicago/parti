import { Mode } from './Mode.js';

/**
 * Snow mode: particles fall gently from top, stop and build up on landmarks
 */
export class SnowMode extends Mode {
    constructor() {
        super('snow', '❄️');
        this.gravity = 0.08;
        this.terminalVelocity = 2;
        this.wobbleStrength = 0.15;
        this.collisionRadius = 60;
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Check if particle is near any landmark
        let nearLandmark = false;
        
        for (const landmark of landmarks) {
            const dx = particle.x - landmark.x;
            const dy = particle.y - landmark.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.collisionRadius) {
                nearLandmark = true;
                break;
            }
        }

        if (nearLandmark) {
            // Stop abruptly and stay in place (build up)
            particle.vx *= 0.5;
            particle.vy *= 0.5;
            
            // Tiny random jitter to look like settled snow
            particle.vx += (Math.random() - 0.5) * 0.02;
            particle.vy += (Math.random() - 0.5) * 0.02;
        } else {
            // Gentle falling with gravity
            particle.vy += this.gravity;

            // Gentle horizontal wobble for floaty snow effect
            const time = performance.now() * 0.001;
            particle.vx += Math.sin(time * 2 + particle.phase) * this.wobbleStrength * 0.1;
            particle.vx *= 0.98;  // Horizontal damping

            // Cap at terminal velocity
            if (particle.vy > this.terminalVelocity) {
                particle.vy = this.terminalVelocity;
            }
        }
    }

    getMaxSpeed() {
        return 3;
    }

    getFriction() {
        return 1.0;  // No additional friction
    }

    usesFriction() {
        return false;
    }

    // Shorter trails for crisp snowflakes
    getTrailAlpha() {
        return 0.08;
    }

    handleEdges(particle, canvasSize) {
        // Wrap horizontally
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;

        // Reset to top when reaching bottom
        if (particle.y > canvasSize.height) {
            particle.y = -10;
            particle.x = Math.random() * canvasSize.width;
            particle.vx = 0;
            particle.vy = 0;
        }

        // Wrap if somehow goes too high
        if (particle.y < -50) particle.y = canvasSize.height;
    }
}
