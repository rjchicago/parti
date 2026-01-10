// ===== Parti - Particle Face & Hand Tracker =====

import { ParticleSystem, THEME_NAMES } from './ParticleSystem.js';

// ===== Configuration =====
const CONFIG = {
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

// Hand skeleton connections
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const WRIST_INDEX = 0;

// Face mesh landmark groups
const FACE_LANDMARKS = {
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61],
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]
};

// Depth-enhanced landmarks
const DEPTH_LANDMARKS = {
    nose: [1, 2, 98, 327, 4, 5, 195, 197, 6, 168],
    cheekbones: [116, 123, 147, 187, 207, 213, 345, 352, 376, 411, 427, 433],
    eyeSockets: [33, 133, 362, 263, 159, 145, 386, 374]
};

// ===== Local Storage =====
const STORAGE_KEY = 'parti-settings';

const DEFAULT_SETTINGS = {
    mode: 'party',
    theme: 0,
    particleCount: new Date().getFullYear(),
    fistAction: 'none',
    cameraVisible: false,
    maskVisible: true
};

function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
    try {
        const settings = {
            mode: state.mode,
            theme: particleSystem?.currentTheme ?? 0,
            particleCount: particleSystem?.getCount() ?? DEFAULT_SETTINGS.particleCount,
            fistAction: state.fistAction,
            cameraVisible: state.cameraVisible,
            maskVisible: state.maskVisible
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save settings:', e);
    }
}

function resetSettings() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

// ===== Global State =====
let state = {
    mode: DEFAULT_SETTINGS.mode,
    cameraVisible: DEFAULT_SETTINGS.cameraVisible,
    maskVisible: DEFAULT_SETTINGS.maskVisible,
    fistAction: DEFAULT_SETTINGS.fistAction,
    isRunning: false,
    paused: false,
    handResults: null,
    faceResults: null,
    lastFistTime: 0,
    fistCooldown: 500
};

// DOM Elements
let introScreen, app, particleCanvas;
let cameraFeed, overlayCanvas, overlayCtx;
let statusIndicator, statusDot, statusText;
let attractBtn, repelBtn, rainBtn, snowBtn, partyBtn, galacticBtn, matrixBtn, themeSelect;
let particleCountEl, cameraPreviewContainer, fistActionSelect;

// Core systems
let particleSystem;
let hands, faceMesh, camera;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Cache DOM elements
    introScreen = document.getElementById('intro-screen');
    app = document.getElementById('app');
    particleCanvas = document.getElementById('particle-canvas');
    cameraFeed = document.getElementById('camera-feed');
    overlayCanvas = document.getElementById('overlay-canvas');
    overlayCtx = overlayCanvas.getContext('2d');
    statusIndicator = document.getElementById('status-indicator');
    statusDot = statusIndicator.querySelector('.status-dot');
    statusText = statusIndicator.querySelector('.status-text');
    attractBtn = document.getElementById('attract-btn');
    repelBtn = document.getElementById('repel-btn');
    rainBtn = document.getElementById('rain-btn');
    snowBtn = document.getElementById('snow-btn');
    partyBtn = document.getElementById('party-btn');
    galacticBtn = document.getElementById('galactic-btn');
    matrixBtn = document.getElementById('matrix-btn');
    themeSelect = document.getElementById('theme-select');
    particleCountEl = document.getElementById('active-particles');
    cameraPreviewContainer = document.getElementById('camera-preview-container');
    fistActionSelect = document.getElementById('fist-action');

    // Setup event listeners
    document.getElementById('enable-camera-btn').addEventListener('click', startApp);
    attractBtn.addEventListener('click', () => setMode('attract'));
    repelBtn.addEventListener('click', () => setMode('repel'));
    rainBtn.addEventListener('click', () => setMode('rain'));
    snowBtn.addEventListener('click', () => setMode('snow'));
    partyBtn.addEventListener('click', () => setMode('party'));
    galacticBtn.addEventListener('click', () => setMode('galactic'));
    matrixBtn.addEventListener('click', () => setMode('matrix'));
    themeSelect.addEventListener('change', (e) => setTheme(parseInt(e.target.value)));
    fistActionSelect.addEventListener('change', (e) => { 
        state.fistAction = e.target.value;
        saveSettings();
    });
    
    // Reset link
    const resetLink = document.getElementById('reset-settings');
    if (resetLink) {
        resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetSettings();
        });
    }

    // Load saved settings and apply to UI
    const savedSettings = loadSettings();
    state.mode = savedSettings.mode;
    state.fistAction = savedSettings.fistAction;
    state.cameraVisible = savedSettings.cameraVisible;
    state.maskVisible = savedSettings.maskVisible;
    
    // Update dropdowns to match saved settings
    themeSelect.value = savedSettings.theme;
    fistActionSelect.value = savedSettings.fistAction;

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('keyup', handleKeyUp);

    // Canvas resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Detect wake from sleep - check if camera is still valid
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Create intro particles
    createIntroParticles();
}

function createIntroParticles() {
    const container = document.getElementById('intro-particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: ${['#00f5ff', '#ff00ff', '#ffd700'][Math.floor(Math.random() * 3)]};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.2};
            animation: float ${Math.random() * 10 + 5}s ease-in-out infinite;
            animation-delay: ${Math.random() * -10}s;
        `;
        container.appendChild(particle);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.2); }
            50% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(0.8); }
            75% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.1); }
        }
    `;
    document.head.appendChild(style);
}

async function startApp() {
    const btn = document.getElementById('enable-camera-btn');
    btn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Loading...</span>';
    btn.disabled = true;

    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' }
        });
        cameraFeed.srcObject = stream;
        await cameraFeed.play();

        // Initialize MediaPipe
        await initMediaPipe();

        // Show app
        introScreen.classList.add('hidden');
        app.classList.remove('hidden');

        // Initialize particle system with saved settings
        const savedSettings = loadSettings();
        particleSystem = new ParticleSystem(particleCanvas, {
            minParticles: savedSettings.particleCount,
            maxParticles: savedSettings.particleCount
        });
        particleSystem.init();
        particleSystem.setTheme(savedSettings.theme);
        particleSystem.setMode(savedSettings.mode);
        particleSystem.setMaskVisible(savedSettings.maskVisible);
        
        // Apply saved mode to UI
        setMode(savedSettings.mode);
        
        // Apply camera visibility
        cameraPreviewContainer.style.display = savedSettings.cameraVisible ? 'block' : 'none';

        // Start animation loop
        state.isRunning = true;
        requestAnimationFrame(animate);

        updateStatus('Show your hands 👋', 'active');
    } catch (error) {
        console.error('Failed to start:', error);
        btn.innerHTML = '<span class="btn-icon">❌</span><span class="btn-text">Camera Error</span>';
        btn.disabled = false;
    }
}

async function initMediaPipe() {
    // Initialize Hands
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onHandResults);

    // Initialize FaceMesh
    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);

    // Start camera processing
    camera = new Camera(cameraFeed, {
        onFrame: async () => {
            await hands.send({ image: cameraFeed });
            await faceMesh.send({ image: cameraFeed });
        },
        width: 1280,
        height: 720
    });
    await camera.start();
}

// ===== MediaPipe Callbacks =====
function onHandResults(results) {
    state.handResults = results;

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            if (detectFist(landmarks)) {
                const now = Date.now();
                if (now - state.lastFistTime > state.fistCooldown) {
                    performFistAction();
                    state.lastFistTime = now;
                }
            }
        }
    }
}

function onFaceResults(results) {
    state.faceResults = results;
}

function detectFist(landmarks) {
    const fingertips = [8, 12, 16, 20];
    const knuckles = [5, 9, 13, 17];

    let closedFingers = 0;
    for (let i = 0; i < fingertips.length; i++) {
        if (landmarks[fingertips[i]].y > landmarks[knuckles[i]].y) {
            closedFingers++;
        }
    }

    if (landmarks[4].x > landmarks[3].x === landmarks[0].x < landmarks[9].x) {
        closedFingers++;
    }

    return closedFingers >= 4;
}

function performFistAction() {
    switch (state.fistAction) {
        case 'theme':
            cycleTheme();
            break;
        case 'mode':
            cycleMode();
            break;
        case 'camera':
            toggleCamera();
            break;
    }
}

// ===== Landmark Processing =====
function processLandmarks() {
    const landmarks = [];
    const canvasWidth = particleCanvas.width;
    const canvasHeight = particleCanvas.height;

    // Process hand landmarks
    // Edge landmarks: fingertips (4,8,12,16,20) and wrist (0)
    const HAND_EDGE_INDICES = [0, 4, 8, 12, 16, 20];
    
    if (state.handResults?.multiHandLandmarks) {
        let handId = 0;
        for (const handLandmarks of state.handResults.multiHandLandmarks) {
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
                    x: (1 - lm.x) * canvasWidth,
                    y: lm.y * canvasHeight,
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

    // Process face landmarks
    // Face oval indices define the outline
    const FACE_OVAL_INDICES = FACE_LANDMARKS.faceOval;
    
    // Eye center landmarks (approximate centers)
    const LEFT_EYE_CENTER = 159;  // Center of left eye
    const RIGHT_EYE_CENTER = 386; // Center of right eye
    const NOSE_BRIDGE = 6;        // Nose bridge between eyes (stable anchor)
    
    // Lip landmarks for animated mouth
    const UPPER_LIP_CENTER = 13;  // Top center of upper lip
    const LOWER_LIP_CENTER = 14;  // Bottom center of lower lip
    const LEFT_MOUTH_CORNER = 61;
    const RIGHT_MOUTH_CORNER = 291;
    
    
    if (state.faceResults?.multiFaceLandmarks) {
        for (const faceLandmarks of state.faceResults.multiFaceLandmarks) {
            for (let i = 0; i < faceLandmarks.length; i++) {
                const lm = faceLandmarks[i];
                let spread = CONFIG.face.spread;
                let depthBoost = 1.0;

                if (DEPTH_LANDMARKS.nose.includes(i)) {
                    depthBoost = CONFIG.face.noseBoost;
                } else if (DEPTH_LANDMARKS.cheekbones.includes(i)) {
                    depthBoost = CONFIG.face.cheekBoost;
                } else if (DEPTH_LANDMARKS.eyeSockets.includes(i)) {
                    depthBoost = CONFIG.face.eyeSocketBoost;
                }
                
                // Determine feature type
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
                    x: (1 - lm.x) * canvasWidth,
                    y: lm.y * canvasHeight,
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

    return landmarks;
}

function updateStatusFromDetections() {
    const hasHands = state.handResults?.multiHandLandmarks?.length > 0;
    const hasFace = state.faceResults?.multiFaceLandmarks?.length > 0;

    if (hasHands && hasFace) {
        updateStatus('Face + Hands detected', 'detecting');
    } else if (hasHands) {
        updateStatus('Hands detected 👋', 'detecting');
    } else if (hasFace) {
        updateStatus('Face detected', 'detecting');
    } else {
        updateStatus('Show your hands 👋', 'active');
    }
}

// ===== Overlay Drawing =====
function drawOverlays() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (state.handResults?.multiHandLandmarks) {
        state.handResults.multiHandLandmarks.forEach((landmarks, index) => {
            const color = index === 0 ? '#00f5ff' : '#ff00ff';
            drawHandSkeleton(landmarks, color);
        });
    }

    if (state.faceResults?.multiFaceLandmarks) {
        for (const landmarks of state.faceResults.multiFaceLandmarks) {
            drawFaceMesh(landmarks);
        }
    }
}

function drawHandSkeleton(landmarks, color) {
    overlayCtx.save();
    overlayCtx.scale(-1, 1);
    overlayCtx.translate(-overlayCanvas.width, 0);

    overlayCtx.strokeStyle = color;
    overlayCtx.lineWidth = 2;
    overlayCtx.shadowColor = color;
    overlayCtx.shadowBlur = 10;

    for (const [start, end] of HAND_CONNECTIONS) {
        const startLm = landmarks[start];
        const endLm = landmarks[end];

        overlayCtx.beginPath();
        overlayCtx.moveTo(startLm.x * overlayCanvas.width, startLm.y * overlayCanvas.height);
        overlayCtx.lineTo(endLm.x * overlayCanvas.width, endLm.y * overlayCanvas.height);
        overlayCtx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const isFingertip = FINGERTIP_INDICES.includes(i);
        const isWrist = i === WRIST_INDEX;
        const radius = isFingertip || isWrist ? 6 : 3;

        overlayCtx.beginPath();
        overlayCtx.arc(lm.x * overlayCanvas.width, lm.y * overlayCanvas.height, radius, 0, Math.PI * 2);
        overlayCtx.fillStyle = color;
        overlayCtx.fill();
    }

    overlayCtx.restore();
}

function drawFaceMesh(landmarks) {
    overlayCtx.save();
    overlayCtx.scale(-1, 1);
    overlayCtx.translate(-overlayCanvas.width, 0);
    overlayCtx.lineWidth = 1;

    // Eyes in teal
    overlayCtx.strokeStyle = '#00e5cc';
    overlayCtx.shadowColor = '#00e5cc';
    overlayCtx.shadowBlur = 5;
    drawLandmarkPath(FACE_LANDMARKS.leftEye, landmarks, true);
    drawLandmarkPath(FACE_LANDMARKS.rightEye, landmarks, true);

    // Lips in pink
    overlayCtx.strokeStyle = '#ff69b4';
    overlayCtx.shadowColor = '#ff69b4';
    drawLandmarkPath(FACE_LANDMARKS.lips, landmarks, true);

    // Face oval in cyan
    overlayCtx.strokeStyle = '#00f5ff';
    overlayCtx.shadowColor = '#00f5ff';
    overlayCtx.shadowBlur = 3;
    drawLandmarkPath(FACE_LANDMARKS.faceOval, landmarks, true);

    overlayCtx.restore();
}

function drawLandmarkPath(indices, landmarks, close = false) {
    if (indices.length < 2) return;

    overlayCtx.beginPath();
    overlayCtx.moveTo(
        landmarks[indices[0]].x * overlayCanvas.width,
        landmarks[indices[0]].y * overlayCanvas.height
    );

    for (let i = 1; i < indices.length; i++) {
        overlayCtx.lineTo(
            landmarks[indices[i]].x * overlayCanvas.width,
            landmarks[indices[i]].y * overlayCanvas.height
        );
    }

    if (close) overlayCtx.closePath();
    overlayCtx.stroke();
}

// ===== Animation Loop =====
function animate() {
    if (!state.isRunning) return;

    // Handle held arrow keys for particle count (even when paused)
    updateParticleCount();

    if (!state.paused) {
        // Process landmarks and update particle system
        const landmarks = processLandmarks();
        particleSystem.setLandmarks(landmarks);

        // Update status
        updateStatusFromDetections();

        // Update and render particles
        particleSystem.update();
        particleSystem.render();

        // Draw overlays on camera preview
        drawOverlays();

        // Update particle count display
        particleCountEl.textContent = particleSystem.getCount().toLocaleString();
    }

    requestAnimationFrame(animate);
}

// ===== UI Controls =====
function setMode(mode) {
    state.mode = mode;
    if (particleSystem) {
        particleSystem.setMode(mode);
        
        // Apply preset theme for this mode
        const presetTheme = particleSystem.currentMode.getPresetTheme();
        if (presetTheme !== null) {
            particleSystem.setTheme(presetTheme);
            themeSelect.value = presetTheme;
        }
    }

    attractBtn.classList.toggle('active', mode === 'attract');
    repelBtn.classList.toggle('active', mode === 'repel');
    rainBtn.classList.toggle('active', mode === 'rain');
    snowBtn.classList.toggle('active', mode === 'snow');
    partyBtn.classList.toggle('active', mode === 'party');
    galacticBtn.classList.toggle('active', mode === 'galactic');
    matrixBtn.classList.toggle('active', mode === 'matrix');
    
    saveSettings();
}

function cycleMode() {
    const modes = ['party', 'attract', 'repel', 'rain', 'snow', 'galactic', 'matrix'];
    const currentIndex = modes.indexOf(state.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
}

function setTheme(themeIndex) {
    particleSystem.setTheme(themeIndex);
    themeSelect.value = themeIndex;
    saveSettings();
}

function cycleTheme() {
    const newTheme = particleSystem.cycleTheme();
    themeSelect.value = newTheme;
}

function toggleCamera() {
    state.cameraVisible = !state.cameraVisible;
    cameraPreviewContainer.style.display = state.cameraVisible ? 'block' : 'none';
    saveSettings();
}

function togglePause() {
    state.paused = !state.paused;
    updateStatus(state.paused ? 'Paused' : 'Tracking', state.paused ? 'warning' : 'active');
}

function toggleMask() {
    state.maskVisible = !state.maskVisible;
    if (particleSystem) {
        particleSystem.setMaskVisible(state.maskVisible);
    }
    saveSettings();
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && state.isRunning) {
        // Check if camera stream is still active
        const videoTracks = cameraFeed.srcObject?.getVideoTracks() || [];
        const hasActiveTrack = videoTracks.some(track => track.readyState === 'live');
        
        if (!hasActiveTrack) {
            // Camera lost - return to intro screen
            returnToIntro();
        }
    }
}

function returnToIntro() {
    // Stop everything
    state.isRunning = false;
    
    // Stop camera
    if (cameraFeed.srcObject) {
        cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
    }
    
    // Show intro, hide app
    introScreen.classList.remove('hidden');
    app.classList.add('hidden');
    
    // Reset the button so user can try again
    const btn = document.getElementById('enable-camera-btn');
    btn.innerHTML = '<span class="btn-icon">📷</span><span class="btn-text">Enable Camera</span>';
    btn.disabled = false;
    
    updateStatus('Camera disconnected', 'error');
}

function updateStatus(text, statusClass) {
    statusText.textContent = text;
    statusDot.className = 'status-dot ' + statusClass;
}

// Track held keys for continuous particle adjustment with acceleration
const heldKeys = { 
    ArrowUp: false, 
    ArrowDown: false,
    ArrowUpStart: 0,
    ArrowDownStart: 0
};

function handleKeyboard(e) {
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            cycleMode();
            break;
        case 'KeyV':
            toggleCamera();
            break;
        case 'KeyT':
            cycleTheme();
            break;
        case 'KeyP':
            togglePause();
            break;
        case 'KeyM':
            toggleMask();
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (!heldKeys.ArrowUp) {
                heldKeys.ArrowUp = true;
                heldKeys.ArrowUpStart = performance.now();
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!heldKeys.ArrowDown) {
                heldKeys.ArrowDown = true;
                heldKeys.ArrowDownStart = performance.now();
            }
            break;
    }
}

function handleKeyUp(e) {
    if (e.code === 'ArrowUp') {
        heldKeys.ArrowUp = false;
        saveSettings(); // Save particle count when done adjusting
    }
    if (e.code === 'ArrowDown') {
        heldKeys.ArrowDown = false;
        saveSettings(); // Save particle count when done adjusting
    }
}

// Get rate multiplier based on hold duration
function getHoldMultiplier(startTime) {
    const holdDuration = (performance.now() - startTime) / 1000; // seconds
    if (holdDuration >= 5) return 100;  // 100x after 10s
    if (holdDuration >= 2) return 10;    // 10x after 3s
    return 1;                             // 1x base rate
}

// Called each frame to handle held keys
function updateParticleCount() {
    if (!particleSystem) return;
    
    const baseRate = 1; // 1 particle per frame at base speed
    
    if (heldKeys.ArrowUp) {
        const multiplier = getHoldMultiplier(heldKeys.ArrowUpStart);
        particleSystem.addParticles(baseRate * multiplier);
    }
    if (heldKeys.ArrowDown) {
        const multiplier = getHoldMultiplier(heldKeys.ArrowDownStart);
        particleSystem.removeParticles(baseRate * multiplier);
    }
}

function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;

    overlayCanvas.width = 256;
    overlayCanvas.height = 144;

    if (particleSystem) {
        particleSystem.resize();
    }
}
