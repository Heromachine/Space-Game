/**
 * Player Entity
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract player object and related functions from game.js
 * 2. Export: player object (state)
 * 3. Export: updatePlayer(player, keys, mouse, deltaTime)
 * 4. Export: resetPlayer(player, canvas)
 * 5. Export: playerActions: { shootBullet, placeMine, performGuardSmash, purchaseMine, purchaseHealth }
 *
 * Player needs: x, y, size, speed, rotation, health, stamina, money, mines
 */

export const player = {
    x: 0,
    y: 0,
    size: 20,
    speed: 5,
    rotation: 0,
    color: '#00ff00',
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegenRate: 10,
    money: 0,
    moneyRequired: 0,
    totalMoney: 0,
    mines: 5,
    maxMines: 5
};

export function updatePlayer(player, keys, mouse, deltaTime, isGuarding) {
    // TODO: Extract from game.js updatePlayer()
}

export function resetPlayer(player, canvasWidth, canvasHeight) {
    // TODO: Reset player to center, full health
}

export default { player, updatePlayer, resetPlayer };
