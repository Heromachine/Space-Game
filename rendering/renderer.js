/**
 * Entity Renderer
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract draw functions from game.js: drawPlayer, drawEnemies, drawBullets, drawMines, drawGoldDrops
 * 2. Export: render(ctx, gameState) - draws all entities
 * 3. Each entity type can have custom render or use defaults (circle, square, triangle)
 *
 * Keep rendering separate from game logic.
 */

export function drawBackground(ctx, width, height) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
}

export function drawPlayer(ctx, player, isGuarding) {
    // TODO: Extract from game.js drawPlayer()
}

export function drawBullets(ctx, bullets) {
    bullets.forEach(bullet => {
        ctx.shadowBlur = 20;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

export function drawEnemies(ctx, enemies) {
    // TODO: Extract from game.js drawEnemies()
}

export function drawMines(ctx, mines) {
    // TODO: Extract from game.js drawMines()
}

export function drawGoldDrops(ctx, goldDrops, config) {
    // TODO: Extract from game.js drawGoldDrops()
}

export function render(ctx, gameState) {
    const { player, enemies, bullets, turretBullets, mines, goldDrops, isGuarding } = gameState;

    drawBackground(ctx, ctx.canvas.width, ctx.canvas.height);
    drawMines(ctx, mines);
    drawEnemies(ctx, enemies);
    drawGoldDrops(ctx, goldDrops);
    drawPlayer(ctx, player, isGuarding);
    drawBullets(ctx, bullets);
    drawBullets(ctx, turretBullets);
}

export default { render, drawBackground, drawPlayer, drawBullets, drawEnemies };
