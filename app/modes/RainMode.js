import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Rain mode: particles fall from top, slow and drip when hitting landmarks
 */
export class RainMode extends Mode {
    constructor() {
        super('rain', '🌧️', 'Rain');
        this.gravity = 0.4;
        this.terminalVelocity = 8;
        this.dripSpeed = 0.5;
        this.collisionRadius = 20;
        this.landmarks = [];
        
        // Face mask with ocean blue color
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#00ccff']
        });
    }

    // Rain needs higher max speed to feel fast
    getMaxSpeed() {
        return 10;
    }

    // Shorter trails for crisper rain look
    getTrailAlpha() {
        return 0.05;
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        
        // Check if particle is near any landmark
        let nearLandmark = false;
        let closestDist = Infinity;

        for (const landmark of landmarks) {
            const dx = particle.x - landmark.x;
            const dy = particle.y - landmark.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.collisionRadius) {
                nearLandmark = true;
                closestDist = Math.min(closestDist, dist);
            }
        }

        if (nearLandmark) {
            // Slow down abruptly and drip
            particle.vx *= 0.85;  // Strong horizontal damping
            particle.vy *= 0.7;   // Strong vertical damping

            // Gentle drip downward
            particle.vy += this.dripSpeed * (1 - closestDist / this.collisionRadius);

            // Slight random horizontal drift while dripping
            particle.vx += (Math.random() - 0.5) * 0.1;
        } else {
            // Normal falling with gravity
            particle.vy += this.gravity;

            // Slight horizontal wobble for natural rain effect
            particle.vx += (Math.random() - 0.5) * 0.05;
            particle.vx *= 0.99;  // Gentle horizontal damping

            // Cap at terminal velocity
            if (particle.vy > this.terminalVelocity) {
                particle.vy = this.terminalVelocity;
            }
        }
    }

    getFriction() {
        return 1.0;  // No additional friction (handled internally)
    }

    usesFriction() {
        return false;  // Rain handles its own damping
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask overlay
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
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

    getPresetTheme() {
        return 2; // Ocean
    }
}
