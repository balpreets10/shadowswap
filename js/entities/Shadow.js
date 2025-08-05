// Shadow.js
class Shadow {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'shadow-idle');
        this.setupPhysics();
        this.setupAnimations();
        this.setupState();
        this.setupFollowing();
    }

    initializeVisualEffects() {
        this.setupVisualEffects();
    }

    setupPhysics() {
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(28, 44);
        this.sprite.setOffset(2, 4);
        this.sprite.setAlpha(0.7); // Semi-transparent

        // Shadow physics properties
        this.maxSpeed = 180; // Slightly slower than main character
        this.acceleration = 700;
        this.jumpPower = 450;
        this.friction = 0.8;
    }

    setupAnimations() {
        // Shadow running animation
        this.scene.anims.create({
            key: 'shadow-running',
            frames: [
                { key: 'shadow-run-0' },
                { key: 'shadow-run-1' },
                { key: 'shadow-run-2' },
                { key: 'shadow-run-3' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.scene.anims.create({
            key: 'shadow-idle',
            frames: [{ key: 'shadow-idle' }],
            frameRate: 1
        });

        this.scene.anims.create({
            key: 'shadow-jumping',
            frames: [{ key: 'shadow-jump' }],
            frameRate: 1
        });
    }

    setupState() {
        this.isGrounded = false;
        this.facingDirection = 1;
        this.movementState = 'idle';
        this.isActive = false;
        this.trailEmitter = null; // Initialize as null
        this.glowEffect = null; // Initialize as null
    }

    setupFollowing() {
        this.isFollowing = false;
        this.followTarget = null;
        this.followOffset = { x: 20, y: -5 }; // Slight offset from player
        this.followSpeed = 0.05; // Lerp speed (0-1, higher = faster)
        this.followDistance = 150; // Max distance before instant teleport
        this.physicsEnabled = true;
    }

    setupVisualEffects() {
        // Add glow effect when active
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.setDepth(-1);

        // Only create particle emitter if texture exists
        if (this.scene.textures.exists('switch-particle')) {
            this.trailEmitter = this.scene.add.particles(0, 0, 'switch-particle', {
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.6, end: 0 },
                speed: { min: 20, max: 40 },
                lifespan: 300,
                frequency: 100,
                follow: this.sprite
            });
            this.trailEmitter.stop();
        }
    }

    enablePhysics() {
        this.physicsEnabled = true;
        this.sprite.body.setEnable(true);
        this.sprite.setCollideWorldBounds(true);
    }

    disablePhysics() {
        this.physicsEnabled = false;
        this.sprite.body.setEnable(false);
        this.sprite.setCollideWorldBounds(false);
    }

    startFollowing(target) {
        this.isFollowing = true;
        this.followTarget = target;
        this.disablePhysics();

        // Make shadow more ethereal when following
        this.sprite.setAlpha(0.4);
        this.sprite.setTint(0xBBBBBB);

        // Stop trail effect when following
        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }
    }

    stopFollowing() {
        this.isFollowing = false;
        this.followTarget = null;
        this.enablePhysics();

        // Restore normal appearance
        this.sprite.setAlpha(0.7);
        this.sprite.setTint(0xFFFFFF);
    }

    activate() {
        this.isActive = true;
        this.stopFollowing(); // Stop following when active
        this.sprite.setAlpha(1);
        this.sprite.setTint(0xffffff);

        // Only start trail emitter if it exists
        if (this.trailEmitter) {
            this.trailEmitter.start();
        }

        this.updateGlow();
    }

    deactivate() {
        this.isActive = false;
        this.sprite.setAlpha(0.4);
        this.sprite.setTint(0x888888);

        // Only stop trail emitter if it exists
        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }

        // Only clear glow effect if it exists
        if (this.glowEffect) {
            this.glowEffect.clear();
        }
    }

    update(inputManager) {
        if (this.isFollowing) {
            this.updateFollowing();
        } else if (this.isActive) {
            this.handleInput(inputManager);
        }

        this.updateAnimations();

        if (this.physicsEnabled) {
            this.updatePhysics();
        }

        this.updateGlow();
    }

    updateFollowing() {
        if (!this.followTarget) return;

        const targetPos = this.followTarget.getPosition();
        const currentPos = this.getPosition();

        // Calculate target position with offset
        const targetX = targetPos.x + this.followOffset.x;
        const targetY = targetPos.y + this.followOffset.y;

        // Check if shadow is too far away (teleport to prevent getting stuck)
        const distance = Phaser.Math.Distance.Between(currentPos.x, currentPos.y, targetX, targetY);

        if (distance > this.followDistance) {
            // Instant teleport if too far
            this.sprite.setPosition(targetX, targetY);
        } else if (distance > 5) { // Only move if not already close enough
            // Smooth lerp movement
            const newX = Phaser.Math.Linear(currentPos.x, targetX, this.followSpeed);
            const newY = Phaser.Math.Linear(currentPos.y, targetY, this.followSpeed);
            this.sprite.setPosition(newX, newY);

            // Update facing direction based on movement
            if (targetX < currentPos.x) {
                this.facingDirection = -1;
                this.movementState = 'following';
            } else if (targetX > currentPos.x) {
                this.facingDirection = 1;
                this.movementState = 'following';
            } else {
                this.movementState = 'idle';
            }

            this.sprite.setFlipX(this.facingDirection === -1);
        } else {
            this.movementState = 'idle';
        }
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
            velocity.x *= this.friction;
            if (Math.abs(velocity.x) < 10) velocity.x = 0;
            this.movementState = 'idle';
        }

        // Jumping
        if (inputManager.isPressed('jump') && this.isGrounded) {
            velocity.y = -this.jumpPower;
            this.isGrounded = false;
            this.movementState = 'jumping';
            this.createSwitchEffect();
        }

        this.sprite.setFlipX(this.facingDirection === -1);
    }

    updateAnimations() {
        if (this.isFollowing) {
            // Use appropriate animation for following state
            if (this.movementState === 'following') {
                this.sprite.play('shadow-running', true);
            } else {
                this.sprite.play('shadow-idle', true);
            }
        } else if (!this.isGrounded && this.physicsEnabled) {
            this.sprite.play('shadow-jumping', true);
        } else if (this.movementState === 'running') {
            this.sprite.play('shadow-running', true);
        } else {
            this.sprite.play('shadow-idle', true);
        }
    }

    updatePhysics() {
        if (!this.physicsEnabled) return;

        const wasGrounded = this.isGrounded;
        this.isGrounded = this.sprite.body.touching.down;

        if (!wasGrounded && this.isGrounded) {
            this.onLanding();
        }
    }

    updateGlow() {
        if (this.isActive && this.glowEffect) {
            this.glowEffect.clear();
            this.glowEffect.lineStyle(4, 0x9C27B0, 0.3);
            this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, 25);
            this.glowEffect.lineStyle(2, 0x9C27B0, 0.6);
            this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, 20);
        } else if (this.isFollowing && this.glowEffect) {
            // Subtle glow when following
            this.glowEffect.clear();
            this.glowEffect.lineStyle(2, 0x9C27B0, 0.1);
            this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, 15);
        }
    }

    onLanding() {
        this.createDustEffect();
    }

    createSwitchEffect() {
        // Check if texture exists before creating particles
        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'switch-particle', {
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                speed: { min: 50, max: 100 },
                lifespan: 400,
                quantity: 8
            });

            this.scene.time.delayedCall(500, () => emitter.destroy());
        }
    }

    createDustEffect() {
        // Check if texture exists before creating particles
        if (this.scene.textures.exists('dust-particle')) {
            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y + 20, 'dust-particle', {
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.8, end: 0 },
                speed: { min: 20, max: 60 },
                lifespan: 300,
                quantity: 4
            });

            this.scene.time.delayedCall(400, () => emitter.destroy());
        }
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
    }
}