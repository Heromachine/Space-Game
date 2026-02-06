/**
 * Dash/Lunge Behavior
 *
 * Entity charges toward target when within range, then enters cooldown.
 * Used by: blue enemy, boss.
 *
 * AGENT INSTRUCTIONS:
 * 1. Export: updateDash(entity, target, deltaTime, currentTime)
 * 2. States: 'pursue' -> 'dash' -> 'dormant' -> 'pursue'
 * 3. When distance < entity.dashRadius and state='pursue', switch to 'dash'
 * 4. In 'dash': set high velocity toward target, track dashStartTime
 * 5. After dashDuration (300ms), switch to 'dormant', zero velocity
 * 6. After dashCooldown in 'dormant', return to 'pursue'
 * 7. Entity must have: dashRadius, dashSpeed, dashCooldown, lastDashTime, state
 */

export function updateDash(entity, target, deltaTime, currentTime) {
    // TODO: Implement dash behavior
}

export default { updateDash };
