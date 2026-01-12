/**
 * PARTi - Particle Face & Hand Tracker
 * Main entry point - orchestrates all modules
 */

import { stateManager, MODE_ORDER } from './core/index.js';
import { MediaPipeManager } from './core/MediaPipeManager.js';
import { LandmarkProcessor, OverlayRenderer, GestureDetector } from './tracking/index.js';
import { ParticleSystem, THEME_NAMES } from './ParticleSystem.js';
import { modeRegistry } from './modes/index.js';

// ===== DOM Elements =====
const elements = {};

// ===== Core Systems =====
let mediaPipe = null;
let landmarkProcessor = null;
let overlayRenderer = null;
let particleSystem = null;

// ===== Key Tracking =====
const heldKeys = { 
    ArrowLeft: false, 
    ArrowRight: false,
    ArrowLeftStart: 0,
    ArrowRightStart: 0
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheElements();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderModeButtons();
    setupEventListeners();
    
    // Load saved settings
    stateManager.load();
    applySettingsToUI();
    
    showLayoutIndicator();
    
    // Create intro particles
    createIntroParticles();
}

/**
 * Dynamically render mode buttons from modeRegistry
 */
/**
 * Get available modes for current platform
 */
function getAvailableModes() {
    const isMobile = stateManager.get('mobileLayout');
    return MODE_ORDER.filter(key => {
        const mode = modeRegistry[key];
        return isMobile ? mode.supportsMobile : mode.supportsDesktop;
    });
}

function renderModeButtons() {
    if (!elements.modeControls) return;
    
    const currentMode = stateManager.get('mode');
    const availableModes = getAvailableModes();
    
    elements.modeControls.innerHTML = availableModes.map(key => {
        const mode = modeRegistry[key];
        const isActive = key === currentMode ? ' active' : '';
        return `<button class="mode-btn${isActive}" data-mode="${mode.name}">
            <i data-lucide="${mode.icon}" class="mode-icon"></i>
            <span class="mode-label">${mode.label}</span>
        </button>`;
    }).join('');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function cacheElements() {
    elements.introScreen = document.getElementById('intro-screen');
    elements.app = document.getElementById('app');
    elements.particleCanvas = document.getElementById('particle-canvas');
    elements.cameraFeed = document.getElementById('camera-feed');
    elements.overlayCanvas = document.getElementById('overlay-canvas');
    elements.statusIndicator = document.getElementById('status-indicator');
    elements.statusDot = elements.statusIndicator?.querySelector('.status-dot');
    elements.statusText = elements.statusIndicator?.querySelector('.status-text');
    elements.particleCountEl = document.getElementById('active-particles');
    elements.cameraPreviewContainer = document.getElementById('camera-preview-container');
    
    // Buttons
    elements.enableCameraBtn = document.getElementById('enable-camera-btn');
    elements.modeControls = document.getElementById('mode-controls');
    
    // Selects
    elements.themeSelect = document.getElementById('theme-select');
    elements.fistActionSelect = document.getElementById('fist-action');
    
    // Modal
    elements.settingsLink = document.getElementById('settings-link');
    elements.settingsModal = document.getElementById('settings-modal');
    elements.closeSettings = document.getElementById('close-settings');
    elements.resetLink = document.getElementById('reset-settings');
    elements.shortcutsPanel = document.getElementById('shortcuts-panel');
    elements.layoutIndicator = document.getElementById('layout-indicator');
    elements.helpBtn = document.getElementById('help-btn');
    elements.particleCount = document.getElementById('particle-count');
    elements.pauseOverlay = document.getElementById('pause-overlay');
}

function setupEventListeners() {
    // Enable camera button
    elements.enableCameraBtn?.addEventListener('click', startApp);
    
    // Mode buttons (event delegation)
    elements.modeControls?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (btn) {
            setMode(btn.dataset.mode);
        }
    });
    
    // Selects
    elements.themeSelect?.addEventListener('change', (e) => setTheme(parseInt(e.target.value)));
    elements.fistActionSelect?.addEventListener('change', (e) => {
        stateManager.set('fistAction', e.target.value, true);
    });
    
    // Settings modal
    elements.settingsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        elements.settingsModal.style.display = 'flex';
    });
    elements.closeSettings?.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });
    elements.settingsModal?.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.style.display = 'none';
        }
    });
    elements.resetLink?.addEventListener('click', (e) => {
        e.preventDefault();
        stateManager.reset();
    });
    
    // Help button (toggle display)
    elements.helpBtn?.addEventListener('click', toggleDisplay);
    
    // BrickBreaker display auto-hide events
    window.addEventListener('brickbreaker:hideDisplay', handleBrickBreakerHideDisplay);
    window.addEventListener('brickbreaker:showDisplay', handleBrickBreakerShowDisplay);
    
    // Keyboard
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    
    // Canvas click (for modes that need it, like BrickBreaker)
    elements.particleCanvas?.addEventListener('click', handleCanvasClick);
    
    // Resize
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Visibility change (wake from sleep)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function applySettingsToUI() {
    elements.themeSelect.value = stateManager.get('theme');
    elements.fistActionSelect.value = stateManager.get('fistAction');
}

function showLayoutIndicator() {
    if (elements.layoutIndicator) {
        const isMobile = stateManager.get('mobileLayout');
        elements.layoutIndicator.textContent = `Layout: ${isMobile ? 'Mobile' : 'Desktop'}`;
    }
}

// ===== App Startup =====
async function startApp() {
    const btn = elements.enableCameraBtn;
    btn.innerHTML = '<i data-lucide="loader" class="btn-icon spin"></i><span class="btn-text">Loading...</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    btn.disabled = true;

    try {
        // Initialize processors
        landmarkProcessor = new LandmarkProcessor();
        overlayRenderer = new OverlayRenderer(elements.overlayCanvas);
        
        // Initialize MediaPipe
        mediaPipe = new MediaPipeManager(elements.cameraFeed);
        mediaPipe.onHandResults(onHandResults);
        mediaPipe.onFaceResults(onFaceResults);
        
        await mediaPipe.init();
        await mediaPipe.startCamera();

        // Show app
        elements.introScreen.classList.add('hidden');
        elements.app.classList.remove('hidden');
        
        // Apply display visibility (UI hidden by default)
        applyDisplay();

        // Initialize particle system
        const particleCount = stateManager.get('particleCount');
        particleSystem = new ParticleSystem(elements.particleCanvas, {
            minParticles: particleCount,
            maxParticles: particleCount
        });
        particleSystem.init();
        particleSystem.setTheme(stateManager.get('theme'));
        
        // Apply mode - fallback if saved mode doesn't exist or isn't available on this platform
        let savedMode = stateManager.get('mode');
        const availableModes = getAvailableModes();
        if (!modeRegistry[savedMode] || !availableModes.includes(savedMode)) {
            savedMode = availableModes[0] || 'party';
            stateManager.set('mode', savedMode, true);
        }
        particleSystem.setMode(savedMode);
        particleSystem.setMaskVisible(stateManager.get('maskVisible'));
        
        // Apply mode to UI
        setMode(savedMode);
        
        // Apply camera visibility
        elements.cameraPreviewContainer.style.display = 
            stateManager.get('cameraVisible') ? 'block' : 'none';

        // Start animation loop
        stateManager.set('isRunning', true);
        requestAnimationFrame(animate);

        updateStatus('Show your hands 👋', 'active');
    } catch (error) {
        console.error('Failed to start:', error);
        btn.innerHTML = '<span class="btn-icon">❌</span><span class="btn-text">Camera Error</span>';
        btn.disabled = false;
    }
}

// ===== MediaPipe Callbacks =====
function onHandResults(results) {
    stateManager.set('handResults', results);

    // Check for fist gesture
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            if (GestureDetector.detectFist(landmarks)) {
                const now = Date.now();
                if (now - stateManager.get('lastFistTime') > stateManager.get('fistCooldown')) {
                    performFistAction();
                    stateManager.set('lastFistTime', now);
                }
            }
        }
    }
}

function onFaceResults(results) {
    stateManager.set('faceResults', results);
}

function performFistAction() {
    switch (stateManager.get('fistAction')) {
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

// ===== Animation Loop =====
function animate() {
    if (!stateManager.get('isRunning')) return;

    updateParticleCount();

    if (!stateManager.get('paused')) {
        const handResults = stateManager.get('handResults');
        const faceResults = stateManager.get('faceResults');
        
        // Process landmarks
        landmarkProcessor.setCanvasSize(
            elements.particleCanvas.width,
            elements.particleCanvas.height
        );
        const landmarks = landmarkProcessor.process(handResults, faceResults);
        particleSystem.setLandmarks(landmarks);

        // Update status
        updateStatusFromDetections(handResults, faceResults);

        // Update and render
        particleSystem.update();
        particleSystem.render();

        // Draw camera overlays
        overlayRenderer.draw(handResults, faceResults);

        // Update particle count display
        elements.particleCountEl.textContent = particleSystem.getCount().toLocaleString();
    }

    requestAnimationFrame(animate);
}

function updateStatusFromDetections(handResults, faceResults) {
    const hasHands = landmarkProcessor.hasHands(handResults);
    const hasFace = landmarkProcessor.hasFace(faceResults);

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

// ===== UI Controls =====
function setMode(mode) {
    // Clear any soft display override from previous mode
    if (stateManager.get('displayOverrideHidden')) {
        stateManager.set('displayOverrideHidden', false);
        applyDisplay();
    }
    
    stateManager.set('mode', mode, true);
    
    if (particleSystem) {
        particleSystem.setMode(mode);
        
        const presetTheme = particleSystem.currentMode.getPresetTheme();
        if (presetTheme !== null) {
            particleSystem.setTheme(presetTheme);
            elements.themeSelect.value = presetTheme;
        }
    }

    // Update button states
    elements.modeControls?.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

function cycleMode() {
    const availableModes = getAvailableModes();
    const currentIndex = availableModes.indexOf(stateManager.get('mode'));
    const nextMode = availableModes[(currentIndex + 1) % availableModes.length];
    setMode(nextMode);
}

function cycleModeUp() {
    const availableModes = getAvailableModes();
    const currentIndex = availableModes.indexOf(stateManager.get('mode'));
    const prevMode = availableModes[(currentIndex - 1 + availableModes.length) % availableModes.length];
    setMode(prevMode);
}

function setTheme(themeIndex) {
    stateManager.set('theme', themeIndex, true);
    particleSystem?.setTheme(themeIndex);
    elements.themeSelect.value = themeIndex;
}

function cycleTheme() {
    const newTheme = particleSystem?.cycleTheme();
    if (newTheme !== undefined) {
        elements.themeSelect.value = newTheme;
        stateManager.set('theme', newTheme, true);
    }
}

function toggleCamera() {
    const visible = !stateManager.get('cameraVisible');
    stateManager.set('cameraVisible', visible, true);
    elements.cameraPreviewContainer.style.display = visible ? 'block' : 'none';
}

function togglePause() {
    const paused = !stateManager.get('paused');
    stateManager.set('paused', paused);
    updateStatus(paused ? 'Paused' : 'Tracking', paused ? 'warning' : 'active');
    
    // Show/hide pause overlay (always visible when paused, regardless of display setting)
    if (elements.pauseOverlay) {
        elements.pauseOverlay.classList.toggle('hidden', !paused);
    }
}

function toggleMask() {
    const visible = !stateManager.get('maskVisible');
    stateManager.set('maskVisible', visible, true);
    particleSystem?.setMaskVisible(visible);
}

function toggleDisplay() {
    const visible = !stateManager.get('displayVisible');
    stateManager.set('displayVisible', visible, true); // Persist to localStorage
    applyDisplay();
}

function applyDisplay() {
    // Display is visible if user wants it AND not soft-hidden by a mode
    const userWantsVisible = stateManager.get('displayVisible');
    const softHidden = stateManager.get('displayOverrideHidden');
    const visible = userWantsVisible && !softHidden;
    
    const hideStyle = visible ? '' : 'none';
    const showStyle = visible ? 'none' : '';
    
    // Hide/show UI elements
    if (elements.shortcutsPanel) elements.shortcutsPanel.style.display = hideStyle;
    if (elements.modeControls) elements.modeControls.style.display = hideStyle;
    if (elements.particleCount) elements.particleCount.style.display = hideStyle;
    if (elements.settingsLink) elements.settingsLink.style.display = hideStyle;
    if (elements.statusIndicator) elements.statusIndicator.style.display = hideStyle;
    
    // Show/hide help button (inverse of other elements)
    if (elements.helpBtn) elements.helpBtn.style.display = showStyle;
}

// BrickBreaker display soft-hide (doesn't affect user preference)
function handleBrickBreakerHideDisplay() {
    stateManager.set('displayOverrideHidden', true);
    applyDisplay();
}

function handleBrickBreakerShowDisplay() {
    stateManager.set('displayOverrideHidden', false);
    applyDisplay();
}

function updateStatus(text, statusClass) {
    if (elements.statusText) elements.statusText.textContent = text;
    if (elements.statusDot) elements.statusDot.className = 'status-dot ' + statusClass;
}

// ===== Keyboard Handling =====
function handleKeydown(e) {
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
        case 'KeyD':
            toggleDisplay();
            break;
        case 'ArrowUp':
            e.preventDefault();
            cycleModeUp();
            break;
        case 'ArrowDown':
            e.preventDefault();
            cycleMode();
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!heldKeys.ArrowRight) {
                heldKeys.ArrowRight = true;
                heldKeys.ArrowRightStart = performance.now();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (!heldKeys.ArrowLeft) {
                heldKeys.ArrowLeft = true;
                heldKeys.ArrowLeftStart = performance.now();
            }
            break;
    }
}

function handleKeyup(e) {
    if (e.code === 'ArrowRight') {
        heldKeys.ArrowRight = false;
        stateManager.set('particleCount', particleSystem?.getCount(), true);
    }
    if (e.code === 'ArrowLeft') {
        heldKeys.ArrowLeft = false;
        stateManager.set('particleCount', particleSystem?.getCount(), true);
    }
}

function getHoldMultiplier(startTime) {
    const holdDuration = (performance.now() - startTime) / 1000;
    if (holdDuration >= 5) return 100;
    if (holdDuration >= 2) return 10;
    return 1;
}

function updateParticleCount() {
    if (!particleSystem) return;
    
    if (heldKeys.ArrowRight) {
        const multiplier = getHoldMultiplier(heldKeys.ArrowRightStart);
        particleSystem.addParticles(multiplier);
    }
    if (heldKeys.ArrowLeft) {
        const multiplier = getHoldMultiplier(heldKeys.ArrowLeftStart);
        particleSystem.removeParticles(multiplier);
    }
}

// ===== Event Handlers =====
function handleCanvasClick() {
    // Forward click to current mode if it has a handler
    if (particleSystem?.currentMode?.handleClick) {
        particleSystem.currentMode.handleClick();
    }
}

function handleResize() {
    elements.particleCanvas.width = window.innerWidth;
    elements.particleCanvas.height = window.innerHeight;
    overlayRenderer?.resize(256, 144);
    particleSystem?.resize();
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && stateManager.get('isRunning')) {
        if (!mediaPipe?.isCameraActive()) {
            returnToIntro();
        }
    }
}

function returnToIntro() {
    stateManager.set('isRunning', false);
    mediaPipe?.stop();
    
    elements.introScreen.classList.remove('hidden');
    elements.app.classList.add('hidden');
    
    elements.enableCameraBtn.innerHTML = '<i data-lucide="camera" class="btn-icon"></i><span class="btn-text">Enable Camera</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    elements.enableCameraBtn.disabled = false;
    
    updateStatus('Camera disconnected', 'error');
}

// ===== Intro Particles =====
function createIntroParticles() {
    const container = document.getElementById('intro-particles');
    if (!container) return;
    
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
