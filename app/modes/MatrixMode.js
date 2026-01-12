import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

// Katakana + some symbols for authentic Matrix look
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789:・."=*+-<>¦|_';

export class MatrixMode extends Mode {
    constructor() {
        super('matrix', '💊', 'Matrix');
        
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

    onBeforeUpdate(particles, landmarks, canvasSize) {
        // Store landmarks for face mask
        this.landmarks = landmarks;
        
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

    onAfterRender(ctx, canvasSize, options = {}) {
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
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
            this.drawSunglasses(ctx, this.landmarks);
        }
    }

    drawSunglasses(ctx, landmarks) {
        if (!landmarks || landmarks.length === 0) return;

        // Find nose bridge (stable anchor) and eyes for sizing
        const noseBridge = landmarks.find(lm => lm.feature === 'noseBridge');
        const leftEye = landmarks.find(lm => lm.feature === 'leftEye');
        const rightEye = landmarks.find(lm => lm.feature === 'rightEye');
        
        if (!noseBridge || !leftEye || !rightEye) return;

        // Calculate dimensions based on eye distance
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        const baseLensWidth = eyeDistance * 0.45;
        const baseLensHeight = eyeDistance * 0.25;
        
        // Calculate angle from eyes (for head tilt)
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        
        // Calculate head yaw (left/right rotation) based on nose offset from eye midpoint
        const eyeMidX = (leftEye.x + rightEye.x) / 2;
        const eyeMidY = (leftEye.y + rightEye.y) / 2;
        const noseOffset = (noseBridge.x - eyeMidX) / eyeDistance;
        // noseOffset: negative = head turned right, positive = head turned left
        const headYaw = Math.max(-0.5, Math.min(0.5, noseOffset * 2));
        
        // Position lenses relative to nose bridge (more stable than eye tracking)
        const halfEyeDist = eyeDistance / 2;
        const leftLensX = noseBridge.x - Math.cos(angle) * halfEyeDist;
        const leftLensY = noseBridge.y - Math.sin(angle) * halfEyeDist;
        const rightLensX = noseBridge.x + Math.cos(angle) * halfEyeDist;
        const rightLensY = noseBridge.y + Math.sin(angle) * halfEyeDist;

        ctx.save();
        ctx.globalAlpha = 0.9;
        
        // Adjust lens widths based on head rotation (3D perspective)
        // When head turns right, right lens appears wider, left lens narrower
        const leftLensWidth = baseLensWidth * (1 - headYaw * 0.5);
        const rightLensWidth = baseLensWidth * (1 + headYaw * 0.5);
        
        // Base wrap angle + additional based on head rotation
        const baseWrap = 0.2;
        const leftWrap = baseWrap + headYaw * 0.4;
        const rightWrap = baseWrap - headYaw * 0.4;
        
        // Left lens - curved wrap with 3D perspective
        ctx.save();
        ctx.translate(leftLensX, leftLensY);
        ctx.rotate(angle);
        ctx.transform(1, 0, -Math.sin(leftWrap), 1, 0, 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, leftLensWidth, baseLensHeight, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#001100';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
        
        // Right lens - curved wrap with 3D perspective
        ctx.save();
        ctx.translate(rightLensX, rightLensY);
        ctx.rotate(angle);
        ctx.transform(1, 0, Math.sin(rightWrap), 1, 0, 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, rightLensWidth, baseLensHeight, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#001100';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
        
        // Draw curved bridge between lenses
        const bridgeLeftX = leftLensX + Math.cos(angle) * leftLensWidth;
        const bridgeLeftY = leftLensY + Math.sin(angle) * leftLensWidth;
        const bridgeRightX = rightLensX - Math.cos(angle) * rightLensWidth;
        const bridgeRightY = rightLensY - Math.sin(angle) * rightLensWidth;
        const bridgeMidX = noseBridge.x;
        const bridgeMidY = noseBridge.y - baseLensHeight * 0.3; // Slight curve upward
        
        ctx.beginPath();
        ctx.moveTo(bridgeLeftX, bridgeLeftY);
        ctx.quadraticCurveTo(bridgeMidX, bridgeMidY, bridgeRightX, bridgeRightY);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 5;
        ctx.stroke();
        
        ctx.restore();
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
