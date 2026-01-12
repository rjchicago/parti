import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

export class GalacticMode extends Mode {
    constructor() {
        super('galactic', '🌌', 'Galactic');
        this.twinkleSpeed = 0.005;
        this.driftSpeed = 0.1;
        
        // Interaction - stars twinkle when hands/face pass over
        this.handTwinkleRadius = 100; // pixels
        
        // Shooting stars
        this.shootingStars = [];
        this.lastShootingStarTime = 0;
        this.shootingStarInterval = 3000; // Average ms between shooting stars
        
        // Milky Way band parameters
        this.bandAngle = -0.3; // Slight diagonal tilt (radians)
        this.bandWidth = 0.35; // Width of the main band (fraction of screen height)
        this.coreIntensity = 0.7; // How concentrated the core is
        
        this.landmarks = [];
        
        // Face mask with Galaxy purple
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#9933ff']
        });
    }

    initParticle(particle, canvasSize) {
        // Create Milky Way distribution - a band across the sky
        // with denser concentration in the center
        
        const rand = Math.random();
        
        if (rand < 0.6) {
            // 60% of stars in the main Milky Way band
            // Use gaussian-like distribution for the band
            const u1 = Math.random();
            const u2 = Math.random();
            const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            
            // Position along the band (full width)
            particle.x = Math.random() * canvasSize.width;
            
            // Position across the band (concentrated in center)
            const bandCenter = canvasSize.height * 0.5;
            const bandSpread = canvasSize.height * this.bandWidth;
            particle.y = bandCenter + gaussian * bandSpread * 0.3;
            
            // Apply diagonal tilt based on x position
            const xOffset = (particle.x / canvasSize.width - 0.5) * canvasSize.height * this.bandAngle;
            particle.y += xOffset;
            
            // Brighter stars in the band
            particle.alpha = 0.5 + Math.random() * 0.5;
            particle.size = 1 + Math.random() * 2;
        } else if (rand < 0.85) {
            // 25% scattered across the sky (fainter)
            particle.x = Math.random() * canvasSize.width;
            particle.y = Math.random() * canvasSize.height;
            particle.alpha = 0.2 + Math.random() * 0.4;
            particle.size = 0.5 + Math.random() * 1.5;
        } else {
            // 15% in the galactic core (bright concentration)
            const coreX = canvasSize.width * 0.5;
            const coreY = canvasSize.height * 0.5;
            const coreRadius = canvasSize.width * 0.15;
            
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * coreRadius * Math.random(); // Concentrate toward center
            
            particle.x = coreX + Math.cos(angle) * dist;
            particle.y = coreY + Math.sin(angle) * dist * 0.6; // Flatten vertically
            
            // Core stars are brightest
            particle.alpha = 0.6 + Math.random() * 0.4;
            particle.size = 1 + Math.random() * 2.5;
        }
        
        // Keep within bounds
        particle.y = Math.max(0, Math.min(canvasSize.height, particle.y));
        
        // Assign depth for parallax
        particle.depth = 0.2 + Math.random() * 0.8;
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        
        // Check for hand/face proximity - stars twinkle brighter when passing over
        particle.handTwinkle = 0;
        for (const lm of landmarks) {
            const dx = particle.x - lm.x;
            const dy = particle.y - lm.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.handTwinkleRadius) {
                // Closer = brighter twinkle
                const intensity = 1 - (dist / this.handTwinkleRadius);
                particle.handTwinkle = Math.max(particle.handTwinkle, intensity);
            }
        }
        
        // Gentle cosmic drift
        const time = performance.now() * 0.0001;
        particle.vx += Math.sin(time + particle.phase) * this.driftSpeed * 0.05;
        particle.vy += Math.cos(time * 0.7 + particle.phase) * this.driftSpeed * 0.03;
        
        // Damping for smooth movement
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        
        // Base twinkle effect
        particle.twinkle = 0.5 + 0.5 * Math.sin(performance.now() * this.twinkleSpeed + particle.phase * 10);
    }

    onBeforeUpdate(particles, landmarks, canvasSize) {
        const now = performance.now();
        
        // Maybe spawn a new shooting star
        if (now - this.lastShootingStarTime > this.shootingStarInterval + Math.random() * 2000) {
            this.lastShootingStarTime = now;
            
            // Start from random edge, mostly top-right area
            const startX = canvasSize.width * (0.3 + Math.random() * 0.7);
            const startY = Math.random() * canvasSize.height * 0.3;
            
            // Angle down-left mostly
            const angle = Math.PI * 0.6 + Math.random() * 0.4;
            const speed = 15 + Math.random() * 10;
            
            this.shootingStars.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                trail: []
            });
        }
        
        // Update existing shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const star = this.shootingStars[i];
            
            // Store trail position
            star.trail.push({ x: star.x, y: star.y });
            if (star.trail.length > 20) star.trail.shift();
            
            // Move
            star.x += star.vx;
            star.y += star.vy;
            star.life -= 0.02;
            
            // Remove if dead or off screen
            if (star.life <= 0 || star.x < -50 || star.x > canvasSize.width + 50 || 
                star.y < -50 || star.y > canvasSize.height + 50) {
                this.shootingStars.splice(i, 1);
            }
        }
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Render shooting stars
        for (const star of this.shootingStars) {
            // Draw trail
            if (star.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(star.trail[0].x, star.trail[0].y);
                for (let i = 1; i < star.trail.length; i++) {
                    ctx.lineTo(star.trail[i].x, star.trail[i].y);
                }
                ctx.lineTo(star.x, star.y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${star.life * 0.5})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Draw star head
            ctx.beginPath();
            ctx.arc(star.x, star.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.life})`;
            ctx.globalAlpha = 1;
            ctx.fill();
        }
        
        // Draw face mask overlay
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
    }

    getParticleAlpha(particle) {
        // Base twinkle
        let alpha = particle.alpha;
        if (particle.twinkle !== undefined) {
            alpha = particle.alpha * (0.4 + particle.twinkle * 0.6);
        }
        
        // Hand proximity boost - stars flash brighter when hands pass over
        if (particle.handTwinkle > 0) {
            // Boost to full brightness with sparkle
            const sparkle = 0.5 + 0.5 * Math.sin(performance.now() * 0.02 + particle.phase * 5);
            alpha = Math.min(1, alpha + particle.handTwinkle * sparkle);
        }
        
        return alpha;
    }

    getMaxSpeed() {
        return 3;
    }

    getFriction() {
        return 0.98;
    }

    usesFriction() {
        return true;
    }

    getTrailAlpha() {
        return 0.05; // Very persistent stars
    }

    handleEdges(particle, canvasSize) {
        // Wrap around all edges for infinite starfield
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvasSize.height;
        if (particle.y > canvasSize.height) particle.y = 0;
    }

    getPresetTheme() {
        return 3; // Galaxy
    }
}
