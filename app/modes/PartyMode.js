import { Mode } from './Mode.js';

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
        
        // Rainbow colors for edge glow
        this.rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
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

    onAfterRender(ctx, canvasSize) {
        if (!this.landmarks || this.landmarks.length === 0) return;
        
        const time = performance.now() * 0.001;
        
        // Find face features for happy face mask
        const leftEye = this.landmarks.find(lm => lm.feature === 'leftEye');
        const rightEye = this.landmarks.find(lm => lm.feature === 'rightEye');
        const lipLandmarks = this.landmarks.filter(lm => lm.feature === 'lips');
        
        ctx.globalAlpha = 0.4;
        
        // Draw happy face if we have face detected
        if (leftEye && rightEye) {
            // Rainbow color cycling
            const colorIndex = Math.floor((time * 2) % this.rainbowColors.length);
            const color = this.rainbowColors[colorIndex];
            
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
            
            // Draw eye dots
            const eyeRadius = 12;
            
            // Left eye
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Right eye
            ctx.beginPath();
            ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw smile curve
            if (lipLandmarks.length > 0) {
                // Find mouth corners and bottom center for smile
                const mouthCenterX = (leftEye.x + rightEye.x) / 2;
                const mouthY = lipLandmarks.reduce((sum, lm) => sum + lm.y, 0) / lipLandmarks.length;
                const eyeDistance = Math.abs(rightEye.x - leftEye.x);
                const smileWidth = eyeDistance * 0.8;
                
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.arc(mouthCenterX, mouthY - 15, smileWidth / 2, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.stroke();
            }
        }
        
        // Draw hand outlines (keep the glow for hands)
        const handEdge = this.landmarks.filter(lm => lm.type === 'hand' && lm.isEdge);
        if (handEdge.length > 2) {
            const colorIndex = Math.floor((time * 2 + 3) % this.rainbowColors.length);
            const color = this.rainbowColors[colorIndex];
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
            ctx.globalAlpha = 0.25;
            
            ctx.beginPath();
            ctx.moveTo(handEdge[0].x, handEdge[0].y);
            for (let i = 1; i < handEdge.length; i++) {
                ctx.lineTo(handEdge[i].x, handEdge[i].y);
            }
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    handleEdges(particle, canvasSize) {
        // Wrap horizontally
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;

        // Let particles fall off bottom, they'll be recycled in bursts
        // No action needed - triggerBurst will recycle them
        
        // Safety reset if too far off screen
        if (particle.y > canvasSize.height + 100) {
            particle.y = canvasSize.height + 50; // Mark as ready for burst
        }
    }

    getPresetTheme() {
        return 0; // Rainbow
    }
}
