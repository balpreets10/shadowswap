// Player.js
class Player {
    constructor(scene, x, y, texture = 'player-idle') {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, texture);
        this.setupPhysics();
        this.setupAnimations();
        this.setupState();
    }

    setupPhysics() {
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(28, 44); // Slightly smaller hitbox
        this.sprite.setOffset(2, 4);

        // Physics properties
        this.maxSpeed = 200;
        this.acceleration = 800;
        this.jumpPower = 500;
        this.friction = 0.8;
    }

    setupAnimations() {
        // Create running animation
        this.scene.anims.create({
            key: 'player-running',
            frames: [
                { key: 'player-run-0' },
                { key: 'player-run-1' },
                { key: 'player-run-2' },
                { key: 'player-run-3' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.scene.anims.create({
            key: 'player-idle',
            frames: [{ key: 'player-idle' }],
            frameRate: 1
        });

        this.scene.anims.create({
            key: 'player-jumping',
            frames: [{ key: 'player-jump' }],
            frameRate: 1
        });
    }

    setupState() {
        this.isGrounded = false;
        this.facingDirection = 1; // 1 for right, -1 for left
        this.movementState = 'idle';
        this.isActive = true; // Add active state
    }

    // Add activation methods
    activate() {
        this.isActive = true;
        this.sprite.setAlpha(1);
        this.sprite.setTint(0xffffff);
    }

    deactivate() {
        this.isActive = false;
        this.sprite.setAlpha(0.4);
        this.sprite.setTint(0x888888);
    }

    update(inputManager) {
        // Only handle input when active
        if (this.isActive) {
            this.handleInput(inputManager);
        }

        this.updateAnimations();
        this.updatePhysics();
    }

    handleInput(inputManager) {
        const velocity = this.sprite.body.velocity;

        // Horizontal movement
        if (inputManager.isPressed('left')) {
            velocity.x = Math.max(velocity.x - this.acceleration * (1 / 60), -this.maxSpeed);
            this.facingDirection = -1;
            this.movementState = 'running';
        } else if (inputManager.isPressed('right')) {
            velocity.x = Math.min(velocity.x + this.acceleration * (1 / 60), this.maxSpeed);
            this.facingDirection = 1;
            this.movementState = 'running';
        } else {
            // Apply friction
            velocity.x *= this.friction;
            if (Math.abs(velocity.x) < 10) velocity.x = 0;
            this.movementState = 'idle';
        }

        // Jumping
        if (inputManager.isPressed('jump') && this.isGrounded) {
            velocity.y = -this.jumpPower;
            this.isGrounded = false;
            this.movementState = 'jumping';
        }

        // Update sprite direction
        this.sprite.setFlipX(this.facingDirection === -1);
    }

    updateAnimations() {
        if (!this.isGrounded) {
            this.sprite.play('player-jumping', true);
        } else if (this.movementState === 'running') {
            this.sprite.play('player-running', true);
        } else {
            this.sprite.play('player-idle', true);
        }
    }

    updatePhysics() {
        // Check if grounded (simple ground check)
        const wasGrounded = this.isGrounded;
        this.isGrounded = this.sprite.body.touching.down;

        // Landing effect
        if (!wasGrounded && this.isGrounded) {
            this.onLanding();
        }
    }

    onLanding() {
        // Visual feedback for landing
        this.scene.cameras.main.shake(50, 0.01);
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
    }
}