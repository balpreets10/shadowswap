// Player.js
class Player {
    constructor(scene, x, y, texture = 'player-idle') {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, texture);

        // Get configuration
        this.config = window.GameConfig.getConfig('PlayerConfig');
        this.collisionConfig = window.GameConfig.getConfig('CollisionConfig');

        this.setupPhysics();
        this.setupAnimations();
        this.setupState();
    }

    setupPhysics() {
        this.sprite.setCollideWorldBounds(true);

        // Apply collision configuration from config
        const physicsConfig = this.config.PHYSICS;
        const characterConfig = this.collisionConfig.CHARACTER_PHYSICS.main;

        this.sprite.setSize(characterConfig.hitboxWidth, characterConfig.hitboxHeight);
        this.sprite.setOffset(characterConfig.hitboxOffsetX, characterConfig.hitboxOffsetY);

        // Physics properties from config
        this.maxSpeed = physicsConfig.maxSpeed;
        this.acceleration = physicsConfig.acceleration;
        this.jumpPower = physicsConfig.jumpPower;
        this.friction = physicsConfig.friction;

        // Collision properties
        this.sprite.body.setMaxVelocity(this.maxSpeed, physicsConfig.maxVelocityY);

        // Store collision category for manual collision handling
        this.sprite.body.collisionCategory = parseInt(characterConfig.category);

        // One-way platform tracking
        this.oneWayPlatformsBelow = [];
        this.lastGroundedPlatform = null;
    }

    setupAnimations() {
        const animConfig = this.config.ANIMATIONS;

        // Create running animation
        this.scene.anims.create({
            key: 'player-running',
            frames: animConfig.runFrames.map(frame => ({ key: frame })),
            frameRate: animConfig.runFrameRate,
            repeat: -1
        });

        this.scene.anims.create({
            key: 'player-idle',
            frames: [{ key: animConfig.idleFrame }],
            frameRate: 1
        });

        this.scene.anims.create({
            key: 'player-jumping',
            frames: [{ key: animConfig.jumpFrame }],
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
        const visualConfig = this.config.VISUAL;
        this.sprite.setAlpha(visualConfig.activeAlpha);
        this.sprite.setTint(parseInt(visualConfig.activeTint));
    }

    deactivate() {
        this.isActive = false;
        const visualConfig = this.config.VISUAL;
        this.sprite.setAlpha(visualConfig.inactiveAlpha);
        this.sprite.setTint(parseInt(visualConfig.inactiveTint));
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
        // Check if grounded with improved detection
        const wasGrounded = this.isGrounded;
        this.isGrounded = this.sprite.body.touching.down || this.sprite.body.blocked.down;

        // Track one-way platforms below character
        this.updateOneWayPlatformDetection();

        // Landing effect with platform-specific feedback
        if (!wasGrounded && this.isGrounded) {
            this.onLanding();
        }

        // Prevent edge glitching
        this.preventEdgeGlitching();
    }

    // New function for one-way platform detection
    updateOneWayPlatformDetection() {
        this.oneWayPlatformsBelow = [];

        const bodyBottom = this.sprite.body.bottom;
        const bodyLeft = this.sprite.body.left;
        const bodyRight = this.sprite.body.right;
        const platformConfig = this.config.PLATFORMS.oneWayDetection;
        const checkDistance = platformConfig.checkDistance;

        // This would be called by the scene to register platforms below
        // Scene will handle the actual detection and call registerOneWayPlatformBelow()
    }

    // New function to register one-way platforms below character
    registerOneWayPlatformBelow(platform) {
        if (platform.getType() === 'oneWay' &&
            !this.oneWayPlatformsBelow.includes(platform)) {
            this.oneWayPlatformsBelow.push(platform);
        }
    }

    // New function to prevent edge glitching
    preventEdgeGlitching() {
        const body = this.sprite.body;
        const tolerance = this.collisionConfig.COLLISION_SETTINGS.edgeTolerance;

        // Snap to platform edges if very close
        if (body.touching.down) {
            const velocityThreshold = this.config.PLATFORMS.oneWayDetection.velocityThreshold;
            const velocityX = Math.abs(body.velocity.x);
            if (velocityX < velocityThreshold) { // Low horizontal velocity
                // Fine-tune position to prevent micro-gaps
                body.x = Math.round(body.x);
            }
        }
    }

    // Updated onLanding function with platform detection
    onLanding() {
        // Visual feedback for landing
        const landingConfig = this.config.EFFECTS.landingCameraShake;
        this.scene.cameras.main.shake(landingConfig.duration, landingConfig.intensity);

        // Create landing particles based on platform type
        this.createLandingEffect();
    }

    // New function for landing effects
    createLandingEffect() {
        const position = this.getPosition();
        const effectConfig = this.config.EFFECTS.landingParticles;

        // Default dust effect
        if (this.scene.textures.exists(effectConfig.texture)) {
            const emitter = this.scene.add.particles(
                position.x,
                position.y + effectConfig.offsetY,
                effectConfig.texture,
                {
                    scale: effectConfig.scale,
                    alpha: effectConfig.alpha,
                    speed: effectConfig.speed,
                    lifespan: effectConfig.lifespan,
                    quantity: effectConfig.quantity
                }
            );

            this.scene.time.delayedCall(effectConfig.lifespan + 100, () => emitter.destroy());
        }
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
    }
}