import { AttractMode, RepelMode, RainMode, SnowMode, PartyMode, GalacticMode, MatrixMode, GravityMode, SketchMode } from './modes/index.js';

// Golden ratio for organic distribution
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;

/**
 * Color themes for particles
 */
export const THEMES = {
    Rainbow: {
        colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
    },
    Fire: {
        colors: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#ffff00', '#ff6600']
    },
    Ocean: {
        colors: ['#001a33', '#003366', '#004c99', '#0066cc', '#0099ff', '#00ccff', '#66ffff']
    },
    Galaxy: {
        colors: ['#1a0033', '#330066', '#4d0099', '#6600cc', '#9933ff', '#cc66ff', '#ff99ff']
    },
    Matrix: {
        colors: ['#003300', '#004400', '#006600', '#008800', '#00aa00', '#00cc00', '#00ff00']
    },
    White: {
        colors: ['#ffffff', '#f0f0f0', '#e8e8e8', '#d8d8d8', '#c8c8c8']
    },
    Mercury: {
        colors: ['#4a4a4a', '#5c5c5c', '#3d3d3d', '#6e6e6e', '#2f2f2f', '#505050']
    }
};

export const THEME_NAMES = Object.keys(THEMES);

/**
 * Manages particle lifecycle, physics, and rendering
 */
export class ParticleSystem {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.config = {
            minParticles: config.minParticles || 5000,
            maxParticles: config.maxParticles || 10000,
            trailAlpha: config.trailAlpha || 0.15,
            ...config
        };
        
        this.particles = [];
        this.currentTheme = 0;
        this.landmarks = [];
        this.maskVisible = true;
        
        // Initialize modes
        this.modes = {
            attract: new AttractMode(),
            repel: new RepelMode(),
            rain: new RainMode(),
            snow: new SnowMode(),
            party: new PartyMode(),
            galactic: new GalacticMode(),
            matrix: new MatrixMode(),
            gravity: new GravityMode(),
            sketch: new SketchMode()
        };
        this.currentMode = this.modes.attract;
    }

    /**
     * Initialize particles
     */
    init() {
        const count = Math.floor(
            this.config.minParticles + 
            Math.random() * (this.config.maxParticles - this.config.minParticles)
        );
        
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * Create a single particle
     */
    createParticle() {
        const theme = THEMES[THEME_NAMES[this.currentTheme]];
        const color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
        
        // Random flow direction for organic movement
        const flowAngle = Math.random() * Math.PI * 2;
        const flowSpeed = 0.5 + Math.random() * 1.5;
        
        const canvasSize = { width: this.canvas.width, height: this.canvas.height };
        
        const particle = {
            x: 0,
            y: 0,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            baseX: Math.random() * this.canvas.width,
            baseY: Math.random() * this.canvas.height,
            size: Math.random() * 2.5 + 0.5,
            color: color,
            alpha: Math.random() * 0.5 + 0.5,
            targetX: null,
            targetY: null,
            targetSpread: 5,
            // Flow properties for organic movement
            flowAngle: flowAngle,
            flowSpeed: flowSpeed,
            phase: Math.random() * Math.PI * 2,
            waveAmp: 0.3 + Math.random() * 0.5
        };
        
        // Let mode initialize particle position
        this.currentMode.initParticle(particle, canvasSize);
        
        return particle;
    }

    /**
     * Set the current mode
     */
    setMode(modeName) {
        if (this.modes[modeName]) {
            this.currentMode = this.modes[modeName];
            
            // Reinitialize particle positions for new mode
            const canvasSize = { width: this.canvas.width, height: this.canvas.height };
            for (const particle of this.particles) {
                this.currentMode.initParticle(particle, canvasSize);
                particle.vx = (Math.random() - 0.5) * 2;
                particle.vy = (Math.random() - 0.5) * 2;
            }
        }
    }

    /**
     * Set the current theme
     */
    setTheme(themeIndex) {
        this.currentTheme = themeIndex;
        const theme = THEMES[THEME_NAMES[themeIndex]];
        
        // Update all particle colors
        for (const particle of this.particles) {
            particle.color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
        }
    }

    /**
     * Cycle to next theme
     */
    cycleTheme() {
        const newTheme = (this.currentTheme + 1) % THEME_NAMES.length;
        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Set mask visibility
     */
    setMaskVisible(visible) {
        this.maskVisible = visible;
    }

    /**
     * Update landmarks from tracking results
     */
    setLandmarks(landmarks) {
        this.landmarks = landmarks;
    }

    /**
     * Assign particles to landmark targets (for attract mode)
     */
    assignTargets() {
        const particleCount = this.particles.length;
        const landmarkCount = this.landmarks.length;
        
        if (landmarkCount > 0) {
            for (let i = 0; i < particleCount; i++) {
                const particle = this.particles[i];
                
                // Use golden ratio for distribution
                const angle = i * PHI * Math.PI * 2;
                const landmarkIndex = Math.floor((i * PHI_INV * landmarkCount) % landmarkCount);
                const target = this.landmarks[landmarkIndex];
                
                // Add spread based on golden ratio spiral
                const spiralR = Math.sqrt(i / particleCount) * target.spread;
                const offsetX = Math.cos(angle) * spiralR;
                const offsetY = Math.sin(angle) * spiralR;
                
                particle.targetX = target.x + offsetX;
                particle.targetY = target.y + offsetY;
                particle.targetSpread = target.spread;
            }
        } else {
            // No landmarks - clear targets
            for (const particle of this.particles) {
                particle.targetX = null;
                particle.targetY = null;
            }
        }
    }

    /**
     * Update all particles
     */
    update() {
        // Assign targets for attract mode
        this.assignTargets();
        
        const canvasSize = {
            width: this.canvas.width,
            height: this.canvas.height
        };
        
        const mode = this.currentMode;
        const friction = mode.getFriction();
        const maxSpeed = mode.getMaxSpeed();
        const usesFriction = mode.usesFriction();
        
        // Call mode's before-update hook (for batch operations like bursts, shooting stars)
        mode.onBeforeUpdate(this.particles, this.landmarks, canvasSize);
        
        for (const particle of this.particles) {
            // Apply mode-specific physics
            mode.updateParticle(particle, this.landmarks, canvasSize);
            
            // Apply friction if mode uses it
            if (usesFriction) {
                particle.vx *= friction;
                particle.vy *= friction;
            }
            
            // Clamp velocity
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > maxSpeed) {
                particle.vx = (particle.vx / speed) * maxSpeed;
                particle.vy = (particle.vy / speed) * maxSpeed;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Handle edges
            mode.handleEdges(particle, canvasSize);
        }
    }

    /**
     * Render all particles
     */
    render() {
        const ctx = this.ctx;
        const mode = this.currentMode;
        
        // Clear with trail effect (mode-specific alpha and background color)
        const trailAlpha = mode.getTrailAlpha();
        const bgColor = mode.getBackgroundColor ? mode.getBackgroundColor() : null;
        
        if (bgColor) {
            // White/light background - use solid clear for sketch mode
            ctx.fillStyle = bgColor;
            ctx.globalAlpha = 1 - trailAlpha * 0.3; // Faster fade on white
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.globalAlpha = 1;
        } else {
            // Dark background (default)
            ctx.fillStyle = `rgba(5, 5, 8, ${1 - trailAlpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Render particles
        for (const particle of this.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = mode.getParticleAlpha(particle);
            ctx.fill();
        }
        
        // Call mode's after-render hook (for overlays like shooting stars)
        const canvasSize = { width: this.canvas.width, height: this.canvas.height };
        mode.onAfterRender(ctx, canvasSize, { maskVisible: this.maskVisible });
        
        ctx.globalAlpha = 1;
    }

    /**
     * Get particle count
     */
    getCount() {
        return this.particles.length;
    }

    /**
     * Add particles (up to max limit)
     * @param {number} count - Number of particles to add
     * @returns {number} - New total count
     */
    addParticles(count = 100) {
        const maxParticles = 10000;
        const toAdd = Math.min(count, maxParticles - this.particles.length);
        
        for (let i = 0; i < toAdd; i++) {
            this.particles.push(this.createParticle());
        }
        
        return this.particles.length;
    }

    /**
     * Remove particles (down to min limit)
     * @param {number} count - Number of particles to remove
     * @returns {number} - New total count
     */
    removeParticles(count = 100) {
        const minParticles = 1;
        const toRemove = Math.min(count, this.particles.length - minParticles);
        
        if (toRemove > 0) {
            this.particles.splice(0, toRemove);
        }
        
        return this.particles.length;
    }

    /**
     * Handle canvas resize
     */
    resize() {
        // Update base positions for particles
        for (const particle of this.particles) {
            particle.baseX = Math.random() * this.canvas.width;
            particle.baseY = Math.random() * this.canvas.height;
        }
    }
}
