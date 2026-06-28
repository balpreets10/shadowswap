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
        this.levelManager = new LevelManager(this, this.lightSourceManager);
    }

    preload() {
        this.assetManager.preload(this);
    }

    create() {
        this.setupWorld();
        // Characters and their collision groups must exist before platforms are
        // built, because LevelManager registers each platform's colliders against
        // them (and may build more platforms at runtime via switches).
        this.createCharacters();
        this.setupCollisionGroups();
        this.createLevel();
        this.setupInput();
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
        // Open the bottom bound so characters can fall out of the world (left,
        // right, top stay closed). The kill-plane below handles the death.
        this.physics.world.setBoundsCollision(true, true, true, false);
        this.physics.world.gravity.y = 800;

        // Y below the world bottom (1200); falling past this kills the player.
        this.DEATH_Y = 1300;

        // Create a gradient background
        this.add.rectangle(800, 600, 1600, 1200, 0x1a1a2e);

        // Add atmospheric lighting
        const ambientLight = this.add.graphics();
        ambientLight.fillGradientStyle(0x16213e, 0x16213e, 0x0f3460, 0x0f3460, 0.3);
        ambientLight.fillRect(0, 0, 1600, 1200);
    }

    createLevel() {
        // Master list of all live platforms. LevelManager builds them from
        // LevelData.json (platforms, light sources, switches, portal) and calls
        // back into registerPlatformCollisions() for each one, including any it
        // reveals at runtime via switches.
        this.platforms = [];

        // build() instantiates initial platforms (registering their colliders +
        // obstacles through this scene), lights, switches, and the exit portal.
        this.levelManager.build();

        // Add some background elements for depth
        this.createBackgroundElements();
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
        // Spawn points come from LevelData (center coords); fall back to the
        // historical defaults if absent.
        const levelData = window.GameConfig.getConfig('LevelData');
        const spawns = (levelData && levelData.spawnPoints) || {};
        const mainSpawn = spawns.main || { x: 100, y: 1000 };
        const shadowSpawn = spawns.shadow || { x: 120, y: 1000 };

        this.player = new Player(this, mainSpawn.x, mainSpawn.y);
        this.shadow = new Shadow(this, shadowSpawn.x, shadowSpawn.y);

        this.characterManager.initialize(this.player, this.shadow);
    }

    setupInput() {
        this.inputManager.init(this);
    }

    // Set up character collision groups, categories, and one-way drop controls.
    // Platforms are registered separately (per-platform) by LevelManager so that
    // both the initial build and runtime reveals share one code path.
    setupCollisionGroups() {
        // Initialize collision groups for different character types
        this.mainCharacterGroup = this.physics.add.group();
        this.shadowCharacterGroup = this.physics.add.group();

        // Add characters to their respective groups
        this.mainCharacterGroup.add(this.player.sprite);
        this.shadowCharacterGroup.add(this.shadow.sprite);

        // Set up collision categories for characters
        this.setupCharacterCollisionCategories();

        // Set up drop-through controls for one-way platforms
        this.setupOneWayControls();
    }

    // Register a single platform's colliders against both characters and add it
    // to the master platform list. Called by LevelManager for every platform,
    // including ones revealed at runtime via switches. Colliders are stored on
    // the platform so they can be torn down in unregisterPlatform().
    registerPlatformCollisions(platform) {
        const platformGroup = platform.getPhysicsGroup();
        const platformType = platform.getType();
        platform._colliders = [];

        // Main character collisions - can't use shadow-only platforms
        if (platformType !== 'shadowOnly') {
            if (platformType === 'oneWay') {
                platform._colliders.push(this.physics.add.collider(
                    this.player.sprite,
                    platformGroup,
                    null,
                    (player, tile) => platform.handleOneWayCollision(this.player, tile)
                ));
            } else {
                platform._colliders.push(this.physics.add.collider(this.player.sprite, platformGroup));
            }
        }

        // Shadow character collisions - can use all platform types
        if (platformType === 'oneWay') {
            platform._colliders.push(this.physics.add.collider(
                this.shadow.sprite,
                platformGroup,
                null,
                (shadow, tile) => platform.handleOneWayCollision(this.shadow, tile)
            ));
        } else {
            platform._colliders.push(this.physics.add.collider(this.shadow.sprite, platformGroup));
        }

        if (!this.platforms.includes(platform)) {
            this.platforms.push(platform);
        }
    }

    // Tear down a platform's colliders and drop it from the master list. Used
    // when a switch opens a gate or a hold-switch hides its lit path.
    unregisterPlatform(platform) {
        if (platform._colliders) {
            platform._colliders.forEach(c => {
                if (c) this.physics.world.removeCollider(c);
            });
            platform._colliders = [];
        }
        const idx = this.platforms.indexOf(platform);
        if (idx !== -1) this.platforms.splice(idx, 1);
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

        // Player-facing shadow-zone status. Tells the player, in plain words,
        // what the current shadow zone is doing to the active shadow so the
        // mechanic reads as a rule rather than as lag.
        this.shadowStatusText = this.add.text(20, 175, '', {
            fontSize: '13px',
            color: '#CE93D8',
            backgroundColor: 'rgba(20, 0, 30, 0.7)',
            padding: { x: 10, y: 5 },
            fontStyle: 'bold'
        }).setScrollFactor(0).setVisible(false);

        // Debug info
        this.debugText = this.add.text(10, 220, '', {
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

        // Game over overlay (created hidden, shown on gameOver state)
        const cam = this.cameras.main;
        this.gameOverText = this.add.text(cam.width / 2, cam.height / 2, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff4444',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false);

        // Level complete overlay (created hidden, shown on levelComplete state)
        this.levelCompleteText = this.add.text(cam.width / 2, cam.height / 2, 'LEVEL COMPLETE', {
            fontSize: '56px',
            color: '#AAFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false);

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
        // Show/hide the game over overlay
        if (this.gameOverText) {
            this.gameOverText.setVisible(state.gameState === 'gameOver');
        }

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

        // Either character falling off the world kills both (game over). The
        // shadow is only physics-driven while controlled; when following its
        // body is frozen, so this guard only fires for a genuine fall.
        if (this.gameStateManager.getState().gameState === 'playing' &&
            (this.player.sprite.y > this.DEATH_Y ||
             (!this.shadow.isFollowing && this.shadow.sprite.y > this.DEATH_Y))) {
            this.characterManager.killAll();
        }

        // Update all managers
        this.characterManager.update(this.inputManager);

        const lightProfile = this.performanceProfiler.startProfiling('lightManager', 'update');
        this.lightSourceManager.update(time, delta);
        this.performanceProfiler.endProfiling(lightProfile);

        const detectorProfile = this.performanceProfiler.startProfiling('shadowDetector', 'update');
        this.shadowZoneDetector.update(time, delta);
        this.performanceProfiler.endProfiling(detectorProfile);

        this.performanceProfiler.update(time, delta);

        // Drive level mechanics: poll switches against the active character and
        // check whether the Main has reached the exit portal.
        if (this.gameStateManager.getState().gameState === 'playing') {
            const activeChar = this.characterManager.getActiveCharacter();
            const activeType = this.characterManager.activeCharacter;
            this.levelManager.update(activeChar, activeType);

            if (this.levelManager.checkWin(this.player)) {
                this.levelComplete();
            }
        }

        this.updateDebugInfo();
        this.updateLightDebugInfo();

        this.performanceProfiler.endProfiling(updateProfile);
    }

    // Win condition reached: freeze play and show the LEVEL COMPLETE overlay.
    levelComplete() {
        if (this.gameStateManager.getState().gameState === 'levelComplete') return;

        this.gameStateManager.updateState({ gameState: 'levelComplete' });

        // Freeze both characters in place.
        if (this.player && this.player.sprite.body) this.player.sprite.body.setVelocity(0, 0);
        if (this.shadow && this.shadow.sprite.body) this.shadow.sprite.body.setVelocity(0, 0);

        if (this.levelCompleteText) {
            this.levelCompleteText.setVisible(true);
        }
    }

    updateDebugInfo() {
        const activeChar = this.characterManager.getActiveCharacter();
        const activePos = activeChar.getPosition();
        const velocity = activeChar.sprite.body.velocity;
        const grounded = activeChar.isGrounded;
        const charType = this.characterManager.activeCharacter;

        // Check shadow zone status
        const inShadowZone = this.lightSourceManager.isPointInShadowZone(activePos.x, activePos.y);

        // Surface a clear, player-facing message about what zones are doing.
        this.updateShadowStatus(charType, inShadowZone);

        this.debugText.setText([
            `Active: ${charType.toUpperCase()}`,
            `Pos: (${Math.round(activePos.x)}, ${Math.round(activePos.y)})`,
            `Vel: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `Grounded: ${grounded}`,
            `State: ${activeChar.movementState}`,
            `In Shadow: ${inShadowZone}`
        ]);
    }

    updateShadowStatus(activeCharType, inShadowZone) {
        // Only relevant while controlling the shadow.
        if (activeCharType !== 'shadow') {
            this.shadowStatusText.setVisible(false);
            return;
        }

        this.shadowStatusText.setVisible(true);

        if (inShadowZone) {
            this.shadowStatusText.setText('IN SHADOW: empowered — full speed & jump');
            this.shadowStatusText.setColor('#CE93D8');
            this.shadowStatusText.setBackgroundColor('rgba(40, 0, 60, 0.7)');
        } else if (this.shadow.shadowMovementRestricted) {
            this.shadowStatusText.setText('IN LIGHT: weakened — reach a shadow to recover');
            this.shadowStatusText.setColor('#FFCC66');
            this.shadowStatusText.setBackgroundColor('rgba(60, 30, 0, 0.7)');
        } else {
            this.shadowStatusText.setText('IN LIGHT: hurry to a shadow before it weakens');
            this.shadowStatusText.setColor('#FFDD99');
            this.shadowStatusText.setBackgroundColor('rgba(40, 25, 0, 0.7)');
        }
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