# Parti 🎨✨

A real-time particle simulator where thousands of particles flow to form the shape of your face and hands on camera using MediaPipe for tracking.

![Particles](https://img.shields.io/badge/Particles-1--10K-00f5ff?style=for-the-badge)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands%20%2B%20FaceMesh-ff00ff?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-ffd700?style=for-the-badge)

## Features

### 🖐️ Hand Tracking
- Detects up to **2 hands** with all **21 landmarks**
- Skeleton overlay with **cyan and pink glowing lines** between joints
- Larger dots at **fingertips and wrist**
- **Tapered particle spread**: narrow at fingertips, medium at finger segments, wider at palm
- Golden ratio math for smooth organic particle distribution

### 😊 Face Tracking
- **FaceMesh** with all **468 landmarks** and refined features
- **Depth boost** on nose, cheekbones, and eye sockets for 3D pop effect
- Colored mesh overlays:
  - **Teal** for eyes
  - **Pink** for lips
  - **Cyan** for face oval
- Tight particle clustering for dense mesh effect

### 🎮 Particle Modes

| Mode | Icon | Behavior |
|------|------|----------|
| **Attract** | 🧲 | Particles flow toward hand and face landmarks |
| **Repel** | 💨 | Particles flow freely but avoid landmarks |
| **Rain** | 🌧️ | Particles fall from top, slow and drip on landmarks |
| **Snow** | ❄️ | Particles fall gently, stop and build up on landmarks |
| **Party** | 🎉 | Confetti bursts with silhouette effect and glowing happy face mask |
| **Galactic** | 🌌 | Milky Way starfield with parallax head tracking and shooting stars |
| **Matrix** | 💊 | Japanese katakana digital rain with cycling characters |

Each mode has a **preset theme** that auto-applies when selected.

### 🎨 Color Themes

6 stunning color themes:

| Theme | Colors |
|-------|--------|
| 🌈 **Rainbow** | Full spectrum (red, orange, yellow, green, blue, purple) |
| 🔥 **Fire** | Red, orange, yellow flames |
| 🌊 **Ocean** | Deep blues and teals |
| 🌌 **Galaxy** | Purple and pink nebula |
| 💚 **Matrix** | Green digital rain |
| ⬜ **White** | Pure white and light grays |

### ✨ Particle System
- **1 to 10,000 particles** with physics-based movement
- **Arrow keys** to adjust particle count in real-time
- **Particle trails** with mode-specific fade effects
- **Golden ratio distribution** for organic flow patterns
- **Settings persistence** via localStorage

## Getting Started

### Prerequisites
- Modern web browser (Chrome recommended)
- Webcam
- Docker (optional)

### 🐳 Running with Docker (Recommended)

```bash
git clone https://github.com/rjchicago/parti.git
cd parti
docker compose up -d
```

Open http://localhost:8080 in your browser.

### 📦 Running Locally

```bash
git clone https://github.com/rjchicago/parti.git
cd parti/app
python3 -m http.server 8080
```

Open http://localhost:8080 and click **Enable Camera**.

## Controls

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `SPACE` | Cycle through modes |
| `V` | Toggle camera preview visibility |
| `T` | Cycle through color themes |
| `P` | Pause/unpause particle simulation |
| `↑` | Increase particle count (hold for acceleration) |
| `↓` | Decrease particle count (hold for acceleration) |

### Arrow Key Acceleration

| Hold Duration | Rate |
|---------------|------|
| 0-2 seconds | 1 particle/frame |
| 2-5 seconds | 10 particles/frame |
| 5+ seconds | 100 particles/frame |

### Gesture Controls

Configure via the **✊ Fist** dropdown:
- Toggle Mode
- Toggle Camera
- Cycle Theme
- None (disabled)

## UI Layout

- **Top Left**: Mode buttons, Theme dropdown, Fist action dropdown
- **Top Center**: 256×144 camera preview with skeleton/mesh overlays
- **Top Right**: Status indicator
- **Bottom Left**: Active particle count
- **Bottom Right**: Keyboard shortcuts panel
- **Bottom Center**: Reset Settings link

## Architecture

```
parti/
├── app/
│   ├── index.html          # Main HTML structure
│   ├── styles.css          # Dark cyberpunk theme
│   ├── app.js              # Main app, UI, MediaPipe
│   ├── ParticleSystem.js   # Particle management & rendering
│   └── modes/
│       ├── index.js        # Barrel export
│       ├── Mode.js         # Base class with lifecycle hooks
│       ├── AttractMode.js  # Attract to landmarks
│       ├── RepelMode.js    # Flow around landmarks
│       ├── RainMode.js     # Fall + drip
│       ├── SnowMode.js     # Fall + build up
│       ├── PartyMode.js    # Confetti + silhouette mask
│       ├── GalacticMode.js # Milky Way + shooting stars
│       └── MatrixMode.js   # Digital rain
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```

### Adding New Modes

Create a new mode by extending the base class:

```javascript
import { Mode } from './Mode.js';

export class MyMode extends Mode {
    constructor() {
        super('mymode', '🎯');
    }

    updateParticle(particle, landmarks, canvasSize) {
        // Your physics here
    }

    // Optional lifecycle hooks
    onBeforeUpdate(particles, canvasSize) { }  // Batch operations
    onAfterRender(ctx, canvasSize) { }         // Custom overlays
    initParticle(particle, canvasSize) { }     // Custom positioning
    getParticleAlpha(particle) { return particle.alpha; }

    getMaxSpeed() { return 8; }
    getFriction() { return 0.95; }
    getTrailAlpha() { return 0.15; }
    getPresetTheme() { return null; } // Theme index or null
}
```

## Technical Details

### Dependencies
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) - 21 landmarks per hand
- [MediaPipe FaceMesh](https://google.github.io/mediapipe/solutions/face_mesh.html) - 468 face landmarks
- [MediaPipe Camera Utils](https://google.github.io/mediapipe/solutions/camera_utils.html) - Camera handling

All dependencies loaded via CDN - no npm install required!

### Settings Persistence

User settings are saved to localStorage:
- Current mode
- Color theme
- Particle count
- Fist action
- Camera visibility

Click **Reset Settings** (bottom center) to restore defaults.

### Performance Tips
- Chrome/Edge recommended for best performance
- Good lighting improves hand/face detection
- Lower particle count on slower machines (use ↓ key)
- Close other camera-using applications

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support (recommended) |
| Edge | ✅ Full support |
| Firefox | ⚠️ Works, may have lower FPS |
| Safari | ⚠️ Limited MediaPipe support |

## Docker Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop container |
| `docker compose logs -f` | View logs |

## License

MIT License - feel free to use, modify, and share!

## Credits

Built with ❤️ using [MediaPipe](https://mediapipe.dev/) by Google

---

**Tips**: 
- Try **Snow** mode with the **White** theme for a winter wonderland! ❄️⬜
- **Party** mode creates a glowing happy face mask on your silhouette! 🎉😊
- **Matrix** mode for that authentic digital rain experience! 💊🟢
- **Galactic** mode - move your head to shift the cosmos! 🌌✨
