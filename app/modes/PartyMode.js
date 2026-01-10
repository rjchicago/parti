import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

export class PartyMode extends Mode {
    constructor() {
        super('party', '🎉');
        this.gravity = 0.15;
        this.flutter = 0.3;
        this.terminalVelocity = 4;
        
        // Burst management
        this.burstInterval = 800; // ms between bursts
        this.lastBurstTime = 0;
        this.burstQueue = []; // Queue of burst origins
        this.particlesPerBurst = 150;
        this.burstRadius = 50;
        
        // Silhouette settings
        this.silhouetteRadius = 40; // How close to landmark to hide
        this.landmarks = []; // Store for glow rendering
        
        // Steady falling confetti (like snow)
        this.steadyFallRatio = 0.1; // 10% of particles fall steadily
        this.steadyGravity = 0.03;
        this.steadyTerminalVelocity = 1.5;
        this.steadyWobble = 0.1;
        
        // Face mask overlay
        this.faceMask = new FaceMask({ useRainbow: true });
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for glow rendering
        this.landmarks = landmarks;
        
        // Check for silhouette effect - hide particles over face/hands
        particle.inSilhouette = false;
        for (const landmark of landmarks) {
            const dx = particle.x - landmark.x;
            const dy = particle.y - landmark.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.silhouetteRadius) {
                particle.inSilhouette = true;
                break;
            }
        }
        
        // Check if this is a steady falling particle (not part of bursts)
        if (particle.steadyFall) {
            // Gentle snow-like fall
            particle.vy += this.steadyGravity;
            
            // Gentle horizontal wobble
            const time = performance.now() * 0.002;
            particle.vx += Math.sin(time + particle.phase) * this.steadyWobble * 0.1;
            particle.vx *= 0.98;
            
            // Cap at slower terminal velocity
            if (particle.vy > this.steadyTerminalVelocity) {
                particle.vy = this.steadyTerminalVelocity;
            }
        } else {
            // Check if particle is part of an active burst (recently spawned)
            const age = performance.now() - (particle.burstTime || 0);
            
            if (age < 300) {
                // Initial burst expansion - particles shoot outward
                const burstForce = (300 - age) / 300 * 0.5;
                particle.vx += (particle.burstDirX || 0) * burstForce;
                particle.vy += (particle.burstDirY || 0) * burstForce;
            } else {
                // Flutter down like confetti
                particle.vy += this.gravity;
                
                // Horizontal flutter (sine wave based on particle's unique phase)
                const time = performance.now() * 0.003;
                particle.vx += Math.sin(time + particle.phase) * this.flutter * 0.1;
                
                // Add some rotation feel with velocity variation
                particle.vx *= 0.98;
                
                // Cap terminal velocity
                if (particle.vy > this.terminalVelocity) {
                    particle.vy = this.terminalVelocity;
                }
            }
        }
    }

    onBeforeUpdate(particles, canvasSize) {
        const now = performance.now();
        if (now - this.lastBurstTime > this.burstInterval) {
            this.lastBurstTime = now;
            
            // Random position in upper 2/3 of screen
            const x = Math.random() * canvasSize.width;
            const y = Math.random() * canvasSize.height * 0.6;
            
            this.triggerBurst(x, y, particles, canvasSize);
        }
    }

    triggerBurst(x, y, particles, canvasSize) {
        const count = Math.min(this.particlesPerBurst, particles.length);
        let assigned = 0;
        
        for (const particle of particles) {
            if (assigned >= count) break;
            
            // Only grab particles that are off-screen or old
            if (particle.y > canvasSize.height || particle.y < -100) {
                // Position at burst origin with slight randomness
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 20;
                particle.x = x + Math.cos(angle) * dist;
                particle.y = y + Math.sin(angle) * dist;
                
                // Burst direction (outward from center)
                const burstAngle = Math.random() * Math.PI * 2;
                const burstSpeed = 2 + Math.random() * 4;
                particle.burstDirX = Math.cos(burstAngle) * burstSpeed;
                particle.burstDirY = Math.sin(burstAngle) * burstSpeed - 2; // Bias upward
                particle.vx = particle.burstDirX * 2;
                particle.vy = particle.burstDirY * 2;
                
                particle.burstTime = performance.now();
                particle.phase = Math.random() * Math.PI * 2;
                particle.waitingForBurst = false;
                
                assigned++;
            }
        }
        
        return assigned;
    }

    getMaxSpeed() {
        return 8;
    }

    getFriction() {
        return 0.99;
    }

    usesFriction() {
        return true;
    }

    getTrailAlpha() {
        return 0.12;
    }

    getParticleAlpha(particle) {
        // Hide particles that are over detected face/hands
        if (particle.inSilhouette) {
            return 0;
        }
        return particle.alpha;
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Draw face mask overlay using shared utility
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }

    handleEdges(particle, canvasSize) {
        // Wrap horizontally
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;

        // When particle falls off bottom (only check once, not every frame)
        if (particle.y > canvasSize.height + 10 && !particle.waitingForBurst) {
            // Some particles recycle as steady fallers, others wait for bursts
            if (Math.random() < this.steadyFallRatio) {
                // Reset above screen with staggered heights to avoid waves
                particle.y = -10 - Math.random() * 200;
                particle.x = Math.random() * canvasSize.width;
                particle.vx = (Math.random() - 0.5) * 0.5;
                particle.vy = 0.2 + Math.random() * this.steadyTerminalVelocity * 0.5;
                particle.steadyFall = true;
                particle.waitingForBurst = false;
                particle.phase = Math.random() * Math.PI * 2;
            } else {
                // Mark as waiting for burst recycling (don't re-roll each frame)
                particle.steadyFall = false;
                particle.waitingForBurst = true;
            }
        }
    }

    getPresetTheme() {
        return 0; // Rainbow
    }

    initParticle(particle, canvasSize) {
        // Some particles start as steady fallers
        if (Math.random() < this.steadyFallRatio) {
            particle.x = Math.random() * canvasSize.width;
            // Distribute from well above screen to bottom for even coverage
            particle.y = -300 + Math.random() * (canvasSize.height + 400);
            particle.vx = (Math.random() - 0.5) * 0.5;
            // Vary velocities significantly for staggered timing
            particle.vy = 0.1 + Math.random() * this.steadyTerminalVelocity;
            particle.steadyFall = true;
        } else {
            // Others wait off-screen to be grabbed by bursts - stagger these too
            particle.x = Math.random() * canvasSize.width;
            particle.y = canvasSize.height + 20 + Math.random() * 200;
            particle.steadyFall = false;
        }
        particle.phase = Math.random() * Math.PI * 2;
    }
}
