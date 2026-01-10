/**
 * Reusable face mask overlay - draws glowing face outline, eyes, mouth, and skeleton hands
 */
export class FaceMask {
    constructor(options = {}) {
        // Colors - can be customized per mode
        this.colors = options.colors || ['#00ffff']; // Default cyan, or array for rainbow
        this.useRainbow = options.useRainbow ?? true;
        
        // Rainbow colors for cycling
        this.rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
        
        // Glow settings
        this.glowBlur = options.glowBlur ?? 30;
        this.lineWidth = options.lineWidth ?? 3;
        this.opacity = options.opacity ?? 0.4;
        
        // Eye settings
        this.eyeRadius = options.eyeRadius ?? 12;
        
        // Blink settings
        this.lastBlinkTime = 0;
        this.blinkDuration = 150;
        this.nextBlinkTime = 2000;
        
        // Hand skeleton connections
        this.handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
    }

    getColor(time, offset = 0) {
        if (this.useRainbow) {
            const colorIndex = Math.floor((time * 2 + offset) % this.rainbowColors.length);
            return this.rainbowColors[colorIndex];
        }
        return this.colors[0];
    }

    draw(ctx, landmarks, canvasSize) {
        if (!landmarks || landmarks.length === 0) return;
        
        const time = performance.now() * 0.001;
        
        // Find face features
        const leftEye = landmarks.find(lm => lm.feature === 'leftEye');
        const rightEye = landmarks.find(lm => lm.feature === 'rightEye');
        const upperLip = landmarks.find(lm => lm.feature === 'upperLip');
        const lowerLip = landmarks.find(lm => lm.feature === 'lowerLip');
        const leftMouth = landmarks.find(lm => lm.feature === 'leftMouth');
        const rightMouth = landmarks.find(lm => lm.feature === 'rightMouth');
        
        ctx.globalAlpha = this.opacity;
        
        // Draw face if detected
        if (leftEye && rightEye) {
            const color = this.getColor(time);
            
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = this.glowBlur;
            
            // Draw eyes with blinking
            this.drawEyes(ctx, leftEye, rightEye, time);
            
            // Draw animated mouth
            if (upperLip && lowerLip && leftMouth && rightMouth) {
                this.drawMouth(ctx, upperLip, lowerLip, leftMouth, rightMouth);
            }
        }
        
        // Draw face outline
        this.drawFaceOutline(ctx, landmarks, time);
        
        // Draw skeleton hands
        this.drawSkeletonHands(ctx, landmarks, time);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    drawEyes(ctx, leftEye, rightEye, time) {
        // Random blink timing
        const now = performance.now();
        if (now > this.nextBlinkTime) {
            this.lastBlinkTime = now;
            this.nextBlinkTime = now + 2500 + Math.random() * 3000;
        }
        const isBlinking = (now - this.lastBlinkTime) < this.blinkDuration;
        
        if (isBlinking) {
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(leftEye.x - this.eyeRadius, leftEye.y);
            ctx.lineTo(leftEye.x + this.eyeRadius, leftEye.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(rightEye.x - this.eyeRadius, rightEye.y);
            ctx.lineTo(rightEye.x + this.eyeRadius, rightEye.y);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, this.eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEye.x, rightEye.y, this.eyeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMouth(ctx, upperLip, lowerLip, leftMouth, rightMouth) {
        const mouthOpen = Math.abs(lowerLip.y - upperLip.y);
        
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Upper lip curve
        ctx.beginPath();
        ctx.moveTo(leftMouth.x, leftMouth.y);
        ctx.quadraticCurveTo(
            (leftMouth.x + rightMouth.x) / 2,
            upperLip.y - mouthOpen * 0.3,
            rightMouth.x,
            rightMouth.y
        );
        ctx.stroke();
        
        // Lower lip curve
        ctx.beginPath();
        ctx.moveTo(leftMouth.x, leftMouth.y);
        ctx.quadraticCurveTo(
            (leftMouth.x + rightMouth.x) / 2,
            lowerLip.y + mouthOpen * 0.2,
            rightMouth.x,
            rightMouth.y
        );
        ctx.stroke();
    }

    drawFaceOutline(ctx, landmarks, time) {
        const faceOval = landmarks
            .filter(lm => lm.type === 'face' && lm.isEdge && lm.faceOvalOrder >= 0)
            .sort((a, b) => a.faceOvalOrder - b.faceOvalOrder);
        
        if (faceOval.length > 5) {
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.3;
            
            const color = this.getColor(time, 1);
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            
            ctx.beginPath();
            ctx.moveTo(faceOval[0].x, faceOval[0].y);
            for (let i = 1; i < faceOval.length; i++) {
                ctx.lineTo(faceOval[i].x, faceOval[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.globalAlpha = this.opacity;
        }
    }

    drawSkeletonHands(ctx, landmarks, time) {
        const handLandmarks = landmarks.filter(lm => lm.type === 'hand');
        if (handLandmarks.length === 0) return;
        
        // Group by handId
        const hands = {};
        for (const lm of handLandmarks) {
            if (!hands[lm.handId]) hands[lm.handId] = {};
            hands[lm.handId][lm.index] = lm;
        }
        
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.35;
        
        for (const handId in hands) {
            const hand = hands[handId];
            
            // Draw bones
            for (const [startIdx, endIdx] of this.handConnections) {
                const start = hand[startIdx];
                const end = hand[endIdx];
                
                if (start && end) {
                    const color = this.getColor(time, startIdx * 0.3);
                    ctx.strokeStyle = color;
                    ctx.shadowColor = color;
                    
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                }
            }
            
            // Draw joints
            for (const idx in hand) {
                const lm = hand[idx];
                const color = this.getColor(time, parseInt(idx) * 0.5);
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                
                const radius = [0, 4, 8, 12, 16, 20].includes(parseInt(idx)) ? 6 : 4;
                ctx.beginPath();
                ctx.arc(lm.x, lm.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
