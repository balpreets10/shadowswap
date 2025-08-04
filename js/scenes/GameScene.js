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
    }

    preload() {
        this.assetManager.preload(this);
    }

    create() {
        this.setupWorld();
        this.createLevel();
        this.createCharacters();
        this.setupInput();
        this.setupCollisions();
        this.setupCamera();
        this.setupUI();
        this.setupParticles();

        // Initialize visual effects after everything is created
        this.shadow.initializeVisualEffects();
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

        // Floating platforms
        this.platforms.push(new Platform(this, 300, 900, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 600, 750, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 200, 600, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 800, 500, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 1200, 800, 200, 16, 'float'));

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
        this.player = new Player(this, 100, 1000);
        this.shadow = new Shadow(this, 120, 1000);

        this.characterManager.initialize(this.player, this.shadow);
    }

    setupInput() {
        this.inputManager.init(this);
    }

    setupCollisions() {
        // Player collision with platforms
        this.platforms.forEach(platform => {
            this.physics.add.collider(this.player.sprite, platform.getPhysicsGroup());
            this.physics.add.collider(this.shadow.sprite, platform.getPhysicsGroup());
        });
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

    update() {
        this.characterManager.update(this.inputManager);
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        const activeChar = this.characterManager.getActiveCharacter();
        const activePos = activeChar.getPosition();
        const velocity = activeChar.sprite.body.velocity;
        const grounded = activeChar.isGrounded;
        const charType = this.characterManager.activeCharacter;

        this.debugText.setText([
            `Active: ${charType.toUpperCase()}`,
            `Pos: (${Math.round(activePos.x)}, ${Math.round(activePos.y)})`,
            `Vel: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `Grounded: ${grounded}`,
            `State: ${activeChar.movementState}`
        ]);
    }
}