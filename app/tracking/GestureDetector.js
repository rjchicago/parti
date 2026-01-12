/**
 * GestureDetector - Detects hand gestures like fist, pointing, open hand
 */

export class GestureDetector {
    /**
     * Detect if hand is making a fist
     */
    static detectFist(landmarks) {
        const fingertips = [8, 12, 16, 20];
        const knuckles = [5, 9, 13, 17];

        let closedFingers = 0;
        for (let i = 0; i < fingertips.length; i++) {
            if (landmarks[fingertips[i]].y > landmarks[knuckles[i]].y) {
                closedFingers++;
            }
        }

        // Check thumb
        if (landmarks[4].x > landmarks[3].x === landmarks[0].x < landmarks[9].x) {
            closedFingers++;
        }

        return closedFingers >= 4;
    }

    /**
     * Detect if only index finger is extended (pointing gesture)
     */
    static detectPointing(landmarks) {
        const indexTip = landmarks[8];
        const indexKnuckle = landmarks[6];
        const isIndexUp = indexTip.y < indexKnuckle.y;
        
        const middleTip = landmarks[12];
        const middleKnuckle = landmarks[10];
        const ringTip = landmarks[16];
        const ringKnuckle = landmarks[14];
        const pinkyTip = landmarks[20];
        const pinkyKnuckle = landmarks[18];
        
        const isMiddleDown = middleTip.y >= middleKnuckle.y;
        const isRingDown = ringTip.y >= ringKnuckle.y;
        const isPinkyDown = pinkyTip.y >= pinkyKnuckle.y;
        
        return isIndexUp && isMiddleDown && isRingDown && isPinkyDown;
    }

    /**
     * Detect open hand (all fingers extended)
     */
    static detectOpenHand(landmarks) {
        const fingertips = [8, 12, 16, 20];
        const knuckles = [6, 10, 14, 18];

        let extendedFingers = 0;
        for (let i = 0; i < fingertips.length; i++) {
            if (landmarks[fingertips[i]].y < landmarks[knuckles[i]].y) {
                extendedFingers++;
            }
        }

        return extendedFingers >= 4;
    }
}
