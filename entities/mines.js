/**
 * Mines
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract mine logic from game.js
 * 2. Export: createMine(x, y, config)
 * 3. Export: updateMines(mines, enemies, deltaTime, currentTime)
 * 4. Handle explosion state, damage ticks, removal
 */

export const mineConfig = {
    radius: 12,
    coreRadius: 6,
    explosionMaxRadius: 100,
    explosionDuration: 1000,
    damagePerTick: 5,
    tickRate: 100
};

export function createMine(x, y) {
    return {
        x, y,
        radius: mineConfig.radius,
        coreRadius: mineConfig.coreRadius,
        active: true,
        exploding: false,
        explosionStartTime: 0,
        explosionRadius: 0,
        lastDamageTick: 0
    };
}

export function updateMines(mines, enemies, deltaTime, currentTime) {
    // TODO: Extract from game.js updateMines()
    // Return { mines: survivingMines, kills: [...], goldDrops: [...] }
}

export default { mineConfig, createMine, updateMines };
