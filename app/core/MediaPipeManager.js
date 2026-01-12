/**
 * MediaPipeManager - Handles MediaPipe Hands, FaceMesh, and Camera initialization
 */

export class MediaPipeManager {
    constructor(videoElement, options = {}) {
        this.videoElement = videoElement;
        this.options = {
            maxHands: options.maxHands ?? 2,
            maxFaces: options.maxFaces ?? 1,
            modelComplexity: options.modelComplexity ?? 1,
            minDetectionConfidence: options.minDetectionConfidence ?? 0.7,
            minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
            width: options.width ?? 1280,
            height: options.height ?? 720
        };
        
        this.hands = null;
        this.faceMesh = null;
        this.camera = null;
        
        // Callbacks
        this._onHandResults = null;
        this._onFaceResults = null;
        
        // State
        this.isInitialized = false;
        this.isRunning = false;
    }

    /**
     * Set callback for hand detection results
     */
    onHandResults(callback) {
        this._onHandResults = callback;
    }

    /**
     * Set callback for face detection results
     */
    onFaceResults(callback) {
        this._onFaceResults = callback;
    }

    /**
     * Initialize MediaPipe models
     */
    async init() {
        // Initialize Hands
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        this.hands.setOptions({
            maxNumHands: this.options.maxHands,
            modelComplexity: this.options.modelComplexity,
            minDetectionConfidence: this.options.minDetectionConfidence,
            minTrackingConfidence: this.options.minTrackingConfidence
        });
        this.hands.onResults((results) => {
            if (this._onHandResults) {
                this._onHandResults(results);
            }
        });

        // Initialize FaceMesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        this.faceMesh.setOptions({
            maxNumFaces: this.options.maxFaces,
            refineLandmarks: true,
            minDetectionConfidence: this.options.minDetectionConfidence,
            minTrackingConfidence: this.options.minTrackingConfidence
        });
        this.faceMesh.onResults((results) => {
            if (this._onFaceResults) {
                this._onFaceResults(results);
            }
        });

        this.isInitialized = true;
    }

    /**
     * Request camera access and start processing
     */
    async startCamera() {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: this.options.width, 
                height: this.options.height, 
                facingMode: 'user' 
            }
        });
        
        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        // Start camera processing loop
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (this.isRunning) {
                    await this.hands.send({ image: this.videoElement });
                    await this.faceMesh.send({ image: this.videoElement });
                }
            },
            width: this.options.width,
            height: this.options.height
        });
        
        await this.camera.start();
        this.isRunning = true;
    }

    /**
     * Stop camera and cleanup
     */
    stop() {
        this.isRunning = false;
        
        if (this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        if (this.camera) {
            this.camera.stop?.();
            this.camera = null;
        }
    }

    /**
     * Check if camera stream is still active
     */
    isCameraActive() {
        const videoTracks = this.videoElement.srcObject?.getVideoTracks() || [];
        return videoTracks.some(track => track.readyState === 'live');
    }

    /**
     * Pause/resume face detection (for performance when mask is hidden)
     */
    setFaceDetectionEnabled(enabled) {
        // This is handled by checking state in the onFrame callback
        // Could be extended to fully pause faceMesh.send()
    }
}
