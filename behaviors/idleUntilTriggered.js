/**
 * Idle Until Triggered Behavior
 *
 * Entity stays still until a condition is met (proximity, damage, etc).
 * Used by: purple enemy (proximity), sentinel (damage).
 *
 * AGENT INSTRUCTIONS:
 * 1. Export: updateIdleUntilTriggered(entity, target, deltaTime, triggerCondition)
 * 2. triggerCondition is a function: (entity, target) => boolean
 * 3. If entity.activated is false and triggerCondition returns true, set activated=true
 * 4. Return entity.activated so caller knows whether to run other behaviors
 * 5. Common triggers:
 *    - Proximity: distance < entity.activationRadius
 *    - Damage: entity.wasHit flag (set by collision system)
 * 6. Entity must have: activated (boolean)
 */

export function updateIdleUntilTriggered(entity, target, deltaTime, triggerCondition) {
    // TODO: Implement idle until triggered behavior
}

// Pre-built trigger conditions
export const proximityTrigger = (entity, target) => {
    const distance = Math.hypot(target.x - entity.x, target.y - entity.y);
    return distance <= entity.activationRadius;
};

export const damageTrigger = (entity) => entity.wasHit;

export default { updateIdleUntilTriggered, proximityTrigger, damageTrigger };
