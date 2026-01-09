// ===== Parti - Particle Face & Hand Tracker =====

// Golden ratio for organic distribution
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;

// ===== Configuration =====
const CONFIG = {
    particles: {
        min: 8000,
        max: 15000,
        baseSpeed: 2,
        attraction: 0.08,
        friction: 0.95,
        trailAlpha: 0.15,
        returnSpeed: 0.02
    },
    hand: {
        fingertipSpread: 3,
        fingerSegmentSpread: 8,
        palmSpread: 15,
        landmarkWeight: 1.0
    },
    face: {
        spread: 1.5,
        depthMultiplier: 1.3,
        noseBoost: 1.5,
        cheekBoost: 1.2,
        eyeSocketBoost: 1.4,
        landmarkWeight: 1.0
    }
};

// Color themes
const THEMES = {
    Rainbow: {
        colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
        glow: true
    },
    Fire: {
        colors: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#ffff00', '#ff6600'],
        glow: true
    },
    Ocean: {
        colors: ['#001a33', '#003366', '#004c99', '#0066cc', '#0099ff', '#00ccff', '#66ffff'],
        glow: true
    },
    Galaxy: {
        colors: ['#1a0033', '#330066', '#4d0099', '#6600cc', '#9933ff', '#cc66ff', '#ff99ff'],
        glow: true
    },
    Matrix: {
        colors: ['#003300', '#004400', '#006600', '#008800', '#00aa00', '#00cc00', '#00ff00'],
        glow: true
    }
};

const THEME_NAMES = Object.keys(THEMES);

// Hand skeleton connections
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]              // Palm
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const WRIST_INDEX = 0;

// Face mesh landmark groups
const FACE_LANDMARKS = {
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61],
    lipsInner: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
    nose: [1, 2, 98, 327, 168, 6, 197, 195, 5, 4, 1],
    leftEyebrow: [276, 283, 282, 295, 285],
    rightEyebrow: [46, 53, 52, 65, 55]
};

// Depth-enhanced landmarks (nose, cheekbones, eye sockets)
const DEPTH_LANDMARKS = {
    nose: [1, 2, 98, 327, 4, 5, 195, 197, 6, 168],
    cheekbones: [116, 123, 147, 187, 207, 213, 345, 352, 376, 411, 427, 433],
    eyeSockets: [33, 133, 362, 263, 159, 145, 386, 374]
};

// ===== Global State =====
let state = {
    mode: 'attract',
    currentTheme: 0,
    cameraVisible: true,
    isRunning: false,
    handResults: null,
    faceResults: null,
    lastFistTime: 0,
    fistCooldown: 500,
    particles: [],
    landmarks: [],
    canvasWidth: 0,
    canvasHeight: 0
};

// DOM Elements
let introScreen, app, particleCanvas, ctx;
let cameraFeed, overlayCanvas, overlayCtx;
let statusIndicator, statusDot, statusText;
let attractBtn, repelBtn, currentThemeEl;
let particleCountEl;
let cameraPreviewContainer;

// MediaPipe instances
let hands, faceMesh, camera;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Cache DOM elements
    introScreen = document.getElementById('intro-screen');
    app = document.getElementById('app');
    particleCanvas = document.getElementById('particle-canvas');
    ctx = particleCanvas.getContext('2d');
    cameraFeed = document.getElementById('camera-feed');
    overlayCanvas = document.getElementById('overlay-canvas');
    overlayCtx = overlayCanvas.getContext('2d');
    statusIndicator = document.getElementById('status-indicator');
    statusDot = statusIndicator.querySelector('.status-dot');
    statusText = statusIndicator.querySelector('.status-text');
    attractBtn = document.getElementById('attract-btn');
    repelBtn = document.getElementById('repel-btn');
    currentThemeEl = document.getElementById('current-theme');
    particleCountEl = document.getElementById('active-particles');
    cameraPreviewContainer = document.getElementById('camera-preview-container');

    // Setup event listeners
    document.getElementById('enable-camera-btn').addEventListener('click', startApp);
    attractBtn.addEventListener('click', () => setMode('attract'));
    repelBtn.addEventListener('click', () => setMode('repel'));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Canvas resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

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

    // Add float animation
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
    // Show loading state
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

        // Initialize particles
        initParticles();

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

function onHandResults(results) {
    state.handResults = results;
    
    // Check for fist gesture to cycle theme
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            if (detectFist(landmarks)) {
                const now = Date.now();
                if (now - state.lastFistTime > state.fistCooldown) {
                    cycleTheme();
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
    // Check if all fingertips are below their respective knuckles
    const fingertips = [8, 12, 16, 20];
    const knuckles = [5, 9, 13, 17];
    
    let closedFingers = 0;
    for (let i = 0; i < fingertips.length; i++) {
        if (landmarks[fingertips[i]].y > landmarks[knuckles[i]].y) {
            closedFingers++;
        }
    }
    
    // Also check thumb
    if (landmarks[4].x > landmarks[3].x === landmarks[0].x < landmarks[9].x) {
        closedFingers++;
    }
    
    return closedFingers >= 4;
}

// ===== Particle System =====
function initParticles() {
    const count = Math.floor(CONFIG.particles.min + Math.random() * (CONFIG.particles.max - CONFIG.particles.min));
    state.particles = [];
    
    for (let i = 0; i < count; i++) {
        state.particles.push(createParticle());
    }
}

function createParticle() {
    const theme = THEMES[THEME_NAMES[state.currentTheme]];
    const color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
    
    return {
        x: Math.random() * state.canvasWidth,
        y: Math.random() * state.canvasHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        baseX: Math.random() * state.canvasWidth,
        baseY: Math.random() * state.canvasHeight,
        size: Math.random() * 2.5 + 0.5,
        color: color,
        alpha: Math.random() * 0.5 + 0.5,
        targetX: null,
        targetY: null,
        targetSpread: 5
    };
}

function updateParticles() {
    // Collect all active landmarks
    const landmarks = [];
    
    // Process hand landmarks
    if (state.handResults?.multiHandLandmarks) {
        for (const handLandmarks of state.handResults.multiHandLandmarks) {
            for (let i = 0; i < handLandmarks.length; i++) {
                const lm = handLandmarks[i];
                let spread = CONFIG.hand.fingerSegmentSpread;
                
                // Tapered spread based on landmark type
                if (FINGERTIP_INDICES.includes(i)) {
                    spread = CONFIG.hand.fingertipSpread;
                } else if (i === WRIST_INDEX || (i >= 1 && i <= 4)) {
                    spread = CONFIG.hand.palmSpread;
                } else if ([5, 9, 13, 17].includes(i)) {
                    spread = CONFIG.hand.palmSpread * 0.8;
                }
                
                landmarks.push({
                    x: (1 - lm.x) * state.canvasWidth,
                    y: lm.y * state.canvasHeight,
                    spread: spread,
                    weight: CONFIG.hand.landmarkWeight
                });
            }
        }
    }
    
    // Process face landmarks
    if (state.faceResults?.multiFaceLandmarks) {
        for (const faceLandmarks of state.faceResults.multiFaceLandmarks) {
            for (let i = 0; i < faceLandmarks.length; i++) {
                const lm = faceLandmarks[i];
                let spread = CONFIG.face.spread;
                let depthBoost = 1.0;
                
                // Apply depth boost for specific features
                if (DEPTH_LANDMARKS.nose.includes(i)) {
                    depthBoost = CONFIG.face.noseBoost;
                } else if (DEPTH_LANDMARKS.cheekbones.includes(i)) {
                    depthBoost = CONFIG.face.cheekBoost;
                } else if (DEPTH_LANDMARKS.eyeSockets.includes(i)) {
                    depthBoost = CONFIG.face.eyeSocketBoost;
                }
                
                landmarks.push({
                    x: (1 - lm.x) * state.canvasWidth,
                    y: lm.y * state.canvasHeight,
                    z: (lm.z || 0) * depthBoost,
                    spread: spread,
                    weight: CONFIG.face.landmarkWeight * depthBoost
                });
            }
        }
    }
    
    state.landmarks = landmarks;
    
    // Update status based on detections
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
    
    // Distribute particles to landmarks using golden ratio
    const particleCount = state.particles.length;
    const landmarkCount = landmarks.length;
    
    if (landmarkCount > 0) {
        for (let i = 0; i < particleCount; i++) {
            const particle = state.particles[i];
            
            // Use golden ratio for distribution
            const angle = i * PHI * Math.PI * 2;
            const landmarkIndex = Math.floor((i * PHI_INV * landmarkCount) % landmarkCount);
            const target = landmarks[landmarkIndex];
            
            // Add spread based on golden ratio spiral
            const spiralR = Math.sqrt(i / particleCount) * target.spread;
            const offsetX = Math.cos(angle) * spiralR;
            const offsetY = Math.sin(angle) * spiralR;
            
            particle.targetX = target.x + offsetX;
            particle.targetY = target.y + offsetY;
            particle.targetSpread = target.spread;
        }
    } else {
        // No landmarks - particles wander
        for (const particle of state.particles) {
            particle.targetX = null;
            particle.targetY = null;
        }
    }
    
    // Physics update
    const attraction = CONFIG.particles.attraction * (state.mode === 'repel' ? -1 : 1);
    
    for (const particle of state.particles) {
        if (particle.targetX !== null) {
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                particle.vx += (dx / dist) * attraction * Math.min(dist * 0.1, 10);
                particle.vy += (dy / dist) * attraction * Math.min(dist * 0.1, 10);
            }
        } else {
            // Return to base position
            particle.vx += (particle.baseX - particle.x) * CONFIG.particles.returnSpeed;
            particle.vy += (particle.baseY - particle.y) * CONFIG.particles.returnSpeed;
        }
        
        // Apply friction
        particle.vx *= CONFIG.particles.friction;
        particle.vy *= CONFIG.particles.friction;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = state.canvasWidth;
        if (particle.x > state.canvasWidth) particle.x = 0;
        if (particle.y < 0) particle.y = state.canvasHeight;
        if (particle.y > state.canvasHeight) particle.y = 0;
    }
}

function renderParticles() {
    // Clear with trail effect
    ctx.fillStyle = `rgba(5, 5, 8, ${1 - CONFIG.particles.trailAlpha})`;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    
    const theme = THEMES[THEME_NAMES[state.currentTheme]];
    
    // Render particles
    for (const particle of state.particles) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Update particle count display
    particleCountEl.textContent = state.particles.length.toLocaleString();
}

// ===== Overlay Drawing =====
function drawOverlays() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    const scaleX = overlayCanvas.width / 1280;
    const scaleY = overlayCanvas.height / 720;
    
    // Draw hand overlays
    if (state.handResults?.multiHandLandmarks) {
        state.handResults.multiHandLandmarks.forEach((landmarks, index) => {
            const color = index === 0 ? '#00f5ff' : '#ff00ff';
            drawHandSkeleton(landmarks, color, scaleX, scaleY);
        });
    }
    
    // Draw face overlays
    if (state.faceResults?.multiFaceLandmarks) {
        for (const landmarks of state.faceResults.multiFaceLandmarks) {
            drawFaceMesh(landmarks, scaleX, scaleY);
        }
    }
}

function drawHandSkeleton(landmarks, color, scaleX, scaleY) {
    overlayCtx.save();
    overlayCtx.scale(-1, 1);
    overlayCtx.translate(-overlayCanvas.width, 0);
    
    // Draw connections with glow
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
    
    // Draw landmarks
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

function drawFaceMesh(landmarks, scaleX, scaleY) {
    overlayCtx.save();
    overlayCtx.scale(-1, 1);
    overlayCtx.translate(-overlayCanvas.width, 0);
    overlayCtx.lineWidth = 1;
    
    // Draw eyes in teal
    overlayCtx.strokeStyle = '#00e5cc';
    overlayCtx.shadowColor = '#00e5cc';
    overlayCtx.shadowBlur = 5;
    drawLandmarkPath(FACE_LANDMARKS.leftEye, landmarks, true);
    drawLandmarkPath(FACE_LANDMARKS.rightEye, landmarks, true);
    
    // Draw lips in pink
    overlayCtx.strokeStyle = '#ff69b4';
    overlayCtx.shadowColor = '#ff69b4';
    drawLandmarkPath(FACE_LANDMARKS.lips, landmarks, true);
    
    // Draw face oval in cyan
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
    
    updateParticles();
    renderParticles();
    drawOverlays();
    
    requestAnimationFrame(animate);
}

// ===== UI Controls =====
function setMode(mode) {
    state.mode = mode;
    
    attractBtn.classList.toggle('active', mode === 'attract');
    repelBtn.classList.toggle('active', mode === 'repel');
}

function cycleTheme() {
    state.currentTheme = (state.currentTheme + 1) % THEME_NAMES.length;
    const themeName = THEME_NAMES[state.currentTheme];
    currentThemeEl.textContent = themeName;
    
    // Update particle colors
    const theme = THEMES[themeName];
    for (const particle of state.particles) {
        particle.color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
    }
}

function toggleCamera() {
    state.cameraVisible = !state.cameraVisible;
    cameraPreviewContainer.style.display = state.cameraVisible ? 'block' : 'none';
}

function updateStatus(text, statusClass) {
    statusText.textContent = text;
    statusDot.className = 'status-dot ' + statusClass;
}

function handleKeyboard(e) {
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            setMode(state.mode === 'attract' ? 'repel' : 'attract');
            break;
        case 'KeyV':
            toggleCamera();
            break;
        case 'KeyT':
            cycleTheme();
            break;
    }
}

function resizeCanvas() {
    state.canvasWidth = window.innerWidth;
    state.canvasHeight = window.innerHeight;
    
    particleCanvas.width = state.canvasWidth;
    particleCanvas.height = state.canvasHeight;
    
    overlayCanvas.width = 256;
    overlayCanvas.height = 144;
    
    // Update particle base positions
    for (const particle of state.particles) {
        particle.baseX = Math.random() * state.canvasWidth;
        particle.baseY = Math.random() * state.canvasHeight;
    }
}
