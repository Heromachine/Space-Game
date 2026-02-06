/**
 * Shoot Behavior
 *
 * Entity fires projectiles at a target on a cooldown.
 * Used by: turrets, boss turrets, player (adapted).
 *
 * AGENT INSTRUCTIONS:
 * 1. Export: updateShoot(entity, target, deltaTime, currentTime, bulletArray)
 * 2. Check if currentTime - entity.lastShotTime >= entity.shootCooldown
 * 3. If ready, calculate angle to target
 * 4. Push new bullet to bulletArray: { x, y, vx, vy, radius, color, damage }
 * 5. Update entity.lastShotTime = currentTime
 * 6. Entity must have: shootCooldown, lastShotTime, bulletSpeed, bulletRadius, damage
 */

export function updateShoot(entity, target, deltaTime, currentTime, bulletArray) {
    // TODO: Implement shoot behavior
}

export default { updateShoot };
