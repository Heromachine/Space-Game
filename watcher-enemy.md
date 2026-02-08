# Watcher Enemy

A stealth-style enemy with cone-based line of sight, peripheral vision, and last-known-position investigation.

## Stats

| Property | Value |
|----------|-------|
| Health | 40 |
| Damage | 8 |
| Speed | 2 (0.6x when investigating) |
| Radius | 20 |
| Color | #00cccc (teal) |
| Main FOV | 45 degrees |
| Peripheral FOV | 90 degrees (45 per side) |
| Sight Range | 300px |
| Turn Speed | 0.8 rad/s (caution rotation) |
| Scan Speed | 1.5 rad/s (investigation scan) |

## State Machine

```
              player in main cone
         ┌──────────────────────────┐
         │                          │
         ▼                          │
idle ──► chase ──► investigate ──► scanning ──► idle
  ▲        │            │             │
  │        ▼            │             │
  │     caution         │             │
  │        │            │             │
  └────────┴── player re-enters vision ──┘
```

## States

### idle
- Stands still, facing a fixed direction
- No reaction to the player
- Vision cone is drawn at low opacity

### chase
- Player is inside the **main 45-degree cone** and within sight range
- Turns to face the player and moves toward them at full speed
- Continuously updates the **last seen position** (player's location and rotation)
- Vision cone is drawn brighter (teal)

### caution
- Player is in the **peripheral vision** (45 degrees on each side of the main cone) but NOT in the main cone
- Stops moving, slowly rotates toward the player at 0.8 rad/s
- If the rotation sweeps the player into the main cone, transitions to **chase**
- If the player leaves all vision zones, transitions to **investigate**
- Peripheral zones are drawn in amber/yellow, brighter during caution

### investigate
- Triggered when the player **leaves all vision zones** after being seen
- A **ghost outline** of the player appears at the last seen position (dashed teal triangle with "?" marker)
- The watcher walks toward the ghost at **60% speed**
- Faces the direction it's walking
- If the player re-enters any vision zone during movement, transitions back to **chase** or **caution**

### scanning
- Triggered when the watcher **arrives at the last seen position**
- Stands still, performs a full **360-degree rotation scan** at 1.5 rad/s
- If the player is spotted during the scan (main cone or peripheral), transitions to **chase** or **caution**
- If the full rotation completes with nothing found, transitions to **idle** and the ghost outline disappears

## Vision Zones

```
                    ◄── 300px ──►

              ╱ peripheral (amber) ╲
            ╱ ╱  main cone (teal)  ╲ ╲
          ╱ ╱ ╱                    ╲ ╲ ╲
        ╱ ╱ ╱                      ╲ ╲ ╲
      ╱ ╱ ╱                        ╲ ╲ ╲
    ( WATCHER )─── facing direction ───►
      ╲ ╲ ╲                        ╱ ╱ ╱
        ╲ ╲ ╲                      ╱ ╱ ╱
          ╲ ╲ ╲                    ╱ ╱ ╱
            ╲ ╲  main cone (teal)  ╱ ╱
              ╲ peripheral (amber) ╱

    Behind (225 degrees) = no detection
```

| Zone | Angle | Behavior |
|------|-------|----------|
| Main cone | 45 degrees (center) | Chase |
| Peripheral | 45 degrees each side | Slow rotation only |
| Behind | 225 degrees | No reaction |

## Visual Design

- **Body**: Teal circle with a white eye and dark pupil
- **Pupil**: Points in the facing direction (not always at the player)
- **Main cone**: Teal, drawn at low opacity (brighter when chasing)
- **Peripheral zones**: Amber/yellow flanking the main cone (brighter during caution)
- **Ghost outline**: Dashed teal triangle matching the player's shape and rotation when last seen, with a "?" floating above it

---

# Screamer Enemy

An alarm-type support enemy that builds alertness when it sees the player. When the gauge fills, it screams — alerting all nearby enemies by turning them to face the player's direction.

## Stats

| Property | Value |
|----------|-------|
| Health | 30 |
| Damage | 5 |
| Speed | 1.5 (stationary when detecting) |
| Radius | 18 |
| Color | #ff4444 (red) |
| Main FOV | 30 degrees (narrow) |
| Peripheral FOV | 40 degrees (20 per side) |
| Sight Range | 450px (long range) |
| Turn Speed | 0.6 rad/s |
| Alert Rate | 25/sec (main cone), 10/sec (peripheral) |
| Alert Decay | 15/sec (when player not visible) |
| Scream Radius | 400px |
| Scream Cooldown | 5 seconds |

## State Machine

```
                   alertness < 100
              ┌─────────────────────┐
              │                     │
              ▼                     │
idle ──► alert/caution ──► SCREAM ──► idle
              │               │
              │               └──► all enemies in radius
              │                    turn to face player
              ▼
        alertness decays
```

## States

### idle
- Stands still, facing a fixed direction
- Alertness decays toward 0
- Vision cones drawn at low opacity (red tones)

### alert
- Player is in the **main 30-degree cone**
- Stands still, faces the player
- Alertness gauge fills at **25/sec** (~4 seconds to fill)
- Gauge is drawn as a colored ring around the body (yellow → orange → red)

### caution
- Player is in the **peripheral vision** (20 degrees each side)
- Stands still, slowly rotates toward player
- Alertness fills at **40% rate** (10/sec, ~10 seconds to fill)

### SCREAM (triggered when alertness reaches 100)
- An expanding red circle radiates from the screamer (400px radius)
- **Every enemy** within that radius has its `facingAngle` set to match the screamer's
  - Watchers suddenly have their cones pointed at where the player was
  - Sentinels get activated
- Scream lasts 600ms (visual only), then goes on 5-second cooldown
- Alertness resets to 0

## Visual Design

- **Body**: Red circle with a dark inner "mouth" circle
- **Alertness gauge**: Ring around the body that fills clockwise from the top
  - Yellow (0–40%), Orange (40–70%), Red (70–100%)
- **Main cone**: Red, brighter when alert
- **Peripheral zones**: Dark orange flanking the main cone
- **Scream effect**: Expanding red ring with translucent fill, fades as it expands

## Interaction with Other Enemies

The scream is what makes this enemy dangerous — it's a force multiplier:
- **Watchers** get their facing angle overridden → their vision cones snap toward the player
- **Sentinels** get activated (same as being shot)
- **Any enemy with a facingAngle** turns to face the screamer's direction

Kill the screamer quickly (30 HP, fragile) before its gauge fills, or stay out of its long 450px range.

---

## Files (shared)

- `enemies.csv` — watcher and screamer rows with fov, sightRange, peripheralFov, turnSpeed, alertRate, alertDecayRate, screamRadius columns
- `enemies.js` — createEnemy parses all vision properties and alertness/scream properties
- `game.js` — behavior in updateEnemies, rendering in drawEnemies, ghost in drawWatcherGhosts
- `test.html` — standalone test page that spawns 2 watchers and 1 screamer
