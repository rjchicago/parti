import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Attract mode: particles flow toward hand and face landmarks
 */
export class AttractMode extends Mode {
    constructor() {
        super('attract', '🧲');
        this.attraction = 0.08;
        this.returnSpeed = 0.02;
        this.landmarks = [];
        
        // Face mask with Matrix green
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#00ff00']
        });
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        if (particle.targetX !== null) {
            // Pull toward assigned landmark target
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const force = this.attraction * Math.min(dist * 0.1, 10);
                particle.vx += (dx / dist) * force;
                particle.vy += (dy / dist) * force;
            }
        } else {
            // No landmarks - drift back to base position
            particle.vx += (particle.baseX - particle.x) * this.returnSpeed;
            particle.vy += (particle.baseY - particle.y) * this.returnSpeed;
        }
    }

    getFriction() {
        return 0.95;
    }

    getMaxSpeed() {
        return 8;
    }

    getPresetTheme() {
        return 4; // Matrix
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask overlay
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }
}
