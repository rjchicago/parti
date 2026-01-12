/**
 * StateManager - Centralized state management and localStorage persistence
 */

import { MODE_ORDER } from './config.js';

const STORAGE_KEY = 'parti-settings';

const DEFAULT_SETTINGS = {
    mode: 'party',
    theme: 0,
    particleCount: new Date().getFullYear(),
    fistAction: 'none',
    cameraVisible: false,
    maskVisible: true,
    displayVisible: true
};

// Check for reset URL parameter
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = window.location.pathname;
    }
}

class StateManager {
    constructor() {
        this.state = {
            // Persisted settings
            mode: DEFAULT_SETTINGS.mode,
            theme: DEFAULT_SETTINGS.theme,
            particleCount: DEFAULT_SETTINGS.particleCount,
            fistAction: DEFAULT_SETTINGS.fistAction,
            cameraVisible: DEFAULT_SETTINGS.cameraVisible,
            maskVisible: DEFAULT_SETTINGS.maskVisible,
            displayVisible: DEFAULT_SETTINGS.displayVisible,
            
            // Runtime state (not persisted)
            mobileLayout: this._detectMobile(),
            displayOverrideHidden: false, // Soft hide by modes (e.g. BrickBreaker)
            isRunning: false,
            paused: false,
            handResults: null,
            faceResults: null,
            lastFistTime: 0,
            fistCooldown: 500
        };
        
        // Event listeners for state changes
        this._listeners = new Map();
    }

    /**
     * Detect if running on mobile device
     */
    _detectMobile() {
        const urlParams = new URLSearchParams(window.location.search);
        const layoutParam = urlParams.get('layout');
        
        if (layoutParam === 'mobile') return true;
        if (layoutParam === 'desktop') return false;
        
        const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const smallScreen = window.innerWidth <= 768;
        const isIPad = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
        
        return userAgentMobile || isIPad || (touchDevice && smallScreen);
    }

    /**
     * Load settings from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate mode - fallback to default if invalid
                if (parsed.mode && !MODE_ORDER.includes(parsed.mode)) {
                    console.warn(`Invalid mode "${parsed.mode}", resetting to default`);
                    parsed.mode = DEFAULT_SETTINGS.mode;
                }
                Object.assign(this.state, { ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return this.state;
    }

    /**
     * Save current settings to localStorage
     */
    save() {
        try {
            const settings = {
                mode: this.state.mode,
                theme: this.state.theme,
                particleCount: this.state.particleCount,
                fistAction: this.state.fistAction,
                cameraVisible: this.state.cameraVisible,
                maskVisible: this.state.maskVisible,
                displayVisible: this.state.displayVisible
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    /**
     * Reset all settings to defaults
     */
    reset() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }

    /**
     * Get a state value
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set a state value and optionally persist
     */
    set(key, value, persist = false) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Notify listeners
        this._notifyListeners(key, value, oldValue);
        
        if (persist) {
            this.save();
        }
    }

    /**
     * Update multiple state values at once
     */
    update(updates, persist = false) {
        for (const [key, value] of Object.entries(updates)) {
            const oldValue = this.state[key];
            this.state[key] = value;
            this._notifyListeners(key, value, oldValue);
        }
        
        if (persist) {
            this.save();
        }
    }

    /**
     * Subscribe to state changes
     */
    on(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => this._listeners.get(key)?.delete(callback);
    }

    /**
     * Notify listeners of state change
     */
    _notifyListeners(key, newValue, oldValue) {
        if (newValue !== oldValue && this._listeners.has(key)) {
            for (const callback of this._listeners.get(key)) {
                callback(newValue, oldValue);
            }
        }
    }

    /**
     * Get default settings
     */
    static get DEFAULTS() {
        return { ...DEFAULT_SETTINGS };
    }
}

// Export singleton instance
export const stateManager = new StateManager();
export { DEFAULT_SETTINGS };
