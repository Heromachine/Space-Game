/**
 * Chase Behavior
 *
 * Makes an entity move toward a target (usually the player).
 * Can be used by: enemies, homing missiles, seeking projectiles.
 *
 * AGENT INSTRUCTIONS:
 * 1. Export a function: updateChase(entity, target, deltaTime)
 * 2. Calculate angle to target: Math.atan2(target.y - entity.y, target.x - entity.x)
 * 3. Set entity.vx and entity.vy based on angle and entity.speed
 * 4. Entity must have: x, y, speed, vx, vy
 * 5. For smooth turning, use entity.turnRate to limit angle change per frame
 */

export function updateChase(entity, target, deltaTime) {
    // TODO: Implement chase behavior
}

export default { updateChase };
