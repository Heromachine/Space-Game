// Enemy management system with CSV loading

class EnemyManager {
    constructor() {
        this.enemyData = new Map();
        this.loaded = false;
    }

    // Load enemy data from CSV file
    async loadEnemyData() {
        try {
            const response = await fetch('enemies.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
            this.loaded = true;
            return true;
        } catch (error) {
            console.error('Failed to load enemy data:', error);
            return false;
        }
    }

    // Parse CSV text into enemy data map
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const enemyType = values[0];

            if (!enemyType) continue;

            const enemyConfig = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const value = values[j];

                // Skip empty values
                if (value === '') continue;

                // Parse value based on type
                if (header === 'type' || header === 'color') {
                    enemyConfig[header] = value;
                } else if (header === 'minLevel') {
                    enemyConfig.minLevel = parseInt(value);
                } else {
                    // Convert to number
                    enemyConfig[header] = parseFloat(value);
                }
            }

            this.enemyData.set(enemyType, enemyConfig);
        }
    }

    // Get enemy configuration by type
    getEnemyConfig(type) {
        return this.enemyData.get(type);
    }

    // Create enemy instance with proper initialization
    createEnemy(type, x, y, isBossTurret = false) {
        const config = this.getEnemyConfig(type);
        if (!config) {
            console.error(`Enemy type "${type}" not found in CSV data`);
            return null;
        }

        const enemy = {
            type: type,
            x: x,
            y: y,
            color: config.color,
            health: config.maxHealth,
            maxHealth: config.maxHealth,
            damage: config.damage,
            speed: config.normalSpeed,
            dashSpeed: config.dashSpeed || config.normalSpeed,
            state: 'idle',
            lastDashTime: 0,
            level: config.level,
            cost: config.cost
        };

        // Add type-specific properties
        if (config.radius !== undefined) {
            enemy.radius = config.radius;
        }

        if (config.size !== undefined) {
            enemy.size = config.size;
        }

        if (config.activationRadius !== undefined) {
            enemy.activationRadius = config.activationRadius;
            enemy.state = 'dormant';
        }

        if (config.dashRadius !== undefined) {
            enemy.dashRadius = config.dashRadius;
        }

        if (config.dashCooldown !== undefined) {
            enemy.dashCooldown = config.dashCooldown;
        }

        if (config.shootCooldown !== undefined) {
            enemy.shootCooldown = config.shootCooldown;
            enemy.lastShotTime = 0;
        }

        if (config.bulletSpeed !== undefined) {
            enemy.bulletSpeed = config.bulletSpeed;
        }

        if (config.bulletRadius !== undefined) {
            enemy.bulletRadius = config.bulletRadius;
        }

        // Boss turret specific properties
        if (isBossTurret) {
            enemy.attachedToBoss = true;
        }

        return enemy;
    }

    // Get spawn count for enemy type at specific level
    getSpawnCount(type, level) {
        const config = this.getEnemyConfig(type);
        if (!config) return 0;

        // Check if level meets minimum requirement
        if (config.minLevel && level < config.minLevel) {
            return 0;
        }

        switch (type) {
            case 'blue':
                return Math.floor(level / 2) + 1;

            case 'purple':
                // Start spawning from level 1
                return level >= 1 ? level : 0;

            case 'turret':
                // Only spawn if level >= minLevel (5)
                return level >= config.minLevel ? Math.floor((level - config.minLevel) / 5) + 1 : 0;

            case 'boss':
                // Only spawn on multiples of 10
                return (level % 10 === 0) ? 1 : 0;

            default:
                return 0;
        }
    }

    // Check if level is a boss level
    isBossLevel(level) {
        return level % 10 === 0;
    }

    // Get all available enemy types
    getEnemyTypes() {
        return Array.from(this.enemyData.keys());
    }

    // Check if enemy data is loaded
    isLoaded() {
        return this.loaded;
    }
}

// Create global enemy manager instance
const enemyManager = new EnemyManager();
