import { Mode } from './Mode.js';
import { AttractMode } from './AttractMode.js';
import { RepelMode } from './RepelMode.js';
import { RainMode } from './RainMode.js';
import { SnowMode } from './SnowMode.js';
import { PartyMode } from './PartyMode.js';
import { GalacticMode } from './GalacticMode.js';
import { MatrixMode } from './MatrixMode.js';
import { GravityMode } from './GravityMode.js';
import { SketchMode } from './SketchMode.js';
import { BrickBreakerMode } from './BrickBreakerMode.js';

// Export classes for direct use
export { Mode, AttractMode, RepelMode, RainMode, SnowMode, PartyMode, GalacticMode, MatrixMode, GravityMode, SketchMode, BrickBreakerMode };

// Mode registry - instantiated modes keyed by name
// Add new modes here: they self-describe via name, icon, and label
export const modeRegistry = {
    party: new PartyMode(),
    attract: new AttractMode(),
    repel: new RepelMode(),
    rain: new RainMode(),
    snow: new SnowMode(),
    galactic: new GalacticMode(),
    matrix: new MatrixMode(),
    gravity: new GravityMode(),
    sketch: new SketchMode(),
    brickbreaker: new BrickBreakerMode(),
};
