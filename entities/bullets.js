/**
 * Bullets & Projectiles
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract bullet logic from game.js
 * 2. Export: createBullet(x, y, angle, speed, config)
 * 3. Export: updateBullets(bullets, deltaTime, bounds) - returns bullets still alive
 * 4. Bullet types can have behaviors (homing, pathfind)
 *
 * BULLET CONFIG:
 * { speed, radius, color, damage, behaviors: [] }
 */

export const bulletTypes = {
    player: {
        speed: 10,
        radius: 5,
        color: '#ffff00',
        damage: 10,
        behaviors: []
    },
    turret: {
        speed: 6,
        radius: 4,
        color: '#ff0000',
        damage: 5,
        behaviors: []
    },
    homing: {
        speed: 8,
        radius: 6,
        color: '#ff00ff',
        damage: 15,
        behaviors: ['homing'],
        turnRate: Math.PI  // radians per second
    }
};

export function createBullet(x, y, angle, type = 'player') {
    const config = bulletTypes[type];
    return {
        x, y,
        vx: Math.cos(angle) * config.speed,
        vy: Math.sin(angle) * config.speed,
        ...config
    };
}

export function updateBullets(bullets, deltaTime, bounds) {
    // TODO: Update positions, run behaviors, filter out-of-bounds
    return bullets;
}

export default { bulletTypes, createBullet, updateBullets };
