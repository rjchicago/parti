import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Sketch mode: white background, hand-drawn look, gravity physics
 */
export class SketchMode extends Mode {
    constructor() {
        super('sketch', '✏️');
        
        // Gentle downward gravity
        this.gravity = 0.02;
        this.friction = 0.99;
        
        // Track previous landmark positions for movement detection
        this.prevLandmarks = new Map();
        this.movementThreshold = 3; // Minimum movement to emit
        
        // Pool of waiting particles (at bottom, ready to emit)
        this.waitingParticles = [];
        
        this.landmarks = [];
        
        // Index finger tracer lines
        this.fingerTrails = new Map(); // handId -> array of {x, y, time}
        this.trailFadeDuration = 10000; // 10 seconds fade
        this.lastIndexPos = new Map(); // Track last index finger position per hand
        this.maxGapTime = 100; // Max ms to bridge gaps (1-2 frames at 60fps)
        
        // Face mask with dark gray
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#333333']
        });
    }

    initParticle(particle, canvasSize) {
        // Start particles at bottom, waiting to be emitted
        particle.x = Math.random() * canvasSize.width;
        particle.y = canvasSize.height + 10;
        particle.vx = 0;
        particle.vy = 0;
        particle.waiting = true; // Waiting to be emitted
    }

    onBeforeUpdate(particles, landmarks, canvasSize) {
        const now = performance.now();
        
        // Group hand landmarks by handId
        const handGroups = {};
        for (const lm of landmarks.filter(l => l.type === 'hand')) {
            const hId = lm.handId !== undefined ? lm.handId : 0;
            if (!handGroups[hId]) handGroups[hId] = {};
            handGroups[hId][lm.index] = lm;
        }
        
        // Track index fingertips ONLY when pointing (index extended, others closed)
        for (const hId in handGroups) {
            const hand = handGroups[hId];
            const handId = parseInt(hId);
            
            // Check if only index finger is extended (pointing gesture)
            // Index finger: tip (8) above knuckle (6)
            // Other fingers: tips (12, 16, 20) below or at knuckles (10, 14, 18)
            // Thumb can be either way
            const indexTip = hand[8];
            const indexKnuckle = hand[6];
            const isIndexUp = indexTip && indexKnuckle && indexTip.y < indexKnuckle.y;
            
            const middleTip = hand[12], middleKnuckle = hand[10];
            const ringTip = hand[16], ringKnuckle = hand[14];
            const pinkyTip = hand[20], pinkyKnuckle = hand[18];
            
            const isMiddleDown = !middleTip || !middleKnuckle || middleTip.y >= middleKnuckle.y;
            const isRingDown = !ringTip || !ringKnuckle || ringTip.y >= ringKnuckle.y;
            const isPinkyDown = !pinkyTip || !pinkyKnuckle || pinkyTip.y >= pinkyKnuckle.y;
            
            const isPointing = isIndexUp && isMiddleDown && isRingDown && isPinkyDown;
            
            if (isPointing && indexTip) {
                if (!this.fingerTrails.has(handId)) {
                    this.fingerTrails.set(handId, []);
                }
                const trail = this.fingerTrails.get(handId);
                
                // Check if we need to bridge a gap (1-2 missed frames)
                const lastPos = this.lastIndexPos.get(handId);
                if (lastPos && trail.length > 0) {
                    const timeSinceLast = now - lastPos.time;
                    if (timeSinceLast > 20 && timeSinceLast <= this.maxGapTime) {
                        // Bridge the gap with interpolated points
                        const steps = Math.ceil(timeSinceLast / 16); // ~60fps
                        for (let i = 1; i < steps; i++) {
                            const t = i / steps;
                            const interpX = lastPos.x + (indexTip.x - lastPos.x) * t;
                            const interpY = lastPos.y + (indexTip.y - lastPos.y) * t;
                            const interpTime = lastPos.time + timeSinceLast * t;
                            trail.push({ x: interpX, y: interpY, time: interpTime, speed: lastPos.speed });
                        }
                    }
                }
                
                // Calculate speed from previous point
                let speed = 0;
                if (trail.length > 0) {
                    const prev = trail[trail.length - 1];
                    const dx = indexTip.x - prev.x;
                    const dy = indexTip.y - prev.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const dt = now - prev.time;
                    speed = dt > 0 ? dist / dt : 0;
                }
                
                trail.push({ x: indexTip.x, y: indexTip.y, time: now, speed: speed });
                
                // Update last known position
                this.lastIndexPos.set(handId, { x: indexTip.x, y: indexTip.y, time: now, speed: speed });
                
                // Remove old points
                while (trail.length > 0 && now - trail[0].time > this.trailFadeDuration) {
                    trail.shift();
                }
            } else if (indexTip) {
                // Even when not pointing, track position to bridge gaps when resuming
                this.lastIndexPos.set(handId, { x: indexTip.x, y: indexTip.y, time: now, speed: 0 });
            }
        }
        
        // Clean up trails for hands that are no longer detected
        for (const [handId, trail] of this.fingerTrails) {
            while (trail.length > 0 && now - trail[0].time > this.trailFadeDuration) {
                trail.shift();
            }
        }
        
        // Detect fist (eraser) - all fingers closed
        // Fist erases tracer lines it passes over
        for (const hId in handGroups) {
            const hand = handGroups[hId];
            // Check if hand is a fist (all fingertips below or at their knuckles)
            const fingertips = [8, 12, 16, 20]; // Exclude thumb (4)
            const knuckles = [6, 10, 14, 18];
            let isFist = true;
            
            for (let i = 0; i < fingertips.length; i++) {
                const tip = hand[fingertips[i]];
                const knuckle = hand[knuckles[i]];
                if (!tip || !knuckle || tip.y < knuckle.y) {
                    isFist = false;
                    break;
                }
            }
            
            // If hand is a fist, erase trails near palm area
            if (isFist) {
                const palm = hand[0]; // Wrist/palm center
                if (palm) {
                    const eraseRadius = 80;
                    
                    // Erase from all trails
                    for (const [trailHandId, trail] of this.fingerTrails) {
                        for (let i = trail.length - 1; i >= 0; i--) {
                            const point = trail[i];
                            const dx = point.x - palm.x;
                            const dy = point.y - palm.y;
                            if (Math.sqrt(dx * dx + dy * dy) < eraseRadius) {
                                trail.splice(i, 1);
                            }
                        }
                    }
                }
            }
        }
        
        // Limit active particles to 10% of total
        const maxActive = Math.floor(particles.length * 0.1);
        const activeCount = particles.filter(p => !p.waiting).length;
        
        // Emit rate for hands only
        const handEmitChance = 0.01;  // 1% per hand landmark
        
        // Detect movement and emit particles from hands only
        const handLandmarks = landmarks.filter(lm => lm.type === 'hand');
        for (const lm of handLandmarks) {
            const key = `hand-${lm.handId}-${lm.index || 0}`;
            const prev = this.prevLandmarks.get(key);
            const emitChance = handEmitChance;
            
            if (prev) {
                const dx = lm.x - prev.x;
                const dy = lm.y - prev.y;
                const movement = Math.sqrt(dx * dx + dy * dy);
                
                // If there's movement, room for more, AND random chance passes
                if (movement > this.movementThreshold && activeCount < maxActive && Math.random() < emitChance) {
                    // Find a waiting particle
                    const waiting = particles.find(p => p.waiting);
                    if (waiting) {
                        // Emit from landmark position with slight randomness
                        waiting.x = lm.x + (Math.random() - 0.5) * 10;
                        waiting.y = lm.y + (Math.random() - 0.5) * 10;
                        waiting.vx = (Math.random() - 0.5) * 2;
                        waiting.vy = (Math.random() - 0.5) * 2;
                        waiting.waiting = false;
                    }
                }
            }
            
            // Store current position for next frame
            this.prevLandmarks.set(key, { x: lm.x, y: lm.y });
        }
    }

    updateParticle(particle, landmarks, canvasSize) {
        this.landmarks = landmarks;
        
        // Skip waiting particles
        if (particle.waiting) return;
        
        // Apply gentle downward gravity
        particle.vy += this.gravity;
        
        // Apply friction
        particle.vx *= this.friction;
        particle.vy *= this.friction;
    }

    getFriction() {
        return 1.0;
    }

    usesFriction() {
        return false;
    }

    getMaxSpeed() {
        return 5;
    }

    getTrailAlpha() {
        return 0.3; // Higher alpha for white background
    }
    
    // White background
    getBackgroundColor() {
        return '#ffffff';
    }

    handleEdges(particle, canvasSize) {
        // Skip waiting particles
        if (particle.waiting) return;
        
        // Wrap sides
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;
        
        // Bounce off top
        if (particle.y < 0) {
            particle.y = 0;
            particle.vy *= -0.5;
        }
        
        // Disappear at bottom - become waiting again
        if (particle.y > canvasSize.height + 5) {
            particle.waiting = true;
            particle.vx = 0;
            particle.vy = 0;
        }
    }

    getPresetTheme() {
        return 6; // Mercury (dark gray)
    }
    
    // Hide waiting particles
    getParticleAlpha(particle) {
        return particle.waiting ? 0 : 1;
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        const now = performance.now();
        
        // Draw finger tracer lines BEFORE face mask
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        for (const [handId, trail] of this.fingerTrails) {
            if (trail.length < 2) continue;
            
            // Draw segments with varying line width based on speed
            for (let i = 1; i < trail.length; i++) {
                const prev = trail[i - 1];
                const point = trail[i];
                
                // Skip if too far from previous point (hand was lifted)
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                if (Math.sqrt(dx * dx + dy * dy) > 50) continue;
                
                // Calculate alpha based on age
                const age = now - point.time;
                const alpha = Math.max(0.1, 1 - age / this.trailFadeDuration);
                
                // Average speed over nearby points for smoother transitions
                let avgSpeed = 0;
                const smoothWindow = 5;
                const startIdx = Math.max(0, i - smoothWindow);
                const endIdx = Math.min(trail.length - 1, i + smoothWindow);
                let count = 0;
                for (let j = startIdx; j <= endIdx; j++) {
                    avgSpeed += trail[j].speed || 0;
                    count++;
                }
                avgSpeed = count > 0 ? avgSpeed / count : 0;
                
                // Line width: thick (6) for slow, thin (1.5) for fast
                // Use exponential decay for smoother gradient
                // Speed is in pixels per millisecond, typical range 0-3
                const minWidth = 1.5;
                const maxWidth = 6;
                const speedFactor = Math.exp(-avgSpeed * 1.5); // Smooth exponential decay
                const lineWidth = minWidth + (maxWidth - minWidth) * speedFactor;
                
                ctx.strokeStyle = `rgba(50, 50, 50, ${alpha})`;
                ctx.lineWidth = lineWidth;
                
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        }
        
        ctx.restore();
        
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }
}
