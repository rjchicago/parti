import { Mode } from './Mode.js';
import { FaceMask } from './FaceMask.js';

/**
 * Helper to draw rounded rectangles (compatible with all browsers)
 */
function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * BrickBreaker mode: Classic breakout game controlled by head movement
 * Head X position controls paddle, particles explode from broken bricks
 */
export class BrickBreakerMode extends Mode {
    constructor() {
        super('brickbreaker', '🧱', 'Breaker');
        
        // Game configuration
        this.brickRows = 5;
        this.brickCols = 8;
        this.brickPadding = 8;
        this.brickHeight = 25;
        this.topOffset = 60;
        
        // Paddle configuration
        this.paddleWidth = 120;
        this.paddleHeight = 15;
        this.paddleY = 0; // Set on init based on canvas height
        
        // Ball configuration
        this.ballRadius = 10;
        this.initialBallSpeed = 6;
        this.speedIncrement = 0.3; // Speed up on each paddle hit
        this.maxBallSpeed = 15;
        
        // Game state
        this.ball = { x: 0, y: 0, vx: 0, vy: 0, speed: this.initialBallSpeed, launched: false };
        this.paddle = { x: 0 };
        this.bricks = [];
        this.lives = 3;
        this.score = 0;
        this.gameOver = false;
        this.gameWon = false;
        
        // Particle explosion settings
        this.particlesPerBrick = 80;
        this.explosionSpeed = 8;
        this.gravity = 0.15;
        this.confettiWobble = 0.3;
        
        // Head tracking
        this.headX = 0.5; // Normalized 0-1
        this.smoothedHeadX = 0.5;
        this.smoothing = 0.15; // Lower = smoother
        
        // Brick colors (row-based)
        this.brickColors = [
            '#ff4444', // Red
            '#ff8844', // Orange  
            '#ffcc44', // Yellow
            '#44cc44', // Green
            '#4488ff', // Blue
        ];
        
        this.initialized = false;
        this.canvasSize = { width: 800, height: 600 };
        
        // Face/hand rendering
        this.landmarks = [];
        this.faceMask = new FaceMask();
        
        // Display auto-hide tracking
        this.userDisplayWasVisible = null; // Store user's preference before auto-hiding
        this.displayHidden = false; // Track if we auto-hid the display
    }

    initGame(canvasSize) {
        this.canvasSize = canvasSize;
        this.paddleY = canvasSize.height - 50;
        
        // Initialize bricks
        this.bricks = [];
        const brickWidth = (canvasSize.width - this.brickPadding * (this.brickCols + 1)) / this.brickCols;
        
        for (let row = 0; row < this.brickRows; row++) {
            for (let col = 0; col < this.brickCols; col++) {
                this.bricks.push({
                    x: this.brickPadding + col * (brickWidth + this.brickPadding),
                    y: this.topOffset + row * (this.brickHeight + this.brickPadding),
                    width: brickWidth,
                    height: this.brickHeight,
                    alive: true,
                    color: this.brickColors[row % this.brickColors.length],
                    row: row
                });
            }
        }
        
        // Reset ball
        this.resetBall();
        
        // Reset game state
        this.lives = 3;
        this.score = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.displayHidden = false; // Allow auto-hide on next launch
        this.initialized = true;
    }

    resetBall() {
        this.ball = {
            x: this.canvasSize.width / 2,
            y: this.paddleY - this.ballRadius - 5,
            vx: 0,
            vy: 0,
            speed: this.initialBallSpeed,
            launched: false
        };
    }

    launchBall() {
        if (!this.ball.launched && !this.gameOver) {
            // Launch at random angle between 45-135 degrees (upward)
            const angle = (Math.random() * 0.5 + 0.25) * Math.PI; // 45-135 degrees
            this.ball.vx = Math.cos(angle) * this.ball.speed;
            this.ball.vy = -Math.abs(Math.sin(angle) * this.ball.speed);
            this.ball.launched = true;
            
            // Auto-hide display when game starts
            this.requestDisplayHide();
        }
    }
    
    // Request display hide (stores user preference first)
    requestDisplayHide() {
        if (!this.displayHidden) {
            window.dispatchEvent(new CustomEvent('brickbreaker:hideDisplay'));
            this.displayHidden = true;
        }
    }
    
    // Request display restore (restores user preference)
    requestDisplayShow() {
        if (this.displayHidden) {
            window.dispatchEvent(new CustomEvent('brickbreaker:showDisplay'));
            this.displayHidden = false;
        }
    }

    initParticle(particle, canvasSize) {
        // Start particles off-screen (waiting to be used for explosions)
        particle.x = -100;
        particle.y = canvasSize.height + 100;
        particle.vx = 0;
        particle.vy = 0;
        particle.active = false;
        particle.brickColor = null;
        particle.phase = Math.random() * Math.PI * 2;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    spawnExplosion(x, y, color, particles) {
        let spawned = 0;
        const targetCount = this.particlesPerBrick;
        
        for (const particle of particles) {
            if (spawned >= targetCount) break;
            if (particle.active) continue;
            
            // Position at brick center
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y + (Math.random() - 0.5) * 10;
            
            // Explosion velocity (mostly upward and outward)
            const angle = Math.random() * Math.PI * 2;
            const speed = this.explosionSpeed * (0.5 + Math.random() * 0.5);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed - 3; // Bias upward
            
            particle.active = true;
            particle.brickColor = color;
            particle.alpha = 1;
            particle.phase = Math.random() * Math.PI * 2;
            
            spawned++;
        }
    }

    updateParticle(particle, landmarks, canvasSize) {
        if (!particle.active) return;
        
        // Apply gravity
        particle.vy += this.gravity;
        
        // Apply confetti wobble
        const time = performance.now() * 0.003;
        particle.vx += Math.sin(time + particle.phase) * this.confettiWobble * 0.1;
        
        // Damping
        particle.vx *= 0.99;
        
        // Fade out as they fall
        if (particle.y > canvasSize.height * 0.7) {
            particle.alpha *= 0.98;
        }
    }

    handleEdges(particle, canvasSize) {
        if (!particle.active) return;
        
        // Wrap horizontally
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;
        
        // Discard at bottom
        if (particle.y > canvasSize.height + 10) {
            particle.active = false;
            particle.x = -100;
            particle.y = canvasSize.height + 100;
        }
    }

    getParticleAlpha(particle) {
        return particle.active ? particle.alpha : 0;
    }

    onBeforeUpdate(particles, landmarks, canvasSize) {
        // Store landmarks for mask rendering
        this.landmarks = landmarks;
        
        // Guard against invalid canvas size
        if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
            return;
        }
        
        // Initialize game if needed
        if (!this.initialized || this.canvasSize.width !== canvasSize.width) {
            this.initGame(canvasSize);
        }
        
        // Track head position from face landmarks
        const faceLandmarks = landmarks.filter(lm => lm.type === 'face');
        if (faceLandmarks.length > 0) {
            // Find nose or center of face
            const nose = faceLandmarks.find(lm => lm.feature === 'noseBridge') || faceLandmarks[0];
            if (nose) {
                // Normalize to 0-1
                this.headX = nose.x / canvasSize.width;
                // Smooth the movement
                this.smoothedHeadX += (this.headX - this.smoothedHeadX) * this.smoothing;
            }
        }
        
        // Update paddle position
        this.paddle.x = this.smoothedHeadX * canvasSize.width;
        
        // Keep ball on paddle if not launched
        if (!this.ball.launched) {
            this.ball.x = this.paddle.x;
            this.ball.y = this.paddleY - this.ballRadius - 5;
        }
        
        if (this.gameOver || this.gameWon) return;
        if (!this.ball.launched) return;
        
        // Update ball position
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // Wall collisions (left/right)
        if (this.ball.x - this.ballRadius < 0) {
            this.ball.x = this.ballRadius;
            this.ball.vx = Math.abs(this.ball.vx);
        }
        if (this.ball.x + this.ballRadius > canvasSize.width) {
            this.ball.x = canvasSize.width - this.ballRadius;
            this.ball.vx = -Math.abs(this.ball.vx);
        }
        
        // Top wall collision
        if (this.ball.y - this.ballRadius < 0) {
            this.ball.y = this.ballRadius;
            this.ball.vy = Math.abs(this.ball.vy);
        }
        
        // Bottom - lose life
        if (this.ball.y + this.ballRadius > canvasSize.height) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver = true;
                this.requestDisplayShow();
            } else {
                this.resetBall();
            }
        }
        
        // Paddle collision
        const paddleLeft = this.paddle.x - this.paddleWidth / 2;
        const paddleRight = this.paddle.x + this.paddleWidth / 2;
        const paddleTop = this.paddleY;
        
        if (this.ball.y + this.ballRadius > paddleTop &&
            this.ball.y - this.ballRadius < paddleTop + this.paddleHeight &&
            this.ball.x > paddleLeft &&
            this.ball.x < paddleRight &&
            this.ball.vy > 0) {
            
            // Calculate hit position (-1 to 1, left to right)
            const hitPos = (this.ball.x - this.paddle.x) / (this.paddleWidth / 2);
            
            // Angle based on hit position (steeper at edges)
            const maxAngle = Math.PI / 3; // 60 degrees max
            const angle = hitPos * maxAngle;
            
            // Speed up slightly
            this.ball.speed = Math.min(this.ball.speed + this.speedIncrement, this.maxBallSpeed);
            
            // Set new velocity
            this.ball.vx = Math.sin(angle) * this.ball.speed;
            this.ball.vy = -Math.cos(angle) * this.ball.speed;
            
            // Ensure ball is above paddle
            this.ball.y = paddleTop - this.ballRadius;
        }
        
        // Brick collisions
        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            
            // AABB collision
            if (this.ball.x + this.ballRadius > brick.x &&
                this.ball.x - this.ballRadius < brick.x + brick.width &&
                this.ball.y + this.ballRadius > brick.y &&
                this.ball.y - this.ballRadius < brick.y + brick.height) {
                
                // Determine which side was hit
                const overlapLeft = (this.ball.x + this.ballRadius) - brick.x;
                const overlapRight = (brick.x + brick.width) - (this.ball.x - this.ballRadius);
                const overlapTop = (this.ball.y + this.ballRadius) - brick.y;
                const overlapBottom = (brick.y + brick.height) - (this.ball.y - this.ballRadius);
                
                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);
                
                if (minOverlapX < minOverlapY) {
                    // Side collision
                    this.ball.vx = -this.ball.vx;
                } else {
                    // Top/bottom collision
                    this.ball.vy = -this.ball.vy;
                }
                
                // Break the brick
                brick.alive = false;
                this.score += (this.brickRows - brick.row) * 10; // Higher rows = more points
                
                // Spawn explosion particles
                const brickCenterX = brick.x + brick.width / 2;
                const brickCenterY = brick.y + brick.height / 2;
                this.spawnExplosion(brickCenterX, brickCenterY, brick.color, particles);
                
                // Check win condition
                if (this.bricks.every(b => !b.alive)) {
                    this.gameWon = true;
                    this.requestDisplayShow();
                }
                
                break; // Only one brick per frame
            }
        }
    }

    onAfterRender(ctx, canvasSize, options = {}) {
        // Reset canvas state (globalAlpha may be 0 from particle rendering)
        ctx.globalAlpha = 1;
        
        // Initialize if not yet done (can happen if onBeforeUpdate wasn't called)
        if (!this.initialized || !this.bricks || this.bricks.length === 0) {
            if (canvasSize && canvasSize.width > 0 && canvasSize.height > 0) {
                this.initGame(canvasSize);
            } else {
                return;
            }
        }
        
        // Draw bricks
        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            
            ctx.fillStyle = brick.color;
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 8;
            
            // Rounded rectangle
            const radius = 4;
            drawRoundRect(ctx, brick.x, brick.y, brick.width, brick.height, radius);
            ctx.fill();
            
            // Highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            drawRoundRect(ctx, brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 2 - 2, radius);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        
        // Draw paddle
        const paddleLeft = this.paddle.x - this.paddleWidth / 2;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 15;
        drawRoundRect(ctx, paddleLeft, this.paddleY, this.paddleWidth, this.paddleHeight, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw UI
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        const hearts = '❤️'.repeat(this.lives) || '💔';
        ctx.fillText(`${this.score}  |  ${hearts}`, canvasSize.width / 2, 35);
        
        // Launch prompt
        if (!this.ball.launched && !this.gameOver && !this.gameWon) {
            ctx.textAlign = 'center';
            ctx.font = '24px Rajdhani, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText('CLICK TO LAUNCH', canvasSize.width / 2, canvasSize.height / 2);
        }
        
        // Draw face mask and hands if enabled
        if (options.maskVisible !== false) {
            this.faceMask.draw(ctx, this.landmarks, canvasSize);
        }
        
        // Game over screen
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Orbitron, sans-serif';
            ctx.fillStyle = '#ff4444';
            ctx.fillText('GAME OVER', canvasSize.width / 2, canvasSize.height / 2 - 30);
            
            ctx.font = '24px Rajdhani, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Final Score: ${this.score}`, canvasSize.width / 2, canvasSize.height / 2 + 20);
            ctx.fillText('Click to play again', canvasSize.width / 2, canvasSize.height / 2 + 60);
        }
        
        // Win screen
        if (this.gameWon) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Orbitron, sans-serif';
            ctx.fillStyle = '#44ff44';
            ctx.fillText('YOU WIN!', canvasSize.width / 2, canvasSize.height / 2 - 30);
            
            ctx.font = '24px Rajdhani, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Final Score: ${this.score}`, canvasSize.width / 2, canvasSize.height / 2 + 20);
            ctx.fillText('Click to play again', canvasSize.width / 2, canvasSize.height / 2 + 60);
        }
    }

    // Handle click to launch or restart
    handleClick() {
        if (this.gameOver || this.gameWon) {
            this.initGame(this.canvasSize);
        } else if (!this.ball.launched) {
            this.launchBall();
        }
    }

    // Called when mode is activated - reset game state
    onActivate(canvasSize) {
        this.initialized = false;
        this.bricks = [];
        if (canvasSize && canvasSize.width > 0 && canvasSize.height > 0) {
            this.initGame(canvasSize);
        }
    }

    getTrailAlpha() {
        return 0.15;
    }

    getMaxSpeed() {
        return 12;
    }

    getFriction() {
        return 0.99;
    }

    usesFriction() {
        return true;
    }

    getPresetTheme() {
        return 0; // Rainbow for confetti
    }
}
