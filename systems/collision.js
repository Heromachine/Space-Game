/**
 * Collision System
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract collision checks scattered through game.js
 * 2. Export: checkCircleCollision(a, b) - returns boolean
 * 3. Export: checkBulletEnemyCollisions(bullets, enemies) - returns { hits, remainingBullets }
 * 4. Export: checkPlayerEnemyCollisions(player, enemies, isGuarding)
 * 5. Export: checkPlayerBulletCollisions(player, bullets, isGuarding)
 *
 * Collision functions should DETECT only, not apply damage.
 * Return collision info, let caller handle effects.
 */

export function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function checkCircleCollision(a, radiusA, b, radiusB) {
    return distance(a, b) < radiusA + radiusB;
}

export function getEntityRadius(entity) {
    if (entity.radius) return entity.radius;
    if (entity.size) return entity.size / 2;
    return 10; // default
}

export function checkBulletEnemyCollisions(bullets, enemies) {
    const hits = [];  // { bullet, enemy, bulletIndex, enemyIndex }
    const hitBulletIndices = new Set();

    for (let i = 0; i < bullets.length; i++) {
        for (let j = 0; j < enemies.length; j++) {
            const b = bullets[i];
            const e = enemies[j];
            if (checkCircleCollision(b, b.radius, e, getEntityRadius(e))) {
                hits.push({ bullet: b, enemy: e, bulletIndex: i, enemyIndex: j });
                hitBulletIndices.add(i);
                break;  // bullet can only hit one enemy
            }
        }
    }

    return { hits, hitBulletIndices };
}

export function checkPlayerEnemyCollisions(player, enemies) {
    // TODO: Return array of colliding enemies
    return [];
}

export default { distance, checkCircleCollision, checkBulletEnemyCollisions };
