// Platform.js
class Platform {
    constructor(scene, x, y, width, height, type = 'ground') {
        this.scene = scene;
        this.type = type;
        this.width = width;
        this.height = height;

        // Get configuration
        this.platformConfig = window.GameConfig.getConfig('PlatformConfig');
        this.collisionConfig = window.GameConfig.getConfig('CollisionConfig');

        this.config = this.platformConfig.TYPES[type];

        if (!this.config) {
            console.warn(`Unknown platform type: ${type}. Using 'ground' as default.`);
            this.type = 'ground';
            this.config = this.platformConfig.TYPES.ground;
        }

        this.platforms = null;
        this.tiles = [];
        this.oneWayDisabledFor = new Set(); // Track which characters have one-way disabled

        this.createPlatform(x, y);
        this.setupCollisionProperties();
    }

    createPlatform(x, y) {
        const textureKey = this.getTextureKey();
        this.platforms = this.scene.physics.add.staticGroup();

        const tileWidth = this.config.tileWidth;
        const tileHeight = this.config.tileHeight;

        const tilesX = Math.ceil(this.width / tileWidth);
        const tilesY = Math.ceil(this.height / tileHeight);

        for (let i = 0; i < tilesX; i++) {
            for (let j = 0; j < tilesY; j++) {
                const tileX = x + (i * tileWidth);
                const tileY = y + (j * tileHeight);

                const tile = this.platforms.create(tileX, tileY, textureKey);
                tile.setOrigin(0, 0);

                // Store tile reference with additional properties
                tile.platformType = this.type;
                tile.platformConfig = this.config;
                tile.platformInstance = this;

                // Set physics properties (only compatible methods for static bodies)
                const edgeTolerance = this.platformConfig.COLLISION.edgeTolerance;
                tile.body.setSize(
                    tileWidth - edgeTolerance,
                    tileHeight - edgeTolerance
                );

                this.tiles.push(tile);
            }
        }
    }

    getTextureKey() {
        return this.config.texture;
    }

    setupCollisionProperties() {
        const collisionTypes = this.collisionConfig.PLATFORM_TYPES[this.type];

        this.tiles.forEach(tile => {
            // Store collision category info for manual collision handling
            tile.body.collisionCategory = parseInt(collisionTypes.category);
            tile.body.collidesWith = parseInt(collisionTypes.collidesWith);

            // Mark one-way platforms
            tile.body.isOneWay = this.config.oneWay;

            // Store material properties for reference (not applied to static bodies)
            tile.body.materialFriction = this.config.friction;
            tile.body.materialBounce = this.config.bounce;
        });
    }

    // Check if character can pass through one-way platform
    canPassThrough(character, contactPoint) {
        if (!this.config.oneWay) return false;

        const characterBody = character.sprite.body;
        const characterBottom = characterBody.y + characterBody.height;
        const platformTop = contactPoint.y;

        // Check if character is moving upward with sufficient velocity
        const movingUp = characterBody.velocity.y < this.config.velocityThreshold;

        // Check if character is approaching from below
        const approachingFromBelow = characterBottom <= platformTop + this.config.positionTolerance;

        return movingUp && approachingFromBelow;
    }

    // Temporarily disable one-way collision for a character
    disableOneWayFor(character) {
        if (!this.config.oneWay) return;

        this.oneWayDisabledFor.add(character);

        // Re-enable after timeout
        this.scene.time.delayedCall(this.config.disableTime, () => {
            this.oneWayDisabledFor.delete(character);
        });
    }

    // Check if one-way collision is disabled for a character
    isOneWayDisabledFor(character) {
        return this.oneWayDisabledFor.has(character);
    }

    // Custom collision handler for one-way platforms
    handleOneWayCollision(character, tile) {
        if (!this.config.oneWay) return true; // Allow normal collision

        if (this.isOneWayDisabledFor(character)) {
            return false; // Disable collision
        }

        const characterBody = character.sprite.body;
        const characterBottom = characterBody.bottom;
        const characterPrevBottom = characterBody.prev.y + characterBody.height;
        const platformTop = tile.body.top;

        // Only collide if character was above platform in previous frame
        // and is now intersecting from above
        const wasAbove = characterPrevBottom <= platformTop + this.config.positionTolerance;
        const isMovingDown = characterBody.velocity.y >= 0;

        return wasAbove && isMovingDown;
    }

    // Get all physics bodies for collision detection
    getPhysicsGroup() {
        return this.platforms;
    }

    // Get platform bounds for optimization
    getBounds() {
        if (this.tiles.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.tiles.forEach(tile => {
            minX = Math.min(minX, tile.x);
            minY = Math.min(minY, tile.y);
            maxX = Math.max(maxX, tile.x + tile.width);
            maxY = Math.max(maxY, tile.y + tile.height);
        });

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    // Check if point is within platform bounds (for optimization)
    containsPoint(x, y) {
        const bounds = this.getBounds();
        if (!bounds) return false;

        return x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }

    // Get platform type
    getType() {
        return this.type;
    }

    // Get platform configuration
    getConfig() {
        return this.config;
    }

    // Debug visualization
    drawDebugInfo(graphics) {
        if (!graphics || !this.config) return;

        const debugConfig = this.platformConfig.DEBUG;
        const colorKey = this.getDebugColorKey();
        const color = parseInt(debugConfig.colors[colorKey]);
        const bounds = this.getBounds();

        if (bounds && debugConfig.showBounds) {
            graphics.lineStyle(2, color, 0.5);
            graphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

            // Draw type label
            if (debugConfig.showLabels && this.scene.add && this.scene.add.text) {
                const label = this.scene.add.text(
                    bounds.x + bounds.width / 2,
                    bounds.y - 15,
                    this.type.toUpperCase(),
                    { fontSize: '10px', color: `#${color.toString(16)}` }
                ).setOrigin(0.5);

                // Remove label after a short time
                this.scene.time.delayedCall(debugConfig.labelDuration, () => label.destroy());
            }
        }
    }

    getDebugColorKey() {
        switch (this.type) {
            case 'ground':
            case 'float':
                return 'solidPlatform';
            case 'oneWay':
                return 'oneWayPlatform';
            case 'shadowOnly':
                return 'shadowZone';
            default:
                return 'solidPlatform';
        }
    }

    // Cleanup
    destroy() {
        if (this.platforms) {
            this.platforms.clear(true, true);
        }

        this.tiles = [];
        this.oneWayDisabledFor.clear();
    }
}