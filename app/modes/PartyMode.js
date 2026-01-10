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
        
        // Random blink timing
        this.lastBlinkTime = 0;
        this.blinkDuration = 150; // ms eyes stay closed
        this.nextBlinkTime = 2000; // first blink after 2s
        
        // Hand skeleton connections
        this.handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4],      // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],      // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]            // Palm
        ];
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
        const upperLip = this.landmarks.find(lm => lm.feature === 'upperLip');
        const lowerLip = this.landmarks.find(lm => lm.feature === 'lowerLip');
        const leftMouth = this.landmarks.find(lm => lm.feature === 'leftMouth');
        const rightMouth = this.landmarks.find(lm => lm.feature === 'rightMouth');
        
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
            
            // Random blink timing
            const now = performance.now();
            if (now > this.nextBlinkTime) {
                this.lastBlinkTime = now;
                this.nextBlinkTime = now + 2500 + Math.random() * 3000; // 2.5-5.5s
            }
            const isBlinking = (now - this.lastBlinkTime) < this.blinkDuration;
            
            // Draw eyes
            const eyeRadius = 12;
            
            if (isBlinking) {
                // Closed eyes - horizontal lines
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(leftEye.x - eyeRadius, leftEye.y);
                ctx.lineTo(leftEye.x + eyeRadius, leftEye.y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(rightEye.x - eyeRadius, rightEye.y);
                ctx.lineTo(rightEye.x + eyeRadius, rightEye.y);
                ctx.stroke();
            } else {
                // Open eyes - circles
                ctx.beginPath();
                ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw animated mouth with two curves
            if (upperLip && lowerLip && leftMouth && rightMouth) {
                const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
                const mouthOpen = Math.abs(lowerLip.y - upperLip.y);
                
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                // Upper lip curve (smile curve going up at corners)
                ctx.beginPath();
                ctx.moveTo(leftMouth.x, leftMouth.y);
                ctx.quadraticCurveTo(
                    (leftMouth.x + rightMouth.x) / 2,
                    upperLip.y - mouthOpen * 0.3, // Curve upward for smile
                    rightMouth.x,
                    rightMouth.y
                );
                ctx.stroke();
                
                // Lower lip curve (tracks actual mouth opening)
                ctx.beginPath();
                ctx.moveTo(leftMouth.x, leftMouth.y);
                ctx.quadraticCurveTo(
                    (leftMouth.x + rightMouth.x) / 2,
                    lowerLip.y + mouthOpen * 0.2, // Follows lower lip
                    rightMouth.x,
                    rightMouth.y
                );
                ctx.stroke();
            }
        }
        
        // Draw face outline (oval) - sorted by faceOvalOrder for smooth tracing
        const faceOval = this.landmarks
            .filter(lm => lm.type === 'face' && lm.isEdge && lm.faceOvalOrder >= 0)
            .sort((a, b) => a.faceOvalOrder - b.faceOvalOrder);
        if (faceOval.length > 5) {
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 30;
            ctx.globalAlpha = 0.3;
            
            // Rainbow color cycling
            const colorIndex = Math.floor((time * 2 + 1) % this.rainbowColors.length);
            const color = this.rainbowColors[colorIndex];
            
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            
            ctx.beginPath();
            ctx.moveTo(faceOval[0].x, faceOval[0].y);
            for (let i = 1; i < faceOval.length; i++) {
                ctx.lineTo(faceOval[i].x, faceOval[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // Draw skeleton hands
        const handLandmarks = this.landmarks.filter(lm => lm.type === 'hand');
        if (handLandmarks.length > 0) {
            // Group by handId
            const hands = {};
            for (const lm of handLandmarks) {
                if (!hands[lm.handId]) hands[lm.handId] = {};
                hands[lm.handId][lm.index] = lm;
            }
            
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 30;
            ctx.globalAlpha = 0.35;
            
            // Draw each hand's skeleton
            for (const handId in hands) {
                const hand = hands[handId];
                
                for (const [startIdx, endIdx] of this.handConnections) {
                    const start = hand[startIdx];
                    const end = hand[endIdx];
                    
                    if (start && end) {
                        // Rainbow color based on connection
                        const colorIndex = Math.floor((time * 2 + startIdx * 0.3) % this.rainbowColors.length);
                        const color = this.rainbowColors[colorIndex];
                        
                        ctx.strokeStyle = color;
                        ctx.shadowColor = color;
                        
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();
                    }
                }
                
                // Draw joints as dots
                for (const idx in hand) {
                    const lm = hand[idx];
                    const colorIndex = Math.floor((time * 2 + parseInt(idx) * 0.5) % this.rainbowColors.length);
                    const color = this.rainbowColors[colorIndex];
                    
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    
                    // Larger dots for fingertips and wrist
                    const radius = [0, 4, 8, 12, 16, 20].includes(parseInt(idx)) ? 6 : 4;
                    
                    ctx.beginPath();
                    ctx.arc(lm.x, lm.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
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
