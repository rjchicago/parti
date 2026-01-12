/**
 * LandmarkProcessor - Converts MediaPipe results to normalized landmarks
 */

import { 
    CONFIG, 
    FINGERTIP_INDICES, 
    WRIST_INDEX, 
    HAND_EDGE_INDICES,
    FACE_LANDMARKS,
    DEPTH_LANDMARKS,
    FACE_FEATURE_INDICES
} from '../core/config.js';

export class LandmarkProcessor {
    constructor() {
        this.canvasWidth = 0;
        this.canvasHeight = 0;
    }

    /**
     * Update canvas dimensions for coordinate mapping
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Process hand and face results into normalized landmarks
     */
    process(handResults, faceResults) {
        const landmarks = [];
        
        this._processHands(handResults, landmarks);
        this._processFace(faceResults, landmarks);
        
        return landmarks;
    }

    /**
     * Process hand landmarks
     */
    _processHands(handResults, landmarks) {
        if (!handResults?.multiHandLandmarks) return;
        
        let handId = 0;
        for (const handLandmarks of handResults.multiHandLandmarks) {
            for (let i = 0; i < handLandmarks.length; i++) {
                const lm = handLandmarks[i];
                let spread = CONFIG.hand.fingerSegmentSpread;

                if (FINGERTIP_INDICES.includes(i)) {
                    spread = CONFIG.hand.fingertipSpread;
                } else if (i === WRIST_INDEX || (i >= 1 && i <= 4)) {
                    spread = CONFIG.hand.palmSpread;
                } else if ([5, 9, 13, 17].includes(i)) {
                    spread = CONFIG.hand.palmSpread * 0.8;
                }

                landmarks.push({
                    x: (1 - lm.x) * this.canvasWidth,
                    y: lm.y * this.canvasHeight,
                    spread: spread,
                    weight: CONFIG.hand.landmarkWeight,
                    type: 'hand',
                    isEdge: HAND_EDGE_INDICES.includes(i),
                    index: i,
                    handId: handId
                });
            }
            handId++;
        }
    }

    /**
     * Process face landmarks
     */
    _processFace(faceResults, landmarks) {
        if (!faceResults?.multiFaceLandmarks) return;
        
        const FACE_OVAL_INDICES = FACE_LANDMARKS.faceOval;
        const {
            LEFT_EYE_CENTER,
            RIGHT_EYE_CENTER,
            NOSE_BRIDGE,
            UPPER_LIP_CENTER,
            LOWER_LIP_CENTER,
            LEFT_MOUTH_CORNER,
            RIGHT_MOUTH_CORNER
        } = FACE_FEATURE_INDICES;

        for (const faceLandmarks of faceResults.multiFaceLandmarks) {
            for (let i = 0; i < faceLandmarks.length; i++) {
                const lm = faceLandmarks[i];
                let spread = CONFIG.face.spread;
                let depthBoost = 1.0;

                // Apply depth boost for certain features
                if (DEPTH_LANDMARKS.nose.includes(i)) {
                    depthBoost = CONFIG.face.noseBoost;
                } else if (DEPTH_LANDMARKS.cheekbones.includes(i)) {
                    depthBoost = CONFIG.face.cheekBoost;
                } else if (DEPTH_LANDMARKS.eyeSockets.includes(i)) {
                    depthBoost = CONFIG.face.eyeSocketBoost;
                }
                
                // Determine feature type for special landmarks
                let feature = null;
                if (i === LEFT_EYE_CENTER) feature = 'leftEye';
                else if (i === RIGHT_EYE_CENTER) feature = 'rightEye';
                else if (i === NOSE_BRIDGE) feature = 'noseBridge';
                else if (i === UPPER_LIP_CENTER) feature = 'upperLip';
                else if (i === LOWER_LIP_CENTER) feature = 'lowerLip';
                else if (i === LEFT_MOUTH_CORNER) feature = 'leftMouth';
                else if (i === RIGHT_MOUTH_CORNER) feature = 'rightMouth';
                else if (FACE_LANDMARKS.lips.includes(i)) feature = 'lips';

                landmarks.push({
                    x: (1 - lm.x) * this.canvasWidth,
                    y: lm.y * this.canvasHeight,
                    z: (lm.z || 0) * depthBoost,
                    spread: spread,
                    weight: CONFIG.face.landmarkWeight * depthBoost,
                    type: 'face',
                    isEdge: FACE_OVAL_INDICES.includes(i),
                    faceOvalOrder: FACE_OVAL_INDICES.indexOf(i),
                    feature: feature,
                    index: i
                });
            }
        }
    }

    /**
     * Check if hands are detected
     */
    hasHands(handResults) {
        return handResults?.multiHandLandmarks?.length > 0;
    }

    /**
     * Check if face is detected
     */
    hasFace(faceResults) {
        return faceResults?.multiFaceLandmarks?.length > 0;
    }
}
