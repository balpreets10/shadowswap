// GameScene.js
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        this.inputManager = new InputManager();
        this.assetManager = new AssetManager();
        this.gameStateManager = new GameStateManager();
        this.characterManager = new CharacterManager(this);
        this.lightSourceManager = new LightSourceManager(this);
        this.shadowZoneDetector = new ShadowZoneDetector(this, this.lightSourceManager);
        this.performanceProfiler = new PerformanceProfiler(this);
    }

    preload() {
        this.assetManager.preload(this);
    }

    create() {
        this.setupWorld();
        this.createLevel();
        this.createLightSources();
        this.createCharacters();
        this.setupInput();
        this.setupCollisions();
        this.setupCamera();
        this.setupUI();
        this.setupParticles();

        // Initialize visual effects after everything is created
        this.shadow.initializeVisualEffects();

        // Setup shadow zone detection
        this.setupShadowZoneDetection();
    }

    setupWorld() {
        this.physics.world.setBounds(0, 0, 1600, 1200);
        this.physics.world.gravity.y = 800;

        // Create a gradient background
        this.add.rectangle(800, 600, 1600, 1200, 0x1a1a2e);

        // Add atmospheric lighting
        const ambientLight = this.add.graphics();
        ambientLight.fillGradientStyle(0x16213e, 0x16213e, 0x0f3460, 0x0f3460, 0.3);
        ambientLight.fillRect(0, 0, 1600, 1200);
    }

    createLevel() {
        this.platforms = [];

        // Ground platforms with enhanced design
        this.platforms.push(new Platform(this, 0, 1100, 800, 100, 'ground'));
        this.platforms.push(new Platform(this, 1000, 1100, 600, 100, 'ground'));

        // Solid floating platforms
        this.platforms.push(new Platform(this, 300, 900, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 800, 500, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 1200, 800, 200, 16, 'float'));

        // One-way platforms (can jump through from below)
        this.platforms.push(new Platform(this, 600, 750, 200, 8, 'oneWay'));
        this.platforms.push(new Platform(this, 200, 600, 150, 8, 'oneWay'));
        this.platforms.push(new Platform(this, 900, 650, 150, 8, 'oneWay'));
        this.platforms.push(new Platform(this, 450, 400, 200, 8, 'oneWay'));

        // Complex platform arrangements for testing collision edge cases
        this.platforms.push(new Platform(this, 700, 300, 64, 16, 'float')); // Single tile platform
        this.platforms.push(new Platform(this, 500, 200, 300, 8, 'oneWay')); // Long one-way platform

        // Staggered platforms for advanced movement
        for (let i = 0; i < 5; i++) {
            this.platforms.push(new Platform(this, 1000 + (i * 80), 350 - (i * 60), 64, 8, 'oneWay'));
        }

        // Register platforms as obstacles for shadow casting
        this.platforms.forEach(platform => {
            this.lightSourceManager.registerObstacle(platform);
        });

        // Add some background elements for depth
        this.createBackgroundElements();
    }

    createLightSources() {
        // Add various light sources to demonstrate shadow casting
        this.lightSourceManager.addLightSource('torch1', 400, 850, 'torch');
        this.lightSourceManager.addLightSource('lamp1', 150, 550, 'lamp');
        this.lightSourceManager.addLightSource('beacon1', 1100, 300, 'beacon');
        this.lightSourceManager.addLightSource('candle1', 750, 250, 'candle');

        // Add a torch that illuminates the starting area
        this.lightSourceManager.addLightSource('start_torch', 200, 1000, 'torch');
    }

    createBackgroundElements() {
        // Background towers/pillars for atmosphere
        const pillar1 = this.add.rectangle(1400, 800, 40, 400, 0x2c3e50);
        const pillar2 = this.add.rectangle(1500, 700, 30, 500, 0x34495e);
        pillar1.setAlpha(0.3);
        pillar2.setAlpha(0.2);

        // Background crystals for magical atmosphere
        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(100, 1500);
            const y = Phaser.Math.Between(100, 500);
            const crystal = this.add.graphics();
            crystal.fillStyle(0x9C27B0, 0.1);
            crystal.fillTriangle(0, 0, 10, 20, 20, 0);
            crystal.setPosition(x, y);

            // Gentle floating animation
            this.tweens.add({
                targets: crystal,
                y: y - 10,
                duration: 2000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createCharacters() {
        this.player = new Player(this, 100, 1000);
        this.shadow = new Shadow(this, 120, 1000);

        this.characterManager.initialize(this.player, this.shadow);
    }

    setupInput() {
        this.inputManager.init(this);
    }

    setupCollisions() {
        // Initialize collision groups for different character types
        this.mainCharacterGroup = this.physics.add.group();
        this.shadowCharacterGroup = this.physics.add.group();

        // Add characters to their respective groups
        this.mainCharacterGroup.add(this.player.sprite);
        this.shadowCharacterGroup.add(this.shadow.sprite);

        // Set up collision categories for characters
        this.setupCharacterCollisionCategories();

        // Platform collision setup
        this.platforms.forEach(platform => {
            const platformGroup = platform.getPhysicsGroup();
            const platformType = platform.getType();
            const platformConfig = platform.getConfig();

            // Main character collisions - can't use shadow-only platforms
            if (platformType !== 'shadowOnly') {
                if (platformType === 'oneWay') {
                    this.physics.add.collider(
                        this.player.sprite,
                        platformGroup,
                        null,
                        (player, tile) => platform.handleOneWayCollision(this.player, tile)
                    );
                } else {
                    this.physics.add.collider(this.player.sprite, platformGroup);
                }
            }

            // Shadow character collisions - can use all platform types
            if (platformType === 'oneWay') {
                this.physics.add.collider(
                    this.shadow.sprite,
                    platformGroup,
                    null,
                    (shadow, tile) => platform.handleOneWayCollision(this.shadow, tile)
                );
            } else {
                this.physics.add.collider(this.shadow.sprite, platformGroup);
            }
        });

        // Set up drop-through controls for one-way platforms
        this.setupOneWayControls();
    }

    setupShadowZoneDetection() {
        // Register characters with shadow zone detector
        this.playerShadowId = this.shadowZoneDetector.registerCharacter(this.player, 'main');
        this.shadowCharacterId = this.shadowZoneDetector.registerCharacter(this.shadow, 'shadow');

        // Set up shadow zone event callbacks
        this.shadowZoneDetector.onShadowZoneEnter(this.shadowCharacterId, (character, zone) => {
            this.onShadowZoneEnter(character, zone);
        });

        this.shadowZoneDetector.onShadowZoneExit(this.shadowCharacterId, (character, zone) => {
            this.onShadowZoneExit(character, zone);
        });

        this.shadowZoneDetector.onShadowZoneViolation(this.playerShadowId, (character, zone) => {
            this.onShadowZoneViolation(character, zone);
        });
    }

    onShadowZoneEnter(character, zone) {
        // Enable shadow zone movement for shadow character
        if (character === this.shadow) {
            character.setInShadowZone(true);
        }
    }

    onShadowZoneExit(character, zone) {
        // Disable shadow zone movement for shadow character
        if (character === this.shadow) {
            character.setInShadowZone(false);
        }
    }

    onShadowZoneViolation(character, zone) {
        // Handle main character entering shadow zones (not allowed)
        if (character === this.player) {
            // Push player out of shadow zone or apply damage
            this.handleMainCharacterShadowViolation();
        }
    }

    handleMainCharacterShadowViolation() {
        // Simple pushback mechanism
        const playerPos = this.player.getPosition();
        const nearestSafeSpot = this.findNearestSafeSpot(playerPos);

        if (nearestSafeSpot) {
            this.player.setPosition(nearestSafeSpot.x, nearestSafeSpot.y);
        }
    }

    findNearestSafeSpot(position) {
        // Simple implementation - find nearest spot not in shadow zones
        const testRadius = 50;
        const testPoints = 8;

        for (let radius = testRadius; radius <= 150; radius += 25) {
            for (let i = 0; i < testPoints; i++) {
                const angle = (i / testPoints) * Math.PI * 2;
                const testX = position.x + Math.cos(angle) * radius;
                const testY = position.y + Math.sin(angle) * radius;

                if (!this.lightSourceManager.isPointInShadowZone(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }

        return null;
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
    }

    setupUI() {
        // Character indicators
        this.mainIndicator = this.add.image(80, 50, 'ui-main-active').setScrollFactor(0);
        this.shadowIndicator = this.add.image(80, 80, 'ui-inactive').setScrollFactor(0);

        this.mainText = this.add.text(55, 45, 'MAIN', {
            fontSize: '10px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setScrollFactor(0);

        this.shadowText = this.add.text(45, 75, 'SHADOW', {
            fontSize: '10px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setScrollFactor(0);

        // Controls info with better styling
        this.controlsText = this.add.text(20, 120, [
            'WASD/Arrows: Move',
            'SPACE: Jump',
            'F: Switch Characters'
        ], {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 10, y: 5 },
            lineSpacing: 4
        }).setScrollFactor(0);

        // Debug info
        this.debugText = this.add.text(10, 200, '', {
            fontSize: '11px',
            color: '#00ff88',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0);

        // Light system debug info
        this.lightDebugText = this.add.text(10, 320, '', {
            fontSize: '10px',
            color: '#ffaa44',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0);

        // Subscribe to state changes
        this.gameStateManager.subscribe((state) => {
            this.updateUI(state);
        });
    }

    setupParticles() {
        // Ambient particles for atmosphere
        this.ambientParticles = this.add.particles(0, 0, 'switch-particle', {
            x: { min: 0, max: 1600 },
            y: { min: 0, max: 400 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 0.3, end: 0 },
            speed: { min: 10, max: 30 },
            lifespan: 8000,
            frequency: 2000,
            quantity: 1
        });
    }

    setupCharacterCollisionCategories() {
        const mainConfig = CollisionConfig.CHARACTER_PHYSICS.main;
        const shadowConfig = CollisionConfig.CHARACTER_PHYSICS.shadow;

        // Set collision properties for main character
        this.player.sprite.setSize(mainConfig.hitboxWidth, mainConfig.hitboxHeight);
        this.player.sprite.setOffset(mainConfig.hitboxOffsetX, mainConfig.hitboxOffsetY);

        // Set collision properties for shadow character  
        this.shadow.sprite.setSize(shadowConfig.hitboxWidth, shadowConfig.hitboxHeight);
        this.shadow.sprite.setOffset(shadowConfig.hitboxOffsetX, shadowConfig.hitboxOffsetY);

        // Store collision properties for manual collision handling
        this.player.sprite.body.collisionCategory = mainConfig.category;
        this.shadow.sprite.body.collisionCategory = shadowConfig.category;
    }

    setupOneWayControls() {
        this.input.keyboard.on('keydown-S', () => {
            this.handleDropThroughInput();
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            this.handleDropThroughInput();
        });
    }

    handleDropThroughInput() {
        const activeCharacter = this.characterManager.getActiveCharacter();

        this.platforms.forEach(platform => {
            if (platform.getType() === 'oneWay') {
                const characterBody = activeCharacter.sprite.body;
                const platformBounds = platform.getBounds();

                if (characterBody.touching.down &&
                    platform.containsPoint(characterBody.center.x, characterBody.bottom)) {
                    platform.disableOneWayFor(activeCharacter);
                }
            }
        });
    }

    updateUI(state) {
        if (state.activeCharacter === 'main') {
            this.mainIndicator.setTexture('ui-main-active');
            this.shadowIndicator.setTexture('ui-inactive');
            this.mainText.setColor('#ffffff');
            this.shadowText.setColor('#666666');
        } else {
            this.mainIndicator.setTexture('ui-inactive');
            this.shadowIndicator.setTexture('ui-shadow-active');
            this.mainText.setColor('#666666');
            this.shadowText.setColor('#ffffff');
        }
    }

    update(time, delta) {
        // Profile the update loop
        const updateProfile = this.performanceProfiler.startProfiling('scene', 'update');

        // Update all managers
        this.characterManager.update(this.inputManager);

        const lightProfile = this.performanceProfiler.startProfiling('lightManager', 'update');
        this.lightSourceManager.update(time, delta);
        this.performanceProfiler.endProfiling(lightProfile);

        const detectorProfile = this.performanceProfiler.startProfiling('shadowDetector', 'update');
        this.shadowZoneDetector.update(time, delta);
        this.performanceProfiler.endProfiling(detectorProfile);

        this.performanceProfiler.update(time, delta);

        this.updateDebugInfo();
        this.updateLightDebugInfo();

        this.performanceProfiler.endProfiling(updateProfile);
    }

    updateDebugInfo() {
        const activeChar = this.characterManager.getActiveCharacter();
        const activePos = activeChar.getPosition();
        const velocity = activeChar.sprite.body.velocity;
        const grounded = activeChar.isGrounded;
        const charType = this.characterManager.activeCharacter;

        // Check shadow zone status
        const inShadowZone = this.lightSourceManager.isPointInShadowZone(activePos.x, activePos.y);

        this.debugText.setText([
            `Active: ${charType.toUpperCase()}`,
            `Pos: (${Math.round(activePos.x)}, ${Math.round(activePos.y)})`,
            `Vel: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `Grounded: ${grounded}`,
            `State: ${activeChar.movementState}`,
            `In Shadow: ${inShadowZone}`
        ]);
    }

    updateLightDebugInfo() {
        const lightInfo = this.lightSourceManager.getDebugInfo();
        const performanceInfo = this.lightSourceManager.getPerformanceInfo();
        const detectorInfo = this.shadowZoneDetector.getPerformanceMetrics();

        this.lightDebugText.setText([
            `Lights: ${lightInfo.activeLights}/${lightInfo.totalLights}`,
            `Shadow Zones: ${lightInfo.shadowZones}`,
            `Quality: ${performanceInfo.currentQuality}`,
            `FPS: ${performanceInfo.lastFPS}`,
            `Frame Time: ${Math.round(performanceInfo.frameTime)}ms`,
            `Tracked Chars: ${detectorInfo.trackedCharacters}`
        ]);
    }
}