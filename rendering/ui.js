/**
 * UI Renderer
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract UI draw functions: drawHealthBar, drawLevelAnnouncement, drawCollectionCountdown, drawGameOver
 * 2. Export: renderUI(ctx, player, gameState, config)
 * 3. Use CONFIG.ui values for sizing/colors
 */

export function drawHealthBars(ctx, player, config) {
    // TODO: Extract from game.js drawHealthBar()
    // Draws health, stamina, money, mine bars
}

export function drawLevelAnnouncement(ctx, level, isBoss, startTime, canvasWidth, canvasHeight) {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed < 3) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = isBoss ? 'BOSS 1' : `Level ${level}`;
        ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
    }
}

export function drawCollectionCountdown(ctx, startTime, duration, canvasWidth, canvasHeight) {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Collect Gold!', canvasWidth / 2, canvasHeight / 2 - 40);

    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = seconds <= 3 ? '#ff0000' : '#ffff00';
    ctx.fillText(seconds, canvasWidth / 2, canvasHeight / 2 + 40);
}

export function drawGameOver(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2);

    ctx.font = '24px Arial';
    ctx.fillText('Click to restart', canvasWidth / 2, canvasHeight / 2 + 60);
}

export function renderUI(ctx, player, gameState, config) {
    drawHealthBars(ctx, player, config);

    if (gameState.levelAnnouncementTime) {
        drawLevelAnnouncement(ctx, gameState.level, gameState.isBoss,
            gameState.levelAnnouncementTime, ctx.canvas.width, ctx.canvas.height);
    }

    if (gameState.collectionPhase) {
        drawCollectionCountdown(ctx, gameState.collectionStartTime,
            gameState.collectionDuration, ctx.canvas.width, ctx.canvas.height);
    }

    if (gameState.gameOver) {
        drawGameOver(ctx, ctx.canvas.width, ctx.canvas.height);
    }
}

export default { renderUI, drawHealthBars, drawLevelAnnouncement, drawGameOver };
