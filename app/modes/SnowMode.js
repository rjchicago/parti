import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Snow mode: particles fall gently from top, stop and build up on landmarks
 */
export class SnowMode extends Mode {
    constructor() {
        super('snow', 'snowflake', 'Snow');
        this.gravity = 0.04;
        this.terminalVelocity = 1;
        this.wobbleStrength = 0.15;
        this.collisionRadius = 20;
        this.landmarks = [];
        
        // Face mask with white/ice color
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#ffffff']
        });
        
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        
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

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask with constant shiver effect
        if (options.maskVisible !== false) {
            // Gentle shiver oscillation
            const shiverOffset = Math.sin(performance.now() * 0.02) * 2;
            
            ctx.save();
            ctx.translate(shiverOffset, 0);
            this.faceMask.draw(ctx, this.landmarks, canvasSize, { isShivering: true });
            ctx.restore();
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
        return 5; // White
    }
}
