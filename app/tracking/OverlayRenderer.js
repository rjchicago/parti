/**
 * OverlayRenderer - Draws hand skeleton and face mesh overlays on camera preview
 */

import { HAND_CONNECTIONS, FINGERTIP_INDICES, WRIST_INDEX, FACE_LANDMARKS } from '../core/config.js';

export class OverlayRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /**
     * Clear the overlay canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw all overlays from detection results
     */
    draw(handResults, faceResults) {
        this.clear();
        
        // Draw hands
        if (handResults?.multiHandLandmarks) {
            handResults.multiHandLandmarks.forEach((landmarks, index) => {
                const color = index === 0 ? '#00f5ff' : '#ff00ff';
                this.drawHandSkeleton(landmarks, color);
            });
        }

        // Draw face
        if (faceResults?.multiFaceLandmarks) {
            for (const landmarks of faceResults.multiFaceLandmarks) {
                this.drawFaceMesh(landmarks);
            }
        }
    }

    /**
     * Draw hand skeleton with glowing effect
     */
    drawHandSkeleton(landmarks, color) {
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.translate(-this.canvas.width, 0);

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;

        // Draw connections
        for (const [start, end] of HAND_CONNECTIONS) {
            const startLm = landmarks[start];
            const endLm = landmarks[end];

            this.ctx.beginPath();
            this.ctx.moveTo(startLm.x * this.canvas.width, startLm.y * this.canvas.height);
            this.ctx.lineTo(endLm.x * this.canvas.width, endLm.y * this.canvas.height);
            this.ctx.stroke();
        }

        // Draw landmark points
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            const isFingertip = FINGERTIP_INDICES.includes(i);
            const isWrist = i === WRIST_INDEX;
            const radius = isFingertip || isWrist ? 6 : 3;

            this.ctx.beginPath();
            this.ctx.arc(lm.x * this.canvas.width, lm.y * this.canvas.height, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * Draw face mesh with colored regions
     */
    drawFaceMesh(landmarks) {
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.translate(-this.canvas.width, 0);
        this.ctx.lineWidth = 1;

        // Eyes in teal
        this.ctx.strokeStyle = '#00e5cc';
        this.ctx.shadowColor = '#00e5cc';
        this.ctx.shadowBlur = 5;
        this._drawLandmarkPath(FACE_LANDMARKS.leftEye, landmarks, true);
        this._drawLandmarkPath(FACE_LANDMARKS.rightEye, landmarks, true);

        // Lips in pink
        this.ctx.strokeStyle = '#ff69b4';
        this.ctx.shadowColor = '#ff69b4';
        this._drawLandmarkPath(FACE_LANDMARKS.lips, landmarks, true);

        // Face oval in cyan
        this.ctx.strokeStyle = '#00f5ff';
        this.ctx.shadowColor = '#00f5ff';
        this.ctx.shadowBlur = 3;
        this._drawLandmarkPath(FACE_LANDMARKS.faceOval, landmarks, true);

        this.ctx.restore();
    }

    /**
     * Draw a path through landmark indices
     */
    _drawLandmarkPath(indices, landmarks, close = false) {
        if (indices.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(
            landmarks[indices[0]].x * this.canvas.width,
            landmarks[indices[0]].y * this.canvas.height
        );

        for (let i = 1; i < indices.length; i++) {
            this.ctx.lineTo(
                landmarks[indices[i]].x * this.canvas.width,
                landmarks[indices[i]].y * this.canvas.height
            );
        }

        if (close) this.ctx.closePath();
        this.ctx.stroke();
    }

    /**
     * Resize the overlay canvas
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
