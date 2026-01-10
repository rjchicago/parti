import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

// Katakana + some symbols for authentic Matrix look
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789:・."=*+-<>¦|_';

export class MatrixMode extends Mode {
    constructor() {
        super('matrix', '💊');
        
        // Stream configuration
        this.streams = [];
        this.columnWidth = 20; // Pixels between columns
        this.charHeight = 22; // Character height in pixels
        this.initialized = false;
        
        // Speed settings
        this.minSpeed = 0.3;
        this.maxSpeed = 1.2;
        
        // Trail settings
        this.trailLength = 25; // Number of characters in trail
        this.charChangeRate = 0.02; // Probability of character changing per frame
        
        this.landmarks = [];
        
        // Face mask with Matrix green
        this.faceMask = new FaceMask({ 
            useRainbow: false,
            colors: ['#00ff00']
        });
    }

    initStreams(canvasSize) {
        this.streams = [];
        const numColumns = Math.ceil(canvasSize.width / this.columnWidth);
        
        for (let i = 0; i < numColumns; i++) {
            // Stagger initial positions
            this.streams.push(this.createStream(i, canvasSize, true));
        }
        this.initialized = true;
    }

    createStream(columnIndex, canvasSize, randomStart = false) {
        const chars = [];
        const trailLen = 10 + Math.floor(Math.random() * this.trailLength);
        
        for (let i = 0; i < trailLen; i++) {
            chars.push({
                char: this.randomChar(),
                brightness: 1 - (i / trailLen) // Head is brightest
            });
        }
        
        return {
            x: columnIndex * this.columnWidth + this.columnWidth / 2,
            y: randomStart ? -Math.random() * canvasSize.height * 2 : -this.charHeight * chars.length,
            speed: this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed),
            chars: chars,
            columnIndex: columnIndex
        };
    }

    randomChar() {
        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    }

    onBeforeUpdate(particles, canvasSize) {
        // Initialize streams if needed
        if (!this.initialized || this.streams.length === 0) {
            this.initStreams(canvasSize);
        }
        
        // Update each stream
        for (let i = 0; i < this.streams.length; i++) {
            const stream = this.streams[i];
            
            // Move down
            stream.y += stream.speed * 8;
            
            // Randomly change characters in trail
            for (const charObj of stream.chars) {
                if (Math.random() < this.charChangeRate) {
                    charObj.char = this.randomChar();
                }
            }
            
            // Reset if fully off screen
            const streamBottom = stream.y - stream.chars.length * this.charHeight;
            if (streamBottom > canvasSize.height) {
                this.streams[i] = this.createStream(stream.columnIndex, canvasSize, false);
            }
        }
    }

    onAfterRender(ctx, canvasSize) {
        // Draw all streams
        ctx.font = `${this.charHeight - 2}px "MS Gothic", "Hiragino Kaku Gothic Pro", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (const stream of this.streams) {
            for (let i = 0; i < stream.chars.length; i++) {
                const charObj = stream.chars[i];
                const y = stream.y - i * this.charHeight;
                
                // Skip if off screen
                if (y < -this.charHeight || y > canvasSize.height + this.charHeight) continue;
                
                // Head character is white/bright
                if (i === 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#00ff00';
                    ctx.shadowBlur = 10;
                } else {
                    // Trail fades from bright green to dark green
                    const green = Math.floor(100 + charObj.brightness * 155);
                    ctx.fillStyle = `rgb(0, ${green}, 0)`;
                    ctx.shadowBlur = 0;
                }
                
                ctx.globalAlpha = Math.max(0.1, charObj.brightness);
                ctx.fillText(charObj.char, stream.x, y);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // Draw face mask overlay
        this.faceMask.draw(ctx, this.landmarks, canvasSize);
    }

    // Override to not render regular particles
    getParticleAlpha(particle) {
        return 0; // Hide regular particles - we render streams instead
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        // Particles are hidden, but we can still use them for interactions
    }

    initParticle(particle, canvasSize) {
        // Spread particles but they'll be invisible
        particle.x = Math.random() * canvasSize.width;
        particle.y = Math.random() * canvasSize.height;
    }

    getTrailAlpha() {
        return 0.08; // Strong trail for that glow effect
    }

    getPresetTheme() {
        return 4; // Matrix theme (green)
    }

    handleEdges(particle, canvasSize) {
        // No-op for particles
    }

    // Reset streams when mode is activated
    reset(canvasSize) {
        this.initialized = false;
    }
}
