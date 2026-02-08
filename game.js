const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const startButton = document.getElementById('startButton');

// Check if device is mobile and in portrait mode
function isMobilePortrait() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= CONFIG.display.mobileMaxWidth);
    const isPortrait = window.innerHeight > window.innerWidth;
    return isMobile && isPortrait;
}

// Calculate canvas size maintaining aspect ratio
function updateCanvasSize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Choose aspect ratio based on device orientation
    const targetAspect = isMobilePortrait()
        ? CONFIG.display.portraitAspectRatio
        : CONFIG.display.landscapeAspectRatio;

    let canvasWidth, canvasHeight;

    if (windowWidth / windowHeight > targetAspect) {
        // Window is wider than target aspect ratio - fit to height
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * targetAspect;
    } else {
        // Window is taller than target aspect ratio - fit to width
        canvasWidth = windowWidth;
        canvasHeight = canvasWidth / targetAspect;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
}

// Set initial canvas size
updateCanvasSize();

// Game state
let gameStarted = false;
let gameOver = false;
let keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let levelAnnouncementTime = 0;
let currentLevel = 1;
let playerOpacity = 1;
let deathTime = 0;
let isGuarding = false;
let rightMouseDown = false;
let leftMouseDown = false;
let lastShotTime = 0;
let shootCooldown = 200; // milliseconds between shots
let collectionPhase = false;
let collectionStartTime = 0;
let collectionDuration = 10000; // 10 seconds in milliseconds

// Delta time for frame-independent movement
let lastFrameTime = performance.now();
let deltaTime = 0;

// Player spaceship
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 5,
    rotation: 0,
    color: '#00ff00', // green
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegenRate: 10, // Stamina per second
    money: 0,
    moneyRequired: 0,
    totalMoney: 0, // Total coins collected across all levels
    mines: 5, // Current mine count
    maxMines: 5 // Maximum mines player can have
};

// Bullets array
const bullets = [];
const bulletSpeed = 10;
const bulletRadius = 5;

// Mines array
const mines = [];
const mineConfig = {
    radius: 12,
    coreRadius: 6,
    explosionMaxRadius: 100,
    explosionDuration: 1000, // 1 second
    damagePerTick: 5, // 5% damage per tick
    tickRate: 100 // Apply damage every 100ms
};

// Enemies array
const enemies = [];

// Turret bullets array
const turretBullets = [];

// Boss state
let isBossLevel = false;
let bossLeftTurretDestroyed = false;
let bossRightTurretDestroyed = false;
let bossLeftTurretRespawnTime = 0;
let bossRightTurretRespawnTime = 0;

// Gold drops array
const goldDrops = [];
const goldConfig = {
    radius: 10,
    color: '#ffff00', // yellow
    collectionRadius: 30
};

// Event listeners
window.addEventListener('resize', () => {
    updateCanvasSize();
    // Keep player within new bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    // Place mine on spacebar press
    if (e.key === ' ' && gameStarted && !gameOver) {
        placeMine();
    }

    // Purchase mine on 'b' key press
    if (e.key === 'b' && gameStarted && !gameOver) {
        purchaseMine();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    // Convert window coordinates to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameStarted && !gameOver) { // Left click
        leftMouseDown = true;
        if (isGuarding) {
            // Guard smash
            performGuardSmash();
        } else {
            shootBullet();
        }
    } else if (e.button === 2 && gameStarted && !gameOver) { // Right click
        rightMouseDown = true;
        isGuarding = true;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // Left mouse release
        leftMouseDown = false;
    } else if (e.button === 2) { // Right mouse release
        rightMouseDown = false;
        isGuarding = false;
    }
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent right-click context menu
});

window.addEventListener('click', (e) => {
    if (gameOver) {
        restartGame();
        return;
    }

    // Check if click is on health icon or mine icon (for purchasing)
    if (gameStarted && !gameOver) {
        const barWidth = CONFIG.ui.barWidth;
        const barHeight = CONFIG.ui.barHeight;
        const iconSize = barHeight;
        const padding = CONFIG.ui.barPadding;
        const barSpacing = CONFIG.ui.barSpacing;
        const healthIconX = canvas.width - padding - barWidth - iconSize - 10;
        const healthIconY = padding;

        // Convert window coordinates to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if click is within health icon bounds
        if (clickX >= healthIconX && clickX <= healthIconX + iconSize &&
            clickY >= healthIconY && clickY <= healthIconY + iconSize) {
            // Purchase health if conditions are met
            const totalCoins = player.money + player.totalMoney;
            if (totalCoins > 0 && player.health < player.maxHealth) {
                // Check if spending will still allow meeting the goal during collection phase
                if (collectionPhase) {
                    // Calculate total available coins after purchase
                    const totalAvailable = totalCoins - 1;
                    const minRequired = Math.ceil(player.moneyRequired * 0.5);
                    if (totalAvailable < minRequired) {
                        // Can't afford to spend - would fail level
                        return;
                    }
                }

                // Spend from totalMoney first, then from current level money
                if (player.totalMoney > 0) {
                    player.totalMoney--;
                } else {
                    player.money--;
                }

                player.health += 1;
                if (player.health > player.maxHealth) player.health = player.maxHealth;
            }
        }

        // Calculate mine icon position (below money bar)
        const mineIconX = healthIconX;
        const mineIconY = healthIconY + (barHeight + barSpacing) * 3; // Health, Stamina, Money, then Mine

        // Check if click is within mine icon bounds
        if (clickX >= mineIconX && clickX <= mineIconX + iconSize &&
            clickY >= mineIconY && clickY <= mineIconY + iconSize) {
            // Purchase mine
            purchaseMine();
        }
    }
});

startButton.addEventListener('click', async () => {
    // Load enemy data first
    if (!enemyManager.isLoaded()) {
        const loaded = await enemyManager.loadEnemyData();
        if (!loaded) {
            console.error('Failed to load enemy data!');
            return;
        }
    }

    gameStarted = true;
    menu.classList.add('hidden');
    levelAnnouncementTime = Date.now();
    spawnEnemies();
    gameLoop();
});

// Spawn enemies based on current level
function spawnEnemies() {
    enemies.length = 0; // Clear existing enemies
    goldDrops.length = 0; // Clear existing gold
    turretBullets.length = 0; // Clear turret bullets
    mines.length = 0; // Clear mines

    // Check if this is a boss level (every 10 levels)
    isBossLevel = enemyManager.isBossLevel(currentLevel);

    if (isBossLevel) {
        // Reset boss turret states
        bossLeftTurretDestroyed = false;
        bossRightTurretDestroyed = false;
        bossLeftTurretRespawnTime = 0;
        bossRightTurretRespawnTime = 0;

        // Spawn boss in center
        const bossX = canvas.width / 2;
        const bossY = canvas.height / 2;

        const boss = enemyManager.createEnemy('boss', bossX, bossY);
        boss.vx = 0;
        boss.vy = 0;
        boss.state = 'pursue';
        enemies.push(boss);

        // Get boss config for turret positioning
        const bossConfig = enemyManager.getEnemyConfig('boss');

        // Spawn left turret
        const leftTurret = enemyManager.createEnemy('boss-turret', bossX - bossConfig.size, bossY, true);
        leftTurret.vx = 0;
        leftTurret.vy = 0;
        leftTurret.type = 'boss-turret-left';
        leftTurret.bossAttached = true;
        enemies.push(leftTurret);

        // Spawn right turret
        const rightTurret = enemyManager.createEnemy('boss-turret', bossX + bossConfig.size, bossY, true);
        rightTurret.vx = 0;
        rightTurret.vy = 0;
        rightTurret.type = 'boss-turret-right';
        rightTurret.bossAttached = true;
        enemies.push(rightTurret);

        // Reset money tracking - only boss drops coin, turrets drop if destroyed before boss
        player.money = 0;
        player.moneyRequired = 1; // Only the boss drops required coin
    } else {
        // Normal level spawning - get spawn counts from enemy manager
        const blueCount = enemyManager.getSpawnCount('blue', currentLevel);
        const purpleCount = enemyManager.getSpawnCount('purple', currentLevel);
        const sentinelCount = enemyManager.getSpawnCount('sentinel', currentLevel);
        const turretCount = enemyManager.getSpawnCount('turret', currentLevel);

        // Reset money tracking for new level
        player.money = 0;
        const totalEnemies = blueCount + purpleCount + sentinelCount + turretCount;
        player.moneyRequired = totalEnemies; // Total coins that will drop from all enemies

        // Spawn blue enemies
        for (let i = 0; i < blueCount; i++) {
            let x, y;
            do {
                x = Math.random() * (canvas.width - 100) + 50;
                y = Math.random() * (canvas.height - 100) + 50;
            } while (Math.hypot(x - player.x, y - player.y) < 300);

            const enemy = enemyManager.createEnemy('blue', x, y);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.state = 'pursue';
            enemy.dashCooldownTimer = 0;
            enemies.push(enemy);
        }

        // Spawn purple enemies
        for (let i = 0; i < purpleCount; i++) {
            let x, y;
            do {
                x = Math.random() * (canvas.width - 100) + 50;
                y = Math.random() * (canvas.height - 100) + 50;
            } while (Math.hypot(x - player.x, y - player.y) < 300);

            const enemy = enemyManager.createEnemy('purple', x, y);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.state = 'idle';
            enemies.push(enemy);
        }

        // Spawn sentinel enemies
        for (let i = 0; i < sentinelCount; i++) {
            let x, y;
            do {
                x = Math.random() * (canvas.width - 100) + 50;
                y = Math.random() * (canvas.height - 100) + 50;
            } while (Math.hypot(x - player.x, y - player.y) < 300);

            const enemy = enemyManager.createEnemy('sentinel', x, y);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.state = 'idle';
            enemy.activated = false; // Track if sentinel has been shot
            enemies.push(enemy);
        }

        // Spawn turrets
        for (let i = 0; i < turretCount; i++) {
            let x, y;
            do {
                x = Math.random() * (canvas.width - 100) + 50;
                y = Math.random() * (canvas.height - 100) + 50;
            } while (Math.hypot(x - player.x, y - player.y) < 300);

            const enemy = enemyManager.createEnemy('turret', x, y);
            enemy.vx = 0;
            enemy.vy = 0;
            enemies.push(enemy);
        }
    }
}

// Shoot bullet function
function shootBullet() {
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        radius: bulletRadius,
        color: '#ffff00' // yellow
    });
    lastShotTime = Date.now();
}

// Guard smash function
function performGuardSmash() {
    // Check if player has enough stamina
    if (player.stamina < 20) return;

    // Deplete 20% stamina
    player.stamina -= 20;
    if (player.stamina < 0) player.stamina = 0;

    const smashRadius = 150;
    const strongPushForce = 50;
    const weakPushForce = 25;

    // Push all enemies within radius
    enemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);

        if (distance < smashRadius) {
            const angle = Math.atan2(dy, dx);

            // Check if enemy is in front of player (within 180 degrees of facing direction)
            const enemyAngle = Math.atan2(dy, dx);
            const angleDiff = Math.abs(((enemyAngle - player.rotation + Math.PI) % (2 * Math.PI)) - Math.PI);

            if (angleDiff < Math.PI / 2) {
                // Enemy in front - strong push
                enemy.x += Math.cos(angle) * strongPushForce;
                enemy.y += Math.sin(angle) * strongPushForce;
            } else {
                // Enemy behind - weak push
                enemy.x += Math.cos(angle) * weakPushForce;
                enemy.y += Math.sin(angle) * weakPushForce;
            }
        }
    });
}

// Place mine function
function placeMine() {
    if (player.mines <= 0) return; // No mines available

    player.mines--; // Consume a mine

    mines.push({
        x: player.x,
        y: player.y,
        radius: mineConfig.radius,
        coreRadius: mineConfig.coreRadius,
        active: true,
        exploding: false,
        explosionStartTime: 0,
        explosionRadius: 0,
        lastDamageTick: 0
    });
}

// Purchase mine function
function purchaseMine() {
    const totalCoins = player.money + player.totalMoney;
    const mineCost = 5;

    // Check if player has enough coins and is not at max mines
    if (totalCoins < mineCost || player.mines >= player.maxMines) return;

    // Check if spending will still allow meeting the goal during collection phase
    if (collectionPhase) {
        const totalAvailable = totalCoins - mineCost;
        const minRequired = Math.ceil(player.moneyRequired * 0.5);
        if (totalAvailable < minRequired) {
            // Can't afford to spend - would fail level
            return;
        }
    }

    // Spend coins (from totalMoney first, then from current level money)
    let remaining = mineCost;
    if (player.totalMoney >= remaining) {
        player.totalMoney -= remaining;
    } else {
        remaining -= player.totalMoney;
        player.totalMoney = 0;
        player.money -= remaining;
    }

    // Add a mine
    player.mines++;
}

// Update mines
function updateMines() {
    const currentTime = Date.now();

    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];

        if (mine.exploding) {
            // Update explosion animation
            const elapsed = currentTime - mine.explosionStartTime;
            const progress = elapsed / mineConfig.explosionDuration;

            if (progress >= 1) {
                // Explosion finished, remove mine
                mines.splice(i, 1);
                continue;
            }

            // Grow explosion radius
            mine.explosionRadius = mineConfig.explosionMaxRadius * progress;

            // Apply damage to enemies within explosion radius (every tick)
            if (currentTime - mine.lastDamageTick >= mineConfig.tickRate) {
                mine.lastDamageTick = currentTime;

                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dx = enemy.x - mine.x;
                    const dy = enemy.y - mine.y;
                    const distance = Math.hypot(dx, dy);

                    if (distance < mine.explosionRadius) {
                        // Activate sentinel if damaged by mine
                        if (enemy.type === 'sentinel' && !enemy.activated) {
                            enemy.activated = true;
                            enemy.state = 'chase';
                        }

                        // Apply damage
                        enemy.health -= mineConfig.damagePerTick;

                        // Check if enemy is dead
                        if (enemy.health <= 0) {
                            // Handle boss turret destruction
                            if (enemy.type === 'boss-turret-left') {
                                bossLeftTurretDestroyed = true;
                                bossLeftTurretRespawnTime = 0;
                                // Drop gold only if boss is alive
                                const boss = enemies.find(e => e.type === 'boss');
                                if (boss) {
                                    goldDrops.push({
                                        x: enemy.x,
                                        y: enemy.y
                                    });
                                }
                            } else if (enemy.type === 'boss-turret-right') {
                                bossRightTurretDestroyed = true;
                                bossRightTurretRespawnTime = 0;
                                // Drop gold only if boss is alive
                                const boss = enemies.find(e => e.type === 'boss');
                                if (boss) {
                                    goldDrops.push({
                                        x: enemy.x,
                                        y: enemy.y
                                    });
                                }
                            } else {
                                // Drop gold at enemy position
                                goldDrops.push({
                                    x: enemy.x,
                                    y: enemy.y
                                });
                            }

                            // Remove enemy
                            enemies.splice(j, 1);
                        }
                    }
                }
            }
        } else {
            // Check if any enemy touches the mine
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                const dx = enemy.x - mine.x;
                const dy = enemy.y - mine.y;
                const distance = Math.hypot(dx, dy);

                // Get enemy radius
                const enemyRadius = (enemy.type === 'turret' || enemy.type === 'boss-turret-left' || enemy.type === 'boss-turret-right') ? enemy.size / 2 : (enemy.type === 'boss' ? enemy.size / 2 : enemy.radius);

                if (distance < mine.radius + enemyRadius) {
                    // Trigger explosion
                    mine.exploding = true;
                    mine.explosionStartTime = currentTime;
                    mine.lastDamageTick = currentTime;
                    break;
                }
            }
        }
    }
}

// Update player position
function updatePlayer() {
    // WASD movement (multiply by deltaTime for frame-independent movement)
    // Speed is in pixels per second, so multiply by deltaTime (seconds per frame)
    const moveSpeed = player.speed * 60; // Convert to pixels per second (5 * 60 = 300 px/s)
    if (keys['w']) player.y -= moveSpeed * deltaTime;
    if (keys['s']) player.y += moveSpeed * deltaTime;
    if (keys['a']) player.x -= moveSpeed * deltaTime;
    if (keys['d']) player.x += moveSpeed * deltaTime;

    // Keep player within bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    // Calculate rotation towards mouse
    player.rotation = Math.atan2(mouseY - player.y, mouseX - player.x);

    // Regenerate stamina (deltaTime already in seconds)
    if (player.stamina < player.maxStamina && !isGuarding) {
        player.stamina += player.staminaRegenRate * deltaTime;
        if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
    }

    // Auto-fire when holding left mouse button
    if (leftMouseDown && !isGuarding) {
        const currentTime = Date.now();
        if (currentTime - lastShotTime >= shootCooldown) {
            shootBullet();
        }
    }

    // Collect gold drops
    for (let i = goldDrops.length - 1; i >= 0; i--) {
        const dx = player.x - goldDrops[i].x;
        const dy = player.y - goldDrops[i].y;
        const distance = Math.hypot(dx, dy);

        if (distance < goldConfig.collectionRadius) {
            player.money++;
            goldDrops.splice(i, 1);
        }
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].vx * deltaTime * 60; // Scale velocity by deltaTime
        bullets[i].y += bullets[i].vy * deltaTime * 60;

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const dx = bullets[i].x - enemies[j].x;
            const dy = bullets[i].y - enemies[j].y;
            const distance = Math.hypot(dx, dy);

            // Check collision based on enemy type
            let enemyRadius;
            if (enemies[j].type === 'turret' || enemies[j].type === 'boss-turret-left' || enemies[j].type === 'boss-turret-right') {
                enemyRadius = enemies[j].size / 2;
            } else if (enemies[j].type === 'boss') {
                enemyRadius = enemies[j].size / 2;
            } else {
                enemyRadius = enemies[j].radius;
            }

            if (distance < bullets[i].radius + enemyRadius) {
                // Activate sentinel if hit
                if (enemies[j].type === 'sentinel' && !enemies[j].activated) {
                    enemies[j].activated = true;
                    enemies[j].state = 'chase';
                }

                // Calculate damage
                let damage = 10;

                // Boss takes different damage based on turrets alive
                if (enemies[j].type === 'boss') {
                    const leftTurret = enemies.find(e => e.type === 'boss-turret-left');
                    const rightTurret = enemies.find(e => e.type === 'boss-turret-right');
                    const turretsAlive = (leftTurret ? 1 : 0) + (rightTurret ? 1 : 0);

                    if (turretsAlive === 0) {
                        damage *= 1.5; // 150% damage (both turrets destroyed)
                    } else if (turretsAlive === 1) {
                        damage *= 1.0; // 100% damage (one turret destroyed)
                    } else {
                        damage *= 0.5; // 50% damage (both turrets alive)
                    }
                }

                // Hit enemy
                enemies[j].health -= damage;
                bullets.splice(i, 1);

                // Remove enemy if dead and drop gold
                if (enemies[j].health <= 0) {
                    // Handle boss turret destruction
                    if (enemies[j].type === 'boss-turret-left') {
                        bossLeftTurretDestroyed = true;
                        bossLeftTurretRespawnTime = 0;
                        // Drop gold only if boss is alive
                        const boss = enemies.find(e => e.type === 'boss');
                        if (boss) {
                            goldDrops.push({
                                x: enemies[j].x,
                                y: enemies[j].y
                            });
                        }
                    } else if (enemies[j].type === 'boss-turret-right') {
                        bossRightTurretDestroyed = true;
                        bossRightTurretRespawnTime = 0;
                        // Drop gold only if boss is alive
                        const boss = enemies.find(e => e.type === 'boss');
                        if (boss) {
                            goldDrops.push({
                                x: enemies[j].x,
                                y: enemies[j].y
                            });
                        }
                    } else {
                        // Drop gold at enemy position
                        goldDrops.push({
                            x: enemies[j].x,
                            y: enemies[j].y
                        });
                    }
                    enemies.splice(j, 1);
                }
                break;
            }
        }

        // Remove bullets that go off screen
        if (bullets[i] && (bullets[i].x < 0 || bullets[i].x > canvas.width ||
            bullets[i].y < 0 || bullets[i].y > canvas.height)) {
            bullets.splice(i, 1);
        }
    }
}

// Update enemies
function updateEnemies() {
    // Pause enemies when game is over
    if (gameOver) return;

    const currentTime = Date.now();

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);

        if (enemy.type === 'blue') {
            // Blue enemy behavior (original)
            // Update state based on cooldown
            if (enemy.state === 'dormant' && currentTime - enemy.lastDashTime >= enemy.dashCooldown) {
                enemy.state = 'pursue';
            }

            // Check if player is within dash radius
            if (enemy.state === 'pursue' && distance <= enemy.dashRadius) {
                enemy.state = 'dash';
                enemy.lastDashTime = currentTime;

                // Set dash velocity
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.dashSpeed;
                enemy.vy = Math.sin(angle) * enemy.dashSpeed;
            } else if (enemy.state === 'dash') {
                // Continue dashing for a short time (0.3 seconds)
                if (currentTime - enemy.lastDashTime >= 300) {
                    enemy.state = 'dormant';
                    enemy.vx = 0;
                    enemy.vy = 0;
                }
            } else if (enemy.state === 'pursue') {
                // Slowly move towards player
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            }
        } else if (enemy.type === 'phantom') {
            // Phantom behavior - blue-like with bullet evasion by orbiting player
            // Wake from dormant
            if (enemy.state === 'dormant' && currentTime - enemy.lastDashTime >= enemy.dashCooldown) {
                enemy.state = 'pursue';
            }

            // Check for incoming bullets (only if gauge not full and in pursue state)
            let shouldEvade = false;
            if (enemy.state === 'pursue' && enemy.evadeGauge < enemy.evadeGaugeMax) {
                for (let b = 0; b < bullets.length; b++) {
                    const bullet = bullets[b];
                    const bdx = enemy.x - bullet.x;
                    const bdy = enemy.y - bullet.y;
                    const bulletDist = Math.hypot(bdx, bdy);

                    if (bulletDist < enemy.evadeRange) {
                        // Check if bullet is heading toward us
                        const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
                        const angleToEnemy = Math.atan2(bdy, bdx);
                        let headingDiff = bulletAngle - angleToEnemy;
                        headingDiff = Math.atan2(Math.sin(headingDiff), Math.cos(headingDiff));

                        if (Math.abs(headingDiff) < Math.PI / 3) {
                            shouldEvade = true;
                            break;
                        }
                    }
                }
            }

            if (shouldEvade) {
                // Orbit around the player perpendicular to approach line
                enemy.state = 'evade';
                const angleFromPlayer = Math.atan2(-dy, -dx);
                const orbitAngle = angleFromPlayer + (Math.PI / 2) * enemy.evadeDir;
                enemy.vx = Math.cos(orbitAngle) * enemy.dashSpeed * 0.7;
                enemy.vy = Math.sin(orbitAngle) * enemy.dashSpeed * 0.7;
                enemy.evadeGauge += enemy.evadeRate * deltaTime;
                if (enemy.evadeGauge > enemy.evadeGaugeMax) enemy.evadeGauge = enemy.evadeGaugeMax;

                // Track trail
                enemy.evadeTrail.push({ x: enemy.x, y: enemy.y, alpha: 0.4 });
                if (enemy.evadeTrail.length > 5) enemy.evadeTrail.shift();
            } else if (enemy.state === 'evade') {
                // No more bullets to dodge, return to pursue
                enemy.state = 'pursue';
            }

            // Dash when close enough
            if (enemy.state === 'pursue' && distance <= enemy.dashRadius) {
                enemy.state = 'dash';
                enemy.lastDashTime = currentTime;
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.dashSpeed;
                enemy.vy = Math.sin(angle) * enemy.dashSpeed;
            } else if (enemy.state === 'dash') {
                if (currentTime - enemy.lastDashTime >= 300) {
                    enemy.state = 'dormant';
                    enemy.vx = 0;
                    enemy.vy = 0;
                }
            } else if (enemy.state === 'pursue') {
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            }

            // Fade trail
            for (let t = enemy.evadeTrail.length - 1; t >= 0; t--) {
                enemy.evadeTrail[t].alpha -= 1.5 * deltaTime;
                if (enemy.evadeTrail[t].alpha <= 0) enemy.evadeTrail.splice(t, 1);
            }
        } else if (enemy.type === 'purple') {
            // Purple enemy behavior
            if (enemy.state === 'idle') {
                // Check if player is within activation radius
                if (distance <= enemy.activationRadius) {
                    enemy.state = 'chase';
                }
                // Stay still when idle
                enemy.vx = 0;
                enemy.vy = 0;
            } else if (enemy.state === 'chase') {
                // Continuously chase player at faster speed
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            }
        } else if (enemy.type === 'sentinel') {
            // Sentinel enemy behavior - idle until shot, then chase
            if (enemy.state === 'idle' && !enemy.activated) {
                // Stay still when idle and not activated
                enemy.vx = 0;
                enemy.vy = 0;
            } else if (enemy.activated || enemy.state === 'chase') {
                // Chase player when activated
                enemy.state = 'chase';
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            }
        } else if (enemy.type === 'watcher') {
            // Watcher behavior - cone-based line of sight with peripheral vision
            // and last-known-position investigation
            const angleToPlayer = Math.atan2(dy, dx);
            let angleDiff = angleToPlayer - enemy.facingAngle;
            // Normalize to [-PI, PI]
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            const inRange = distance <= enemy.sightRange;
            const inMainCone = Math.abs(angleDiff) <= enemy.fov / 2;
            const totalFov = enemy.fov + enemy.peripheralFov;
            const inPeripheral = Math.abs(angleDiff) <= totalFov / 2;
            const wasAware = enemy.state === 'chase' || enemy.state === 'caution';

            if (inRange && inMainCone) {
                // Main cone - chase the player
                enemy.state = 'chase';
                enemy.facingAngle = angleToPlayer;
                enemy.lastSeenX = player.x;
                enemy.lastSeenY = player.y;
                enemy.lastSeenRotation = player.rotation;
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            } else if (inRange && inPeripheral) {
                // Peripheral vision - slowly rotate toward player, don't move
                if (enemy.state !== 'caution' && wasAware) {
                    // Transitioning from chase to peripheral - save last seen
                    enemy.lastSeenX = player.x;
                    enemy.lastSeenY = player.y;
                    enemy.lastSeenRotation = player.rotation;
                }
                enemy.state = 'caution';
                enemy.vx = 0;
                enemy.vy = 0;
                const rotateDir = angleDiff > 0 ? 1 : -1;
                enemy.facingAngle += rotateDir * enemy.turnSpeed * deltaTime;
            } else if (wasAware && enemy.lastSeenX !== undefined) {
                // Lost sight - go investigate last known position
                enemy.state = 'investigate';
                enemy.vx = 0;
                enemy.vy = 0;
            } else if (enemy.state === 'investigate') {
                // Walk toward last known position
                const dxLast = enemy.lastSeenX - enemy.x;
                const dyLast = enemy.lastSeenY - enemy.y;
                const distToLast = Math.hypot(dxLast, dyLast);

                // Face toward the last seen position
                enemy.facingAngle = Math.atan2(dyLast, dxLast);

                if (distToLast > 10) {
                    // Still moving toward the spot
                    const angle = Math.atan2(dyLast, dxLast);
                    enemy.vx = Math.cos(angle) * enemy.speed * 0.6;
                    enemy.vy = Math.sin(angle) * enemy.speed * 0.6;
                } else {
                    // Arrived - start scanning
                    enemy.state = 'scanning';
                    enemy.vx = 0;
                    enemy.vy = 0;
                    enemy.scanStartAngle = enemy.facingAngle;
                    enemy.scanProgress = 0;
                }

                // Check if player re-enters vision while investigating
                if (inRange && inMainCone) {
                    enemy.state = 'chase';
                    enemy.facingAngle = angleToPlayer;
                    enemy.lastSeenX = player.x;
                    enemy.lastSeenY = player.y;
                    enemy.lastSeenRotation = player.rotation;
                    const angle = Math.atan2(dy, dx);
                    enemy.vx = Math.cos(angle) * enemy.speed;
                    enemy.vy = Math.sin(angle) * enemy.speed;
                } else if (inRange && inPeripheral) {
                    enemy.state = 'caution';
                    enemy.vx = 0;
                    enemy.vy = 0;
                }
            } else if (enemy.state === 'scanning') {
                // Rotate 360 degrees scanning for player
                enemy.vx = 0;
                enemy.vy = 0;
                const scanSpeed = 1.5; // radians per second
                enemy.scanProgress += scanSpeed * deltaTime;
                enemy.facingAngle = enemy.scanStartAngle + enemy.scanProgress;

                // Check if player enters vision during scan
                // Recalculate angleDiff with updated facingAngle
                let scanAngleDiff = angleToPlayer - enemy.facingAngle;
                scanAngleDiff = Math.atan2(Math.sin(scanAngleDiff), Math.cos(scanAngleDiff));
                const scanInMainCone = Math.abs(scanAngleDiff) <= enemy.fov / 2;
                const scanInPeripheral = Math.abs(scanAngleDiff) <= totalFov / 2;

                if (inRange && scanInMainCone) {
                    enemy.state = 'chase';
                    enemy.lastSeenX = player.x;
                    enemy.lastSeenY = player.y;
                    enemy.lastSeenRotation = player.rotation;
                    enemy.facingAngle = angleToPlayer;
                    const angle = Math.atan2(dy, dx);
                    enemy.vx = Math.cos(angle) * enemy.speed;
                    enemy.vy = Math.sin(angle) * enemy.speed;
                } else if (inRange && scanInPeripheral) {
                    enemy.state = 'caution';
                    enemy.vx = 0;
                    enemy.vy = 0;
                } else if (enemy.scanProgress >= Math.PI * 2) {
                    // Full rotation done, nothing found - go idle and clear ghost
                    enemy.state = 'idle';
                    enemy.lastSeenX = undefined;
                    enemy.lastSeenY = undefined;
                }
            } else {
                enemy.state = 'idle';
                enemy.vx = 0;
                enemy.vy = 0;
            }
        } else if (enemy.type === 'screamer') {
            // Screamer behavior - cone vision with alertness gauge and scream
            // Screamer stays back; on scream, creates a ghost and sends others to investigate
            const angleToPlayer = Math.atan2(dy, dx);
            let angleDiff = angleToPlayer - enemy.facingAngle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            const inRange = distance <= enemy.sightRange;
            const inMainCone = Math.abs(angleDiff) <= enemy.fov / 2;
            const totalFov = enemy.fov + enemy.peripheralFov;
            const inPeripheral = Math.abs(angleDiff) <= totalFov / 2;

            // Helper: trigger scream and send enemies to investigate
            const triggerScream = () => {
                enemy.alertness = 100;
                enemy.isScreaming = true;
                enemy.screamTime = currentTime;

                // Create ghost at player's current position
                enemy.ghostX = player.x;
                enemy.ghostY = player.y;
                enemy.ghostRotation = player.rotation;

                // Alert all enemies within scream radius
                for (let k = 0; k < enemies.length; k++) {
                    if (k === i) continue;
                    const other = enemies[k];
                    const sdx = other.x - enemy.x;
                    const sdy = other.y - enemy.y;
                    const sDist = Math.hypot(sdx, sdy);

                    if (sDist <= enemy.screamRadius) {
                        // Watchers/screamers: send to investigate the ghost
                        if (other.type === 'watcher' || other.type === 'screamer') {
                            other.lastSeenX = player.x;
                            other.lastSeenY = player.y;
                            other.lastSeenRotation = player.rotation;
                            other.state = 'investigate';
                            other.vx = 0;
                            other.vy = 0;
                        } else if (other.facingAngle !== undefined) {
                            // Other FOV enemies: turn to face the ghost
                            other.facingAngle = Math.atan2(player.y - other.y, player.x - other.x);
                        }
                        // Activate sentinels
                        if (other.type === 'sentinel' && !other.activated) {
                            other.activated = true;
                            other.state = 'chase';
                        }
                    }
                }
            };

            // Handle active scream effect
            if (enemy.isScreaming) {
                enemy.vx = 0;
                enemy.vy = 0;
                const screamElapsed = currentTime - enemy.screamTime;
                if (screamElapsed >= 600) {
                    enemy.isScreaming = false;
                    enemy.screamCooldown = currentTime;
                    enemy.alertness = 0;
                }
            } else if (inRange && inMainCone) {
                // Player in main cone - build alertness fast
                enemy.state = 'alert';
                enemy.facingAngle = angleToPlayer;
                enemy.alertness += enemy.alertRate * deltaTime;
                enemy.vx = 0;
                enemy.vy = 0;

                if (enemy.alertness >= 100 && (currentTime - enemy.screamCooldown >= 5000)) {
                    triggerScream();
                }
            } else if (inRange && inPeripheral) {
                // Peripheral - build alertness slowly, rotate toward player
                enemy.state = 'caution';
                enemy.alertness += (enemy.alertRate * 0.4) * deltaTime;
                enemy.vx = 0;
                enemy.vy = 0;
                const rotateDir = angleDiff > 0 ? 1 : -1;
                enemy.facingAngle += rotateDir * enemy.turnSpeed * deltaTime;

                if (enemy.alertness >= 100 && (currentTime - enemy.screamCooldown >= 5000)) {
                    triggerScream();
                }
            } else {
                // Not detected - decay alertness
                enemy.state = 'idle';
                enemy.alertness -= enemy.alertDecayRate * deltaTime;
                if (enemy.alertness < 0) enemy.alertness = 0;
                enemy.vx = 0;
                enemy.vy = 0;
            }

            // Clear ghost after no enemies are investigating it
            if (enemy.ghostX !== undefined && !enemy.isScreaming) {
                const anyInvestigating = enemies.some(other =>
                    other !== enemy &&
                    (other.state === 'investigate' || other.state === 'scanning') &&
                    other.lastSeenX === enemy.ghostX &&
                    other.lastSeenY === enemy.ghostY
                );
                if (!anyInvestigating) {
                    enemy.ghostX = undefined;
                    enemy.ghostY = undefined;
                }
            }
        } else if (enemy.type === 'turret') {
            // Turret behavior - stationary but shoots at player
            enemy.vx = 0;
            enemy.vy = 0;

            // Shoot at player if cooldown is ready
            if (currentTime - enemy.lastShotTime >= enemy.shootCooldown) {
                const angle = Math.atan2(dy, dx);
                turretBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * enemy.bulletSpeed,
                    vy: Math.sin(angle) * enemy.bulletSpeed,
                    radius: enemy.bulletRadius,
                    color: '#ff0000', // red bullets
                    damage: enemy.damage
                });
                enemy.lastShotTime = currentTime;
            }
        } else if (enemy.type === 'boss') {
            // Boss behavior - similar to blue enemy with dash
            if (enemy.state === 'dormant' && currentTime - enemy.lastDashTime >= enemy.dashCooldown) {
                enemy.state = 'pursue';
            }

            if (enemy.state === 'pursue' && distance <= enemy.dashRadius) {
                enemy.state = 'dash';
                enemy.lastDashTime = currentTime;

                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.dashSpeed;
                enemy.vy = Math.sin(angle) * enemy.dashSpeed;
            } else if (enemy.state === 'dash') {
                if (currentTime - enemy.lastDashTime >= 300) {
                    enemy.state = 'dormant';
                    enemy.vx = 0;
                    enemy.vy = 0;
                }
            } else if (enemy.state === 'pursue') {
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * enemy.speed;
                enemy.vy = Math.sin(angle) * enemy.speed;
            }
        } else if (enemy.type === 'boss-turret-left' || enemy.type === 'boss-turret-right') {
            // Boss turret behavior - attached to boss position
            const boss = enemies.find(e => e.type === 'boss');
            if (boss && enemy.bossAttached) {
                // Update turret position relative to boss
                const offsetX = enemy.type === 'boss-turret-left' ? -boss.size : boss.size;
                enemy.x = boss.x + offsetX;
                enemy.y = boss.y;
            }
            enemy.vx = 0;
            enemy.vy = 0;

            // Shoot at player if cooldown is ready
            if (currentTime - enemy.lastShotTime >= enemy.shootCooldown) {
                const angle = Math.atan2(dy, dx);
                turretBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * enemy.bulletSpeed,
                    vy: Math.sin(angle) * enemy.bulletSpeed,
                    radius: enemy.bulletRadius,
                    color: '#ff0000', // red bullets
                    damage: enemy.damage
                });
                enemy.lastShotTime = currentTime;
            }
        }

        // Update position (scale velocity by deltaTime)
        enemy.x += enemy.vx * deltaTime * 60;
        enemy.y += enemy.vy * deltaTime * 60;

        // Check collision with other enemies to prevent overlapping
        for (let k = 0; k < enemies.length; k++) {
            if (k === i) continue; // Skip self

            const otherEnemy = enemies[k];
            const dx2 = otherEnemy.x - enemy.x;
            const dy2 = otherEnemy.y - enemy.y;
            const distance2 = Math.hypot(dx2, dy2);

            // Get radii for both enemies
            const enemyRadius1 = (enemy.type === 'turret' || enemy.type === 'boss-turret-left' || enemy.type === 'boss-turret-right') ? enemy.size / 2 : (enemy.type === 'boss' ? enemy.size / 2 : enemy.radius);
            const enemyRadius2 = (otherEnemy.type === 'turret' || otherEnemy.type === 'boss-turret-left' || otherEnemy.type === 'boss-turret-right') ? otherEnemy.size / 2 : (otherEnemy.type === 'boss' ? otherEnemy.size / 2 : otherEnemy.radius);

            const minDistance = enemyRadius1 + enemyRadius2;

            if (distance2 < minDistance) {
                // Push enemies apart
                const pushAngle = Math.atan2(enemy.y - otherEnemy.y, enemy.x - otherEnemy.x);
                const overlap = minDistance - distance2;
                const pushForce = overlap / 2;

                // Don't push boss turrets (they're attached to boss)
                if (enemy.type !== 'boss-turret-left' && enemy.type !== 'boss-turret-right') {
                    enemy.x += Math.cos(pushAngle) * pushForce;
                    enemy.y += Math.sin(pushAngle) * pushForce;
                }

                if (otherEnemy.type !== 'boss-turret-left' && otherEnemy.type !== 'boss-turret-right') {
                    otherEnemy.x -= Math.cos(pushAngle) * pushForce;
                    otherEnemy.y -= Math.sin(pushAngle) * pushForce;
                }
            }
        }

        // Check collision with player (only for non-turret, non-boss-turret enemies)
        const collisionRadius = (enemy.type === 'turret' || enemy.type === 'boss-turret-left' || enemy.type === 'boss-turret-right') ? enemy.size / 2 : (enemy.type === 'boss' ? enemy.size / 2 : enemy.radius);
        const isCollidableEnemy = enemy.type !== 'turret' && enemy.type !== 'boss-turret-left' && enemy.type !== 'boss-turret-right';
        if (distance < collisionRadius + player.size && !gameOver && isCollidableEnemy) {
            const damage = enemy.damage;

            if (isGuarding && player.stamina > 0) {
                // Guard blocks damage, depletes stamina instead
                player.stamina -= damage;
                if (player.stamina < 0) player.stamina = 0;
            } else {
                // Take damage to health
                player.health -= damage;
                if (player.health < 0) player.health = 0;
            }

            // Push enemy back
            const pushAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            enemy.x += Math.cos(pushAngle) * 20;
            enemy.y += Math.sin(pushAngle) * 20;
        }
    }

    // Handle boss turret respawning
    if (isBossLevel) {
        const boss = enemies.find(e => e.type === 'boss');
        if (boss) {
            const leftTurret = enemies.find(e => e.type === 'boss-turret-left');
            const rightTurret = enemies.find(e => e.type === 'boss-turret-right');

            // Check if left turret needs respawning
            if (!leftTurret && bossLeftTurretDestroyed) {
                if (bossLeftTurretRespawnTime === 0) {
                    bossLeftTurretRespawnTime = currentTime;
                } else if (currentTime - bossLeftTurretRespawnTime >= 10000) { // 10 seconds
                    // Respawn left turret
                    const bossConfig = enemyManager.getEnemyConfig('boss');
                    const leftTurret = enemyManager.createEnemy('boss-turret', boss.x - bossConfig.size, boss.y, true);
                    leftTurret.vx = 0;
                    leftTurret.vy = 0;
                    leftTurret.type = 'boss-turret-left';
                    leftTurret.bossAttached = true;
                    enemies.push(leftTurret);
                    bossLeftTurretDestroyed = false;
                    bossLeftTurretRespawnTime = 0;
                }
            }

            // Check if right turret needs respawning
            if (!rightTurret && bossRightTurretDestroyed) {
                if (bossRightTurretRespawnTime === 0) {
                    bossRightTurretRespawnTime = currentTime;
                } else if (currentTime - bossRightTurretRespawnTime >= 10000) { // 10 seconds
                    // Respawn right turret
                    const bossConfig = enemyManager.getEnemyConfig('boss');
                    const rightTurret = enemyManager.createEnemy('boss-turret', boss.x + bossConfig.size, boss.y, true);
                    rightTurret.vx = 0;
                    rightTurret.vy = 0;
                    rightTurret.type = 'boss-turret-right';
                    rightTurret.bossAttached = true;
                    enemies.push(rightTurret);
                    bossRightTurretDestroyed = false;
                    bossRightTurretRespawnTime = 0;
                }
            }
        }
    }

    // Check if all enemies are defeated
    if (enemies.length === 0 && gameStarted && !gameOver && !collectionPhase) {
        // Start collection phase
        collectionPhase = true;
        collectionStartTime = Date.now();
    }
}

// Update turret bullets
function updateTurretBullets() {
    for (let i = turretBullets.length - 1; i >= 0; i--) {
        const bullet = turretBullets[i];
        bullet.x += bullet.vx * deltaTime * 60; // Scale velocity by deltaTime
        bullet.y += bullet.vy * deltaTime * 60;

        // Check collision with player
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.hypot(dx, dy);

        if (distance < bullet.radius + player.size) {
            // Hit player
            if (isGuarding && player.stamina > 0) {
                // Guard blocks damage, depletes stamina instead
                player.stamina -= bullet.damage;
                if (player.stamina < 0) player.stamina = 0;
            } else {
                // Take damage to health
                player.health -= bullet.damage;
                if (player.health < 0) player.health = 0;
            }
            turretBullets.splice(i, 1);
            continue;
        }

        // Remove bullets that go off screen
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            turretBullets.splice(i, 1);
        }
    }
}

// Update collection phase
function updateCollectionPhase() {
    if (!collectionPhase) return;

    const currentTime = Date.now();
    const elapsed = currentTime - collectionStartTime;

    if (elapsed >= collectionDuration) {
        // Collection time is up
        collectionPhase = false;

        // Check if player collected enough gold (50% of total)
        const minRequired = Math.ceil(player.moneyRequired * 0.5);
        const totalCollected = player.money + player.totalMoney;
        if (totalCollected >= minRequired) {
            nextLevel();
        } else {
            // Game over - didn't collect enough gold
            gameOver = true;
            deathTime = Date.now();
        }
    }
}

// Start next level
function nextLevel() {
    // Transfer current level coins to total money (rollover)
    player.totalMoney += player.money;

    currentLevel++;
    collectionPhase = false;
    levelAnnouncementTime = Date.now();
    spawnEnemies();
}

// Restart game
function restartGame() {
    gameOver = false;
    gameStarted = true;
    currentLevel = 1;
    playerOpacity = 1;
    isGuarding = false;
    rightMouseDown = false;
    leftMouseDown = false;
    collectionPhase = false;

    // Reset player
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = player.maxHealth;
    player.stamina = player.maxStamina;
    player.totalMoney = 0; // Clear total money on game over
    player.mines = player.maxMines; // Reset mines to max

    // Clear bullets
    bullets.length = 0;
    turretBullets.length = 0;
    mines.length = 0;

    // Spawn enemies
    levelAnnouncementTime = Date.now();
    spawnEnemies();
}

// Check player death
function checkPlayerDeath() {
    if (player.health <= 0 && !gameOver) {
        gameOver = true;
        deathTime = Date.now();
    }

    // Fade out player
    if (gameOver) {
        const elapsed = (Date.now() - deathTime) / 1000;
        playerOpacity = Math.max(0, 1 - elapsed);
    }
}

// Draw player spaceship (triangle)
function drawPlayer() {
    ctx.save();
    ctx.globalAlpha = playerOpacity;
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.size, 0); // Front point
    ctx.lineTo(-player.size, -player.size / 2); // Back left
    ctx.lineTo(-player.size, player.size / 2); // Back right
    ctx.closePath();
    ctx.fill();

    // Draw guard line if guarding
    if (isGuarding) {
        ctx.strokeStyle = '#ffffff'; // white
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(player.size + 5, -15);
        ctx.lineTo(player.size + 5, 15);
        ctx.stroke();
    }

    ctx.restore();
}

// Draw bullets
function drawBullets() {
    bullets.forEach(bullet => {
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = bullet.color;

        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
    });
}

// Draw turret bullets
function drawTurretBullets() {
    turretBullets.forEach(bullet => {
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = bullet.color;

        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
    });
}

// Draw a single ghost outline at a position
function drawGhostAt(gx, gy, rotation, color) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.translate(gx, gy);
    ctx.rotate(rotation || 0);

    // Draw player outline (same triangle shape, stroke only)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(player.size, 0);
    ctx.lineTo(-player.size, -player.size / 2);
    ctx.lineTo(-player.size, player.size / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw a small "?" above the ghost
    ctx.rotate(-(rotation || 0)); // Undo rotation for text
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('?', 0, -player.size - 5);

    ctx.restore();
}

// Draw ghost outlines at last-seen positions (watchers and screamers)
function drawWatcherGhosts() {
    // Track drawn positions to avoid duplicates
    const drawn = [];

    // Watcher self-ghosts (from their own investigate/scanning)
    enemies.forEach(enemy => {
        if (enemy.type !== 'watcher') return;
        if (enemy.lastSeenX === undefined) return;
        if (enemy.state !== 'investigate' && enemy.state !== 'scanning') return;

        drawn.push({ x: enemy.lastSeenX, y: enemy.lastSeenY });
        drawGhostAt(enemy.lastSeenX, enemy.lastSeenY, enemy.lastSeenRotation, '#00ffcc');
    });

    // Screamer ghosts (from scream alerts)
    enemies.forEach(enemy => {
        if (enemy.type !== 'screamer') return;
        if (enemy.ghostX === undefined) return;

        // Skip if already drawn at this position by a watcher
        const alreadyDrawn = drawn.some(d =>
            Math.abs(d.x - enemy.ghostX) < 5 && Math.abs(d.y - enemy.ghostY) < 5
        );
        if (!alreadyDrawn) {
            drawGhostAt(enemy.ghostX, enemy.ghostY, enemy.ghostRotation, '#ff6666');
        }
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'turret' || enemy.type === 'boss-turret-left' || enemy.type === 'boss-turret-right') {
            // Draw turret as orange square
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);

            // Draw health bar for turret
            const barWidth = enemy.size;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.size / 2 + 5;

            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            const healthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000'; // red
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        } else if (enemy.type === 'boss') {
            // Draw boss as yellow octagon
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            const sides = 8;
            const radius = enemy.size / 2;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = enemy.x + radius * Math.cos(angle);
                const y = enemy.y + radius * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();

            // Draw health bar for boss
            const barWidth = enemy.size * 1.5;
            const barHeight = 8;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - enemy.size / 2 - 15;

            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            const healthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000'; // red
            ctx.fillRect(barX, barY, healthWidth, barHeight);

            // Draw "BOSS 1" text above health bar
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('BOSS 1', enemy.x, barY - 5);
        } else if (enemy.type === 'sentinel') {
            // Draw sentinel with outer blue circle and darker blue core
            // Outer blue circle
            ctx.fillStyle = enemy.color; // #0000ff
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner darker blue core
            ctx.fillStyle = '#000080'; // Darker blue
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Draw health bar
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.radius + 5;

            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            const healthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000'; // red
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        } else if (enemy.type === 'watcher') {
            // Draw watcher - teal circle with cone FOV and peripheral vision

            const coneStartAngle = enemy.facingAngle - enemy.fov / 2;
            const coneEndAngle = enemy.facingAngle + enemy.fov / 2;
            const totalFov = enemy.fov + enemy.peripheralFov;
            const periStartAngle = enemy.facingAngle - totalFov / 2;
            const periEndAngle = enemy.facingAngle + totalFov / 2;

            // Draw peripheral zones (amber/yellow tint)
            if (enemy.state === 'caution') {
                ctx.fillStyle = 'rgba(204, 170, 0, 0.10)';
                ctx.strokeStyle = 'rgba(204, 170, 0, 0.35)';
            } else {
                ctx.fillStyle = 'rgba(204, 170, 0, 0.04)';
                ctx.strokeStyle = 'rgba(204, 170, 0, 0.12)';
            }

            // Left peripheral wedge
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, periStartAngle, coneStartAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right peripheral wedge
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, coneEndAngle, periEndAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw main sight cone (teal)
            if (enemy.state === 'chase') {
                ctx.fillStyle = 'rgba(0, 204, 204, 0.12)';
                ctx.strokeStyle = 'rgba(0, 204, 204, 0.4)';
            } else {
                ctx.fillStyle = 'rgba(0, 204, 204, 0.06)';
                ctx.strokeStyle = 'rgba(0, 204, 204, 0.2)';
            }

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, coneStartAngle, coneEndAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Outer teal circle
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // White eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Dark pupil that looks in the facing direction
            const pupilDist = enemy.radius * 0.15;
            const pupilX = enemy.x + Math.cos(enemy.facingAngle) * pupilDist;
            const pupilY = enemy.y + Math.sin(enemy.facingAngle) * pupilDist;
            ctx.fillStyle = '#003333';
            ctx.beginPath();
            ctx.arc(pupilX, pupilY, enemy.radius * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Draw health bar
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.radius + 5;

            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        } else if (enemy.type === 'screamer') {
            // Draw screamer - red circle with cone FOV, alertness gauge, and scream effect

            // Draw scream ring if screaming
            if (enemy.isScreaming) {
                const screamElapsed = Date.now() - enemy.screamTime;
                const screamProgress = Math.min(screamElapsed / 600, 1);
                const currentScreamRadius = enemy.screamRadius * screamProgress;
                const screamAlpha = 0.4 * (1 - screamProgress);

                ctx.strokeStyle = `rgba(255, 68, 68, ${screamAlpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, currentScreamRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner fill
                ctx.fillStyle = `rgba(255, 68, 68, ${screamAlpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, currentScreamRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw sight cone
            const coneStartAngle = enemy.facingAngle - enemy.fov / 2;
            const coneEndAngle = enemy.facingAngle + enemy.fov / 2;
            const totalFov = enemy.fov + enemy.peripheralFov;
            const periStartAngle = enemy.facingAngle - totalFov / 2;
            const periEndAngle = enemy.facingAngle + totalFov / 2;

            // Peripheral zones (darker red)
            if (enemy.state === 'caution') {
                ctx.fillStyle = 'rgba(204, 100, 0, 0.08)';
                ctx.strokeStyle = 'rgba(204, 100, 0, 0.25)';
            } else {
                ctx.fillStyle = 'rgba(204, 100, 0, 0.03)';
                ctx.strokeStyle = 'rgba(204, 100, 0, 0.10)';
            }

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, periStartAngle, coneStartAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, coneEndAngle, periEndAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Main cone (red)
            if (enemy.state === 'alert') {
                ctx.fillStyle = 'rgba(255, 68, 68, 0.12)';
                ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
            } else {
                ctx.fillStyle = 'rgba(255, 68, 68, 0.05)';
                ctx.strokeStyle = 'rgba(255, 68, 68, 0.15)';
            }

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.sightRange, coneStartAngle, coneEndAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Body - red circle
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner mouth/speaker shape (dark circle)
            ctx.fillStyle = '#660000';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Alertness gauge (arc around the body)
            if (enemy.alertness > 0) {
                const gaugeAngle = (enemy.alertness / 100) * Math.PI * 2;
                const gaugeStart = -Math.PI / 2; // Start from top

                // Background ring
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
                ctx.stroke();

                // Alertness fill ring
                const alertRatio = enemy.alertness / 100;
                if (alertRatio > 0.7) {
                    ctx.strokeStyle = '#ff0000'; // Red when high
                } else if (alertRatio > 0.4) {
                    ctx.strokeStyle = '#ffaa00'; // Orange when medium
                } else {
                    ctx.strokeStyle = '#ffff00'; // Yellow when low
                }
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 5, gaugeStart, gaugeStart + gaugeAngle);
                ctx.stroke();
            }

            // Health bar
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.radius + 12;

            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const sHealthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, sHealthWidth, barHeight);
        } else if (enemy.type === 'phantom') {
            // Draw phantom - light blue with evade gauge and trail

            // Draw evade trail (afterimage)
            if (enemy.evadeTrail) {
                for (let t = 0; t < enemy.evadeTrail.length; t++) {
                    const trail = enemy.evadeTrail[t];
                    ctx.globalAlpha = trail.alpha * 0.5;
                    ctx.fillStyle = enemy.color;
                    ctx.beginPath();
                    ctx.arc(trail.x, trail.y, enemy.radius * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // Outer body
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Darker core
            ctx.fillStyle = '#1155aa';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Evade gauge ring
            if (enemy.evadeGaugeMax) {
                const gaugeRatio = enemy.evadeGauge / enemy.evadeGaugeMax;
                const gaugeAngle = gaugeRatio * Math.PI * 2;
                const gaugeStart = -Math.PI / 2;

                // Background ring
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
                ctx.stroke();

                // Gauge fill
                if (gaugeRatio >= 1) {
                    ctx.strokeStyle = '#666666'; // Gray when depleted
                } else if (gaugeRatio > 0.7) {
                    ctx.strokeStyle = '#ff0000'; // Red - almost out
                } else if (gaugeRatio > 0.4) {
                    ctx.strokeStyle = '#ffaa00'; // Yellow - getting used
                } else {
                    ctx.strokeStyle = '#00ff44'; // Green - plenty left
                }
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius + 5, gaugeStart, gaugeStart + gaugeAngle);
                ctx.stroke();
            }

            // Health bar
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.radius + 12;

            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const pHealthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, pHealthWidth, barHeight);
        } else {
            // Draw enemy circle (blue or purple)
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw health bar
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y + enemy.radius + 5;

            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            const healthWidth = (barWidth * enemy.health) / enemy.maxHealth;
            ctx.fillStyle = '#ff0000'; // red
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        }
    });
}

// Draw mines
function drawMines() {
    mines.forEach(mine => {
        if (mine.exploding) {
            // Draw expanding white explosion circle
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, mine.explosionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            // Draw gray circle with red glowing core
            // Gray outer circle
            ctx.fillStyle = '#808080';
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, mine.radius, 0, Math.PI * 2);
            ctx.fill();

            // Red glowing core
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, mine.coreRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
}

// Draw gold drops
function drawGoldDrops() {
    goldDrops.forEach(gold => {
        // Draw gold circle
        ctx.fillStyle = goldConfig.color;
        ctx.beginPath();
        ctx.arc(gold.x, gold.y, goldConfig.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw dollar sign
        ctx.fillStyle = '#000000'; // black
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', gold.x, gold.y);
    });
}

// Draw background stars
function drawBackground() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw health bar in top right
function drawHealthBar() {
    // Set transparency and glow for all UI bars
    ctx.globalAlpha = CONFIG.ui.barOpacity;
    ctx.shadowBlur = 10;
    ctx.shadowColor = CONFIG.ui.barBorderColor;

    const barWidth = CONFIG.ui.barWidth;
    const barHeight = CONFIG.ui.barHeight;
    const iconSize = barHeight; // Make square same height as bar
    const padding = CONFIG.ui.barPadding;
    const borderWidth = CONFIG.ui.barBorderWidth;
    const borderRadius = CONFIG.ui.barBorderRadius;
    const barSpacing = CONFIG.ui.barSpacing;

    // Health bar
    const healthIconX = canvas.width - padding - barWidth - iconSize - 10;
    const healthIconY = padding;
    const healthBarX = canvas.width - padding - barWidth;
    const healthBarY = padding;

    // Draw health icon square with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(healthIconX, healthIconY, iconSize, iconSize, borderRadius);
    ctx.stroke();

    // Draw white plus symbol
    ctx.fillStyle = '#ffffff'; // white
    const plusThickness = 2; // Half of 4
    const plusLength = iconSize * 0.5;
    ctx.fillRect(healthIconX + iconSize / 2 - plusThickness / 2, healthIconY + iconSize / 2 - plusLength / 2, plusThickness, plusLength); // Vertical line
    ctx.fillRect(healthIconX + iconSize / 2 - plusLength / 2, healthIconY + iconSize / 2 - plusThickness / 2, plusLength, plusThickness); // Horizontal line

    // Draw health bar background with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(healthBarX, healthBarY, barWidth, barHeight, borderRadius);
    ctx.stroke();

    // Draw health bar background (dark) with rounded corners
    ctx.fillStyle = CONFIG.ui.barBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(healthBarX + borderWidth, healthBarY + borderWidth, barWidth - borderWidth * 2, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw health bar (red) with rounded corners
    const healthWidth = ((barWidth - borderWidth * 2) * player.health) / player.maxHealth;
    ctx.fillStyle = CONFIG.ui.healthBarColor;
    ctx.beginPath();
    ctx.roundRect(healthBarX + borderWidth, healthBarY + borderWidth, healthWidth, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Stamina bar (below health bar)
    const staminaIconX = healthIconX;
    const staminaIconY = healthIconY + barHeight + barSpacing;
    const staminaBarX = healthBarX;
    const staminaBarY = healthBarY + barHeight + barSpacing;

    // Draw stamina icon square with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(staminaIconX, staminaIconY, iconSize, iconSize, borderRadius);
    ctx.stroke();

    // Draw white S symbol
    ctx.fillStyle = '#ffffff'; // white
    ctx.font = 'bold 10px Arial'; // Half of 20px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', staminaIconX + iconSize / 2, staminaIconY + iconSize / 2);

    // Draw stamina bar background with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(staminaBarX, staminaBarY, barWidth, barHeight, borderRadius);
    ctx.stroke();

    // Draw stamina bar background (dark) with rounded corners
    ctx.fillStyle = CONFIG.ui.barBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(staminaBarX + borderWidth, staminaBarY + borderWidth, barWidth - borderWidth * 2, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw stamina bar (green) with rounded corners
    const staminaWidth = ((barWidth - borderWidth * 2) * player.stamina) / player.maxStamina;
    ctx.fillStyle = CONFIG.ui.staminaBarColor;
    ctx.beginPath();
    ctx.roundRect(staminaBarX + borderWidth, staminaBarY + borderWidth, staminaWidth, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Money bar (below stamina bar)
    const moneyIconX = healthIconX;
    const moneyIconY = staminaIconY + barHeight + barSpacing;
    const moneyBarX = healthBarX;
    const moneyBarY = staminaBarY + barHeight + barSpacing;

    // Draw money icon square with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(moneyIconX, moneyIconY, iconSize, iconSize, borderRadius);
    ctx.stroke();

    // Draw dollar sign symbol
    ctx.fillStyle = '#ffffff'; // white
    ctx.font = 'bold 10px Arial'; // Half of 20px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', moneyIconX + iconSize / 2, moneyIconY + iconSize / 2);

    // Draw money bar background with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(moneyBarX, moneyBarY, barWidth, barHeight, borderRadius);
    ctx.stroke();

    // Draw money bar background (dark) with rounded corners
    ctx.fillStyle = CONFIG.ui.barBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(moneyBarX + borderWidth, moneyBarY + borderWidth, barWidth - borderWidth * 2, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw money bar (yellow) with rounded corners
    // Include both level coins and rollover coins in percentage
    const totalCollected = player.money + player.totalMoney;
    const moneyWidth = player.moneyRequired > 0 ? Math.min((barWidth - borderWidth * 2) * totalCollected / player.moneyRequired, barWidth - borderWidth * 2) : 0;
    ctx.fillStyle = CONFIG.ui.moneyBarColor;
    ctx.beginPath();
    ctx.roundRect(moneyBarX + borderWidth, moneyBarY + borderWidth, moneyWidth, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw total money count on the money bar
    ctx.fillStyle = '#ff69b4'; // pink
    ctx.font = 'bold 9px Arial'; // Half of 18px
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayTotal = player.money + player.totalMoney;
    ctx.fillText(displayTotal, moneyBarX + 2.5, moneyBarY + barHeight / 2);

    // Mine bar (below money bar)
    const mineIconX = healthIconX;
    const mineIconY = moneyIconY + barHeight + barSpacing;
    const mineBarX = healthBarX;
    const mineBarY = moneyBarY + barHeight + barSpacing;

    // Draw mine icon square with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(mineIconX, mineIconY, iconSize, iconSize, borderRadius);
    ctx.stroke();

    // Draw M symbol
    ctx.fillStyle = '#ffffff'; // white
    ctx.font = 'bold 10px Arial'; // Half of 20px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', mineIconX + iconSize / 2, mineIconY + iconSize / 2);

    // Draw mine bar background with yellow border and rounded corners
    ctx.strokeStyle = CONFIG.ui.barBorderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(mineBarX, mineBarY, barWidth, barHeight, borderRadius);
    ctx.stroke();

    // Draw mine bar background (dark) with rounded corners
    ctx.fillStyle = CONFIG.ui.barBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(mineBarX + borderWidth, mineBarY + borderWidth, barWidth - borderWidth * 2, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw mine bar (light gray) with rounded corners
    const mineWidth = ((barWidth - borderWidth * 2) * player.mines) / player.maxMines;
    ctx.fillStyle = CONFIG.ui.mineBarColor;
    ctx.beginPath();
    ctx.roundRect(mineBarX + borderWidth, mineBarY + borderWidth, mineWidth, barHeight - borderWidth * 2, borderRadius - 1);
    ctx.fill();

    // Draw mine count on the mine bar
    ctx.fillStyle = '#ffffff'; // white
    ctx.font = 'bold 9px Arial'; // Half of 18px
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${player.mines}/${player.maxMines}`, mineBarX + 2.5, mineBarY + barHeight / 2);

    // Reset transparency and shadow for other elements
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
}

// Draw level announcement
function drawLevelAnnouncement() {
    const currentTime = Date.now();
    const elapsed = (currentTime - levelAnnouncementTime) / 1000;

    if (elapsed < 3) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = isBossLevel ? 'BOSS 1' : `Level ${currentLevel}`;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
}

// Draw collection countdown
function drawCollectionCountdown() {
    if (collectionPhase) {
        const currentTime = Date.now();
        const elapsed = currentTime - collectionStartTime;
        const remaining = Math.max(0, collectionDuration - elapsed);
        const seconds = Math.ceil(remaining / 1000);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Collect Gold!', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = seconds <= 3 ? '#ff0000' : '#ffff00'; // Red when 3 seconds or less
        ctx.fillText(seconds, canvas.width / 2, canvas.height / 2 + 40);
    }
}

// Draw game over screen
function drawGameOver() {
    if (gameOver) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);

        ctx.font = '24px Arial';
        ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 60);
    }
}

// Main game loop
function gameLoop() {
    if (!gameStarted) return;

    // Calculate delta time (in seconds)
    const currentTime = performance.now();
    deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;

    // Cap delta time to prevent huge jumps (e.g., when tab is inactive)
    deltaTime = Math.min(deltaTime, 0.1);

    // Clear and draw background
    drawBackground();

    // Check player death
    checkPlayerDeath();

    // Update game objects
    if (!gameOver) {
        updatePlayer();
    }
    updateBullets();
    updateTurretBullets();
    updateMines();
    updateEnemies();
    updateCollectionPhase();

    // Draw game objects
    drawMines();
    drawWatcherGhosts();
    drawEnemies();
    drawGoldDrops();
    drawPlayer();
    drawBullets();
    drawTurretBullets();

    // Draw UI
    drawHealthBar();
    drawLevelAnnouncement();
    drawCollectionCountdown();
    drawGameOver();

    // Continue loop
    requestAnimationFrame(gameLoop);
}
