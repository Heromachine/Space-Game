# Space Game Architecture

## Overview

This game uses a **modular, composition-based architecture** with ES6 modules. Behaviors are entity-agnostic and can be attached to enemies, bullets, or any game object.

## Folder Structure

```
Space-Game/
├── index.html           # Entry point, loads game.js as module
├── config.js            # Display & UI configuration
├── game.js              # Main loop, orchestration
├── enemies.js           # Enemy type data (JSON-like configs)
│
├── behaviors/           # Composable, entity-agnostic behaviors
│   ├── chase.js         # Follow target
│   ├── dash.js          # Lunge attack
│   ├── shoot.js         # Fire projectiles
│   ├── idleUntilTriggered.js
│   ├── homing.js        # Curved pursuit (missiles)
│   └── pathfind.js      # A* navigation
│
├── entities/            # Game object definitions
│   ├── player.js        # Player state & actions
│   ├── enemies.js       # Enemy factory using behaviors
│   ├── bullets.js       # Bullet/projectile factory
│   └── mines.js         # Mine logic
│
├── systems/             # Game systems
│   ├── input.js         # Event listeners
│   └── collision.js     # Collision detection
│
├── generation/          # Procedural generation
│   ├── noise.js         # Perlin/Simplex noise
│   ├── wfc.js           # Wave Function Collapse
│   ├── csp.js           # Constraint Satisfaction
│   ├── graphGrammar.js  # Graph-based level gen
│   └── spawner.js       # Coordinates generation
│
└── rendering/           # Draw functions
    ├── renderer.js      # Entity rendering
    └── ui.js            # HUD, menus
```

## Agent Instructions

### Refactoring game.js

**PRIORITY: Do this first before adding features.**

1. Extract input handling to `systems/input.js`
2. Extract all `draw*` functions to `rendering/renderer.js` and `rendering/ui.js`
3. Extract player logic to `entities/player.js`
4. Extract bullet logic to `entities/bullets.js`
5. Extract mine logic to `entities/mines.js`
6. Extract enemy update logic, replacing with behavior composition
7. Update `index.html` to use `<script type="module" src="game.js">`

### Creating a New Behavior

```js
// behaviors/myBehavior.js
export function updateMyBehavior(entity, target, deltaTime, ...extraArgs) {
    // Modify entity.vx, entity.vy, entity.state, etc.
    // DO NOT modify target or global state
    // Return any needed info (e.g., bullets to spawn)
}
export default { updateMyBehavior };
```

**Rules:**
- Behaviors are pure-ish functions (only modify the entity passed in)
- Entity must have required properties (document in JSDoc)
- Use deltaTime for frame-independent movement
- Return spawned objects (bullets) rather than pushing to global arrays

### Creating a New Entity Type

```js
// In entities/enemies.js or entities/bullets.js
import { updateChase } from '../behaviors/chase.js';
import { updateDash } from '../behaviors/dash.js';

export const blueEnemy = {
    type: 'blue',
    behaviors: [updateChase, updateDash],
    stats: {
        health: 30,
        speed: 2,
        dashSpeed: 15,
        dashRadius: 150,
        dashCooldown: 2000,
        damage: 10
    },
    render: 'circle',  // or custom render function
    color: '#4169e1'
};

export function createEnemy(template, x, y) {
    return {
        ...template.stats,
        x, y,
        vx: 0, vy: 0,
        behaviors: template.behaviors,
        type: template.type,
        color: template.color
    };
}
```

### Implementing Generation Systems

Each file in `generation/` has detailed instructions in its header comments.

**Order of implementation:**
1. `noise.js` - Most useful, enables density-based spawning
2. `csp.js` - Wave balancing constraints
3. `wfc.js` - Tile-based layouts
4. `graphGrammar.js` - Level structure

### Game Loop Structure

```js
// game.js should look like:
import { updateInput } from './systems/input.js';
import { updatePlayer } from './entities/player.js';
import { updateEntities } from './entities/enemies.js';
import { checkCollisions } from './systems/collision.js';
import { render } from './rendering/renderer.js';
import { renderUI } from './rendering/ui.js';

function gameLoop() {
    const dt = calculateDeltaTime();

    updateInput();
    updatePlayer(player, dt);
    updateEntities(enemies, player, dt);  // Runs behaviors
    updateEntities(bullets, player, dt);
    checkCollisions(player, enemies, bullets);

    render(ctx, { player, enemies, bullets, mines });
    renderUI(ctx, player, gameState);

    requestAnimationFrame(gameLoop);
}
```

## Key Concepts

### Behavior Composition

Enemies/bullets are defined by combining behaviors:

| Entity | Behaviors |
|--------|-----------|
| Blue Enemy | chase + dash |
| Purple Enemy | idleUntilTriggered(proximity) + chase |
| Sentinel | idleUntilTriggered(damage) + chase |
| Turret | shoot |
| Boss | chase + dash + (turrets as children) |
| Homing Missile | homing |
| Smart Missile | pathfind |

### Entity Update Pattern

```js
function updateEntity(entity, target, dt, currentTime, spawnArrays) {
    const spawned = { bullets: [], effects: [] };

    for (const behavior of entity.behaviors) {
        const result = behavior(entity, target, dt, currentTime);
        if (result?.bullets) spawned.bullets.push(...result.bullets);
    }

    // Apply velocity
    entity.x += entity.vx * dt * 60;
    entity.y += entity.vy * dt * 60;

    return spawned;
}
```

### Procedural Generation Pipeline

```
Seed
  │
  ├─> Graph Grammar ──> Level Structure (rooms, connections)
  │
  ├─> WFC ──> Room Layouts (tiles)
  │
  ├─> CSP ──> Wave Composition (enemy counts)
  │
  └─> Noise ──> Enemy Positions, Environmental Details
```

## Testing

To test ES6 modules locally, run a server:
```bash
npx serve .
# or
python -m http.server 8000
```

## Current State

The game currently works but game.js is monolithic (~1600 lines). The refactor should:
1. Not break existing functionality
2. Maintain the same visual appearance
3. Enable easier addition of new enemies/behaviors
4. Prepare for procedural generation
