# Parti 🎨✨

A real-time particle simulator where thousands of particles flow to form the shape of your face and hands on camera using MediaPipe for tracking.

![Parti Demo](https://img.shields.io/badge/Particles-8K--15K-00f5ff?style=for-the-badge)
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
- Tight particle clustering (1-2 pixels) for dense mesh effect

### ✨ Particle System
- **8,000 to 15,000 particles** with physics-based movement
- Particles attract toward hand and face landmarks
- Even distribution between visible elements
- **Particle trails** with semi-transparent fade
- **Attract mode**: Particles flow toward you
- **Repel mode**: Particles push away

### 🎨 Color Themes
5 stunning color themes that cycle with a fist gesture:
- 🌈 **Rainbow** - Full spectrum colors
- 🔥 **Fire** - Red, orange, yellow flames
- 🌊 **Ocean** - Deep blues and teals
- 🌌 **Galaxy** - Purple and pink nebula
- 💚 **Matrix** - Green digital rain

## Getting Started

### Prerequisites
- Modern web browser (Chrome recommended for best MediaPipe performance)
- Webcam
- Docker (optional)

### 🐳 Running with Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/rjchicago/parti.git
   cd parti
   ```

2. Start with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Open in browser:
   ```
   http://localhost:8080
   ```

4. Stop the container:
   ```bash
   docker compose down
   ```

### 🔧 Development Mode

For live reload during development:

```bash
docker compose --profile dev up parti-dev
```

Access at `http://localhost:8081` - changes to files in `app/` are reflected immediately.

### 📦 Running Locally (without Docker)

1. Clone and navigate:
   ```bash
   git clone https://github.com/rjchicago/parti.git
   cd parti/app
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8080
   ```

3. Open `http://localhost:8080` in browser

4. Click **Enable Camera** and allow camera access

## Controls

| Input | Action |
|-------|--------|
| `SPACE` | Toggle Attract/Repel mode |
| `V` | Toggle camera preview visibility |
| `T` | Cycle through color themes |
| ✊ **Fist gesture** | Cycle through color themes |

## UI Layout

- **Top Left**: Mode toggle buttons (Attract/Repel) and current theme indicator
- **Top Center**: 256×144 camera preview with skeleton/mesh overlays
- **Top Right**: Status indicator (loading, detection status, prompts)
- **Bottom Left**: Active particle count
- **Bottom Right**: Keyboard shortcuts panel

## Technical Details

### Dependencies
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) - Hand landmark detection
- [MediaPipe FaceMesh](https://google.github.io/mediapipe/solutions/face_mesh.html) - Face landmark detection
- [MediaPipe Camera Utils](https://google.github.io/mediapipe/solutions/camera_utils.html) - Camera handling

All dependencies are loaded via CDN - no npm install required!

### Architecture
```
parti/
├── app/
│   ├── index.html      # Main HTML structure with intro screen and app layout
│   ├── styles.css      # Dark cyberpunk theme with glass-morphism UI
│   └── app.js          # Core application logic
│       ├── Particle system (physics, rendering, trails)
│       ├── MediaPipe integration (hands + face)
│       ├── Overlay drawing (skeleton, mesh)
│       ├── Gesture detection (fist for theme cycling)
│       └── UI controls and keyboard shortcuts
├── Dockerfile          # Production container build
├── docker-compose.yml  # Container orchestration
├── nginx.conf          # Web server configuration
└── README.md
```

### Golden Ratio Distribution
Particles are distributed using the golden ratio (φ ≈ 1.618) for organic, natural-looking flow patterns. This creates visually pleasing spirals and prevents clustering artifacts.

### Performance Tips
- Chrome/Edge recommended for best WebGL performance
- Ensure good lighting for reliable hand/face detection
- Close other camera-using applications
- Lower particle count on slower machines (modify `CONFIG.particles.min/max` in `app/app.js`)

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
| `docker compose down` | Stop and remove container |
| `docker compose logs -f` | View logs |
| `docker compose build --no-cache` | Rebuild image |
| `docker compose --profile dev up parti-dev` | Development mode |

## License

MIT License - feel free to use, modify, and share!

## Credits

Built with ❤️ using [MediaPipe](https://mediapipe.dev/) by Google

---

**Tip**: For the best experience, use in a well-lit room and position yourself so your face and hands are clearly visible to the camera. Make a fist to cycle through the beautiful color themes! ✊🎨
