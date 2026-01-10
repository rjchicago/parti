/**
 * Base class for particle behavior modes
 */
export class Mode {
    constructor(name, icon) {
        this.name = name;
        this.icon = icon;
    }

    /**
     * Update a single particle's velocity based on mode logic
     * @param {Object} particle - The particle to update
     * @param {Array} landmarks - Array of detected landmarks
     * @param {Object} canvasSize - { width, height }
     */
    updateParticle(particle, landmarks, canvasSize) {
        // Override in subclasses
    }

    /**
     * Get friction coefficient for this mode
     * @returns {number}
     */
    getFriction() {
        return 0.95;
    }

    /**
     * Get maximum particle speed for this mode
     * @returns {number}
     */
    getMaxSpeed() {
        return 8;
    }

    /**
     * Handle particle edge behavior
     * @param {Object} particle - The particle
     * @param {Object} canvasSize - { width, height }
     */
    handleEdges(particle, canvasSize) {
        // Default: wrap around all edges
        if (particle.x < 0) particle.x = canvasSize.width;
        if (particle.x > canvasSize.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvasSize.height;
        if (particle.y > canvasSize.height) particle.y = 0;
    }

    /**
     * Whether this mode uses friction (applied externally)
     * @returns {boolean}
     */
    usesFriction() {
        return true;
    }

    /**
     * Get trail alpha for this mode (lower = shorter trails)
     * @returns {number}
     */
    getTrailAlpha() {
        return 0.15;
    }

    /**
     * Get preset theme index for this mode (null = no preset)
     * @returns {number|null}
     */
    getPresetTheme() {
        return null;
    }

    /**
     * Called before individual particle updates - for batch operations
     * @param {Array} particles - All particles
     * @param {Object} canvasSize - { width, height }
     */
    onBeforeUpdate(particles, canvasSize) {
        // Override in subclasses for custom batch behavior
    }

    /**
     * Called after particle rendering - for custom overlays
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} canvasSize - { width, height }
     * @param {Object} options - { maskVisible: boolean }
     */
    onAfterRender(ctx, canvasSize, options = {}) {
        // Override in subclasses for custom rendering
    }

    /**
     * Get the alpha value for rendering a particle
     * @param {Object} particle - The particle
     * @returns {number} - Alpha value 0-1
     */
    getParticleAlpha(particle) {
        return particle.alpha;
    }

    /**
     * Initialize a particle's position and properties
     * Called when particle is created or mode changes
     * @param {Object} particle - The particle to initialize
     * @param {Object} canvasSize - { width, height }
     */
    initParticle(particle, canvasSize) {
        // Default: random position across canvas
        particle.x = Math.random() * canvasSize.width;
        particle.y = Math.random() * canvasSize.height;
    }
}
