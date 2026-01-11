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
    
    draw(ctx, landmarks, canvasSize, options = {}) {
        if (!landmarks || landmarks.length === 0) return;
        
        const time = performance.now() * 0.001;
        const isShivering = options.isShivering || false;
        
        // Override color to light blue when shivering
        const savedColors = this.colors;
        const savedUseRainbow = this.useRainbow;
        if (isShivering) {
            this.colors = ['#66AAFF']; // Light blue
            this.useRainbow = false;
        }
        
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
            
            // Draw animated mouth (or teeth if shivering)
            if (upperLip && lowerLip && leftMouth && rightMouth) {
                if (isShivering) {
                    this.drawTeeth(ctx, upperLip, lowerLip, leftMouth, rightMouth, time);
                } else {
                    this.drawMouth(ctx, upperLip, lowerLip, leftMouth, rightMouth);
                }
            }
        }
        
        // Draw face outline
        this.drawFaceOutline(ctx, landmarks, time);
        
        // Draw skeleton hands
        this.drawSkeletonHands(ctx, landmarks, time);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // Restore colors
        if (isShivering) {
            this.colors = savedColors;
            this.useRainbow = savedUseRainbow;
        }
    }

    drawEyes(ctx, leftEye, rightEye, time) {
        // Calculate eye radius based on eye distance (scales with head proximity)
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        const dynamicEyeRadius = eyeDistance * 0.12; // ~12% of eye distance
        
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
            ctx.moveTo(leftEye.x - dynamicEyeRadius, leftEye.y);
            ctx.lineTo(leftEye.x + dynamicEyeRadius, leftEye.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(rightEye.x - dynamicEyeRadius, rightEye.y);
            ctx.lineTo(rightEye.x + dynamicEyeRadius, rightEye.y);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, dynamicEyeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEye.x, rightEye.y, dynamicEyeRadius, 0, Math.PI * 2);
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
            lowerLip.y + mouthOpen * 0.5,
            rightMouth.x,
            rightMouth.y
        );
        ctx.stroke();
    }
    
    drawTeeth(ctx, upperLip, lowerLip, leftMouth, rightMouth, time) {
        const mouthWidth = rightMouth.x - leftMouth.x;
        const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
        
        // Chattering effect - slight vertical oscillation
        const chatter = Math.sin(time * 40) * 1.5;
        
        // Mouth dimensions (10% wider border)
        const mouthHeight = 36;
        const mouthPadding = mouthWidth * 0.1; // 10% padding on each side
        const mouthX = leftMouth.x - mouthPadding;
        const mouthY = mouthCenterY - mouthHeight / 2 + chatter;
        const mouthW = mouthWidth + mouthPadding * 2;
        const borderRadius = 10;
        
        // Draw dark outer mouth border
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.getColor(performance.now() * 0.001);
        ctx.beginPath();
        ctx.roundRect(mouthX, mouthY, mouthW, mouthHeight, borderRadius);
        ctx.stroke();
        
        // Teeth grid: 4 columns, 2 rows (use original mouth width, not padded border)
        const teethCols = 4;
        const teethRows = 2;
        const teethPadding = 6;
        const teethGap = 3;
        const teethAreaW = mouthWidth - teethPadding * 2;  // Original width, not mouthW
        const teethAreaH = mouthHeight - teethPadding * 2;
        const toothW = (teethAreaW - teethGap * (teethCols - 1)) / teethCols;
        const toothH = (teethAreaH - teethGap * (teethRows - 1)) / teethRows;
        const toothRadius = 3;
        
        // Draw white filled teeth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Center teeth within the wider border
        const teethStartX = mouthX + mouthPadding + teethPadding;
        
        for (let row = 0; row < teethRows; row++) {
            for (let col = 0; col < teethCols; col++) {
                const x = teethStartX + col * (toothW + teethGap);
                const y = mouthY + teethPadding + row * (toothH + teethGap);
                
                ctx.beginPath();
                ctx.roundRect(x, y, toothW, toothH, toothRadius);
                ctx.fill();
                ctx.stroke();
            }
        }
        
        // Draw dividing line between upper and lower teeth
        ctx.strokeStyle = this.getColor(performance.now() * 0.001);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouthX + teethPadding, mouthY + mouthHeight / 2);
        ctx.lineTo(mouthX + mouthW - teethPadding, mouthY + mouthHeight / 2);
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
