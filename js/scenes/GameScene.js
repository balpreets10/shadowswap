// GameScene.js
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        this.inputManager = new InputManager();
        this.assetManager = new AssetManager();
        this.gameStateManager = new GameStateManager();
    }

    preload() {
        this.assetManager.preload(this);
    }

    create() {
        this.setupWorld();
        this.createLevel();
        this.createPlayer();
        this.setupInput();
        this.setupCollisions();
        this.setupCamera();
        this.setupUI();
    }

    setupWorld() {
        this.physics.world.setBounds(0, 0, 1600, 1200);
        this.physics.world.gravity.y = 800;
    }

    createLevel() {
        this.platforms = [];

        // Ground platforms
        this.platforms.push(new Platform(this, 0, 1100, 800, 100, 'ground'));
        this.platforms.push(new Platform(this, 1000, 1100, 600, 100, 'ground'));

        // Floating platforms
        this.platforms.push(new Platform(this, 300, 900, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 600, 750, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 200, 600, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 800, 500, 200, 16, 'float'));
        this.platforms.push(new Platform(this, 1200, 800, 200, 16, 'float'));
    }

    createPlayer() {
        this.player = new Player(this, 100, 1000);
    }

    setupInput() {
        this.inputManager.init(this);
    }

    setupCollisions() {
        // Player collision with platforms
        this.platforms.forEach(platform => {
            this.physics.add.collider(this.player.sprite, platform.getPhysicsGroup());
        });
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
    }

    setupUI() {
        // Debug info
        this.debugText = this.add.text(10, 10, '', {
            fontSize: '14px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0);
    }

    update() {
        this.player.update(this.inputManager);
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        const playerPos = this.player.getPosition();
        const velocity = this.player.sprite.body.velocity;
        const grounded = this.player.isGrounded;

        this.debugText.setText([
            `Position: (${Math.round(playerPos.x)}, ${Math.round(playerPos.y)})`,
            `Velocity: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `Grounded: ${grounded}`,
            `State: ${this.player.movementState}`
        ]);
    }
}