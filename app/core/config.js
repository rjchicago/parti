/**
 * Configuration constants for PARTi
 */

export const CONFIG = {
    hand: {
        fingertipSpread: 3,
        fingerSegmentSpread: 8,
        palmSpread: 15,
        landmarkWeight: 1.0
    },
    face: {
        spread: 1.5,
        noseBoost: 1.5,
        cheekBoost: 1.2,
        eyeSocketBoost: 1.4,
        landmarkWeight: 1.0
    }
};

// Hand skeleton connections for drawing
export const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
];

// Hand landmark indices
export const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
export const WRIST_INDEX = 0;
export const HAND_EDGE_INDICES = [0, 4, 8, 12, 16, 20];

// Face mesh landmark groups
export const FACE_LANDMARKS = {
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61],
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]
};

// Depth-enhanced landmarks for 3D effect
export const DEPTH_LANDMARKS = {
    nose: [1, 2, 98, 327, 4, 5, 195, 197, 6, 168],
    cheekbones: [116, 123, 147, 187, 207, 213, 345, 352, 376, 411, 427, 433],
    eyeSockets: [33, 133, 362, 263, 159, 145, 386, 374]
};

// Special face landmark indices
export const FACE_FEATURE_INDICES = {
    LEFT_EYE_CENTER: 159,
    RIGHT_EYE_CENTER: 386,
    NOSE_BRIDGE: 6,
    UPPER_LIP_CENTER: 13,
    LOWER_LIP_CENTER: 14,
    LEFT_MOUTH_CORNER: 61,
    RIGHT_MOUTH_CORNER: 291
};

// Mode order for UI display and cycling
// To add a new mode: 1) Create the mode class, 2) Add to modeRegistry, 3) Add name here
export const MODE_ORDER = [
    'party',
    'repel',
    'attract',
    'gravity',
    'rain',
    'snow',
    'galactic',
    'matrix',
    'sketch'
];
