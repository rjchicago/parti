import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Repel mode: particles flow freely but avoid landmarks
 */
export class RepelMode extends Mode {
    constructor() {
        super('repel', '💨', 'Repel');
        this.repelDistance = 120;
        this.repelStrength = 0.15;
        this.landmarks = [];
        
        // Face mask with Fire orange
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#ff6600']
        });
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        const time = performance.now() * 0.001;

        // Continuous flowing movement using sine waves for organic motion
        const waveX = Math.sin(time * 0.5 + particle.phase) * particle.waveAmp;
        const waveY = Math.cos(time * 0.7 + particle.phase * 1.3) * particle.waveAmp;

        // Apply flow direction with wave modulation
        particle.vx += Math.cos(particle.flowAngle + waveX) * particle.flowSpeed * 0.1;
        particle.vy += Math.sin(particle.flowAngle + waveY) * particle.flowSpeed * 0.1;

        // Slowly drift flow angle for variety
        particle.flowAngle += Math.sin(time * 0.2 + particle.phase) * 0.01;

        // Push away from ANY nearby landmark
        for (const landmark of landmarks) {
            const dx = particle.x - landmark.x;
            const dy = particle.y - landmark.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.repelDistance && dist > 1) {
                // Stronger push when closer, fades to zero at repelDistance
                const force = this.repelStrength * (1 - dist / this.repelDistance);
                particle.vx += (dx / dist) * force * 12;
                particle.vy += (dy / dist) * force * 12;
            }
        }
    }

    getFriction() {
        return 0.98;
    }

    getMaxSpeed() {
        return 4;
    }

    getPresetTheme() {
        return 1; // Fire
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask overlay
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }
}
