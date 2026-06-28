// Shadow.js
class Shadow {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'shadow-idle');

        // Get configuration
        this.config = window.GameConfig.getConfig('ShadowConfig');
        this.collisionConfig = window.GameConfig.getConfig('CollisionConfig');

        this.setupPhysics();
        this.setupAnimations();
        this.setupState();
        this.setupFollowing();
        this.setupShadowZone();
    }

    initializeVisualEffects() {
        this.setupVisualEffects();
    }

    setupPhysics() {
        this.sprite.setCollideWorldBounds(true);

        // Apply collision configuration from config
        const physicsConfig = this.config.PHYSICS;
        const characterConfig = this.collisionConfig.CHARACTER_PHYSICS.shadow;

        this.sprite.setSize(characterConfig.hitboxWidth, characterConfig.hitboxHeight);
        this.sprite.setOffset(characterConfig.hitboxOffsetX, characterConfig.hitboxOffsetY);
        this.sprite.setAlpha(this.config.VISUAL.baseAlpha); // Semi-transparent
        // Render above the player sprite (depth 0) and the cast-shadow
        // polygons (depth -5) so the shadow is never hidden behind them.
        this.sprite.setDepth(5);

        // Shadow physics properties from config
        this.maxSpeed = physicsConfig.maxSpeed;
        this.acceleration = physicsConfig.acceleration;
        this.jumpPower = physicsConfig.jumpPower;
        this.friction = physicsConfig.friction;

        // Collision properties
        this.sprite.body.setMaxVelocity(this.maxSpeed, physicsConfig.maxVelocityY);

        // Store collision category for manual collision handling
        this.sprite.body.collisionCategory = parseInt(characterConfig.category);

        // Shadow-specific collision tracking
        this.shadowZonesBelow = [];
        this.oneWayPlatformsBelow = [];
        this.canAccessShadowZones = true;
    }

    setupAnimations() {
        const animConfig = this.config.ANIMATIONS;

        // Shadow running animation
        this.scene.anims.create({
            key: 'shadow-running',
            frames: animConfig.runFrames.map(frame => ({ key: frame })),
            frameRate: animConfig.runFrameRate,
            repeat: -1
        });

        this.scene.anims.create({
            key: 'shadow-idle',
            frames: [{ key: animConfig.idleFrame }],
            frameRate: 1
        });

        this.scene.anims.create({
            key: 'shadow-jumping',
            frames: [{ key: animConfig.jumpFrame }],
            frameRate: 1
        });
    }

    setupState() {
        this.isGrounded = false;
        this.facingDirection = 1;
        this.movementState = 'idle';
        this.isActive = false;
        this.isDead = false;
        this.trailEmitter = null;
        this.glowEffect = null;
        this.inShadowZone = false;
        this.shadowZoneRestricted = false;
    }

    setupFollowing() {
        const followConfig = this.config.FOLLOWING;

        this.isFollowing = false;
        this.followTarget = null;
        this.followOffset = followConfig.followOffset;
        this.followSpeed = followConfig.followSpeed;
        this.followDistance = followConfig.followDistance;
        this.teleportDistance = followConfig.teleportDistance;
        this.physicsEnabled = true;
    }

    setupShadowZone() {
        const zoneConfig = this.config.SHADOW_ZONES;

        this.shadowMovementRestricted = false;
        this.lastShadowZoneCheck = 0;
        this.shadowZoneCheckInterval = zoneConfig.checkInterval;
        this.violationGracePeriod = zoneConfig.violationGracePeriod;
        this.lastViolationTime = 0;
        this.restrictedSpeedMultiplier = zoneConfig.restrictedSpeedMultiplier;
        this.restrictedJumpMultiplier = zoneConfig.restrictedJumpMultiplier;
    }

    setupVisualEffects() {
        const visualConfig = this.config.VISUAL;

        // Add glow effect when active
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.setDepth(-1);

        // Only create particle emitter if texture exists
        const trailConfig = this.config.EFFECTS.trailParticles;
        if (this.scene.textures.exists(trailConfig.texture)) {
            this.trailEmitter = this.scene.add.particles(0, 0, trailConfig.texture, {
                scale: trailConfig.scale,
                alpha: trailConfig.alpha,
                speed: trailConfig.speed,
                lifespan: trailConfig.lifespan,
                frequency: trailConfig.frequency,
                follow: this.sprite
            });
            this.trailEmitter.stop();
        }
    }

    enablePhysics() {
        this.physicsEnabled = true;
        this.sprite.body.setEnable(true);
        // Restore full physics simulation now that the shadow is controlled.
        this.sprite.body.moves = true;
        this.sprite.body.setAllowGravity(true);
        this.sprite.setCollideWorldBounds(true);
    }

    disablePhysics() {
        this.physicsEnabled = false;
        this.sprite.body.setEnable(false);
        // While following, position is driven by the follow lerp via
        // setPosition(). Adding the sprite to a physics group (in
        // GameScene.setupCollisions) re-enables the body, so disabling it is
        // not enough on its own: we must also stop gravity and integration and
        // zero velocity, or the body falls at terminal velocity and drags the
        // shadow off the world the moment control is taken.
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.moves = false;
        this.sprite.body.setAllowGravity(false);
        this.sprite.setCollideWorldBounds(false);
    }

    startFollowing(target) {
        const visualConfig = this.config.VISUAL;

        this.isFollowing = true;
        this.followTarget = target;
        this.disablePhysics();

        // Make shadow more ethereal when following
        this.sprite.setAlpha(visualConfig.followingAlpha);
        this.sprite.setTint(parseInt(visualConfig.followingTint));

        // Stop trail effect when following
        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }
    }

    stopFollowing() {
        const visualConfig = this.config.VISUAL;

        this.isFollowing = false;
        this.followTarget = null;
        this.enablePhysics();

        // Restore normal appearance
        this.sprite.setAlpha(visualConfig.baseAlpha);
        this.sprite.setTint(parseInt(visualConfig.activeTint));
    }

    activate() {
        const visualConfig = this.config.VISUAL;

        this.isActive = true;
        this.stopFollowing();

        // Force full visibility on activation. stopFollowing() already restores
        // alpha/tint, but we set it again explicitly (and ensure the sprite is
        // visible and at its own depth) so the player never "loses" the shadow
        // when taking control of it.
        this.sprite.setVisible(true);
        this.sprite.setDepth(5);
        this.sprite.setAlpha(visualConfig.activeAlpha);
        this.sprite.setTint(parseInt(visualConfig.activeTint));

        if (this.trailEmitter) {
            this.trailEmitter.start();
        }

        this.updateGlow();
    }

    deactivate() {
        const visualConfig = this.config.VISUAL;

        this.isActive = false;
        // Stop horizontal drift and force idle when control leaves the shadow.
        if (this.sprite.body) {
            this.sprite.body.velocity.x = 0;
        }
        this.movementState = 'idle';
        this.sprite.setAlpha(visualConfig.inactiveAlpha);
        this.sprite.setTint(parseInt(visualConfig.inactiveTint));

        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }

        if (this.glowEffect) {
            this.glowEffect.clear();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isActive = false;
        this.isFollowing = false;
        this.followTarget = null;
        this.movementState = 'idle';
        if (this.sprite.body) {
            this.sprite.body.setVelocity(0, 0);
        }
        this.disablePhysics();
        this.sprite.setVisible(false);

        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }

        if (this.glowEffect) {
            this.glowEffect.clear();
        }
    }

    setInShadowZone(inZone) {
        this.inShadowZone = inZone;
        this.updateVisualState();
    }

    updateVisualState() {
        const visualConfig = this.config.VISUAL;
        const shadowTrailConfig = this.config.EFFECTS.shadowZoneTrail;
        const normalTrailConfig = this.config.EFFECTS.trailParticles;

        if (this.isActive) {
            if (this.inShadowZone) {
                // Enhanced appearance in shadow zones
                this.sprite.setAlpha(visualConfig.activeAlpha);
                this.sprite.setTint(parseInt(visualConfig.enhancedTint));

                if (this.trailEmitter) {
                    this.trailEmitter.setConfig({
                        scale: shadowTrailConfig.scale,
                        alpha: shadowTrailConfig.alpha,
                        tint: parseInt(shadowTrailConfig.tint)
                    });
                }
            } else {
                // Normal appearance outside shadow zones
                this.sprite.setAlpha(visualConfig.baseAlpha);
                this.sprite.setTint(parseInt(visualConfig.activeTint));

                if (this.trailEmitter) {
                    this.trailEmitter.setConfig({
                        scale: normalTrailConfig.scale,
                        alpha: normalTrailConfig.alpha,
                        tint: parseInt(visualConfig.activeTint)
                    });
                }
            }
        }
    }

    update(inputManager) {
        // Dead characters stop processing entirely
        if (this.isDead) return;

        if (this.isFollowing) {
            this.updateFollowing();
        } else if (this.isActive) {
            this.updateShadowZoneMovement();
            this.handleInput(inputManager);
        }

        this.updateAnimations();

        if (this.physicsEnabled) {
            this.updatePhysics();
        }

        this.updateGlow();
    }

    updateShadowZoneMovement() {
        const currentTime = Date.now();

        // Only check shadow zone status periodically for performance
        if (currentTime - this.lastShadowZoneCheck >= this.shadowZoneCheckInterval) {
            this.lastShadowZoneCheck = currentTime;

            const position = this.getPosition();
            const lightSourceManager = this.scene.lightSourceManager;

            if (lightSourceManager) {
                const inShadowZone = lightSourceManager.isPointInShadowZone(position.x, position.y);

                // Update shadow zone restriction logic
                if (!inShadowZone && this.isActive) {
                    // Shadow character is outside shadow zones - start restriction timer
                    if (this.lastViolationTime === 0) {
                        this.lastViolationTime = currentTime;
                    } else if (currentTime - this.lastViolationTime > this.violationGracePeriod) {
                        this.shadowMovementRestricted = true;
                    }
                } else {
                    // Shadow character is in valid position - reset restriction
                    this.shadowMovementRestricted = false;
                    this.lastViolationTime = 0;
                }

                this.setInShadowZone(inShadowZone);
            }
        }
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

        if (distance > this.teleportDistance) {
            // Instant teleport if too far
            this.sprite.setPosition(targetX, targetY);
        } else if (distance > 5) {
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

        // Apply movement restrictions if outside shadow zones
        const movementMultiplier = this.shadowMovementRestricted ? this.restrictedSpeedMultiplier : 1.0;
        const jumpMultiplier = this.shadowMovementRestricted ? this.restrictedJumpMultiplier : 1.0;

        // Horizontal movement
        if (inputManager.isPressed('left')) {
            const accel = this.acceleration * movementMultiplier;
            velocity.x = Math.max(velocity.x - accel * (1 / 60), -this.maxSpeed * movementMultiplier);
            this.facingDirection = -1;
            this.movementState = 'running';
        } else if (inputManager.isPressed('right')) {
            const accel = this.acceleration * movementMultiplier;
            velocity.x = Math.min(velocity.x + accel * (1 / 60), this.maxSpeed * movementMultiplier);
            this.facingDirection = 1;
            this.movementState = 'running';
        } else {
            velocity.x *= this.friction;
            if (Math.abs(velocity.x) < 10) velocity.x = 0;
            this.movementState = 'idle';
        }

        // Jumping
        if (inputManager.isPressed('jump') && this.isGrounded) {
            const jumpPower = this.jumpPower * jumpMultiplier;
            velocity.y = -jumpPower;
            this.isGrounded = false;
            this.movementState = 'jumping';
            this.createSwitchEffect();
        }

        this.sprite.setFlipX(this.facingDirection === -1);
    }

    updateAnimations() {
        if (this.isFollowing) {
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

        // Check if grounded with improved detection
        const wasGrounded = this.isGrounded;
        this.isGrounded = this.sprite.body.touching.down || this.sprite.body.blocked.down;

        // Track platforms and shadow zones below character
        this.updatePlatformDetection();

        // Validate shadow zone access
        this.validateShadowZoneAccess();

        // Landing effect
        if (!wasGrounded && this.isGrounded) {
            this.onLanding();
        }

        // Prevent edge glitching
        this.preventEdgeGlitching();
    }

    updateGlow() {
        const glowConfig = this.config.EFFECTS.glow;

        if (this.isActive && this.glowEffect) {
            this.glowEffect.clear();

            if (this.inShadowZone) {
                // Enhanced glow in shadow zones
                this.glowEffect.lineStyle(6, parseInt(glowConfig.shadowZoneColor), glowConfig.shadowZoneAlpha);
                this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, glowConfig.shadowZoneRadius);
                this.glowEffect.lineStyle(3, parseInt(glowConfig.shadowZoneColor), glowConfig.shadowZoneAlpha + 0.4);
                this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, glowConfig.shadowZoneRadius - 8);
            } else {
                // Standard glow
                this.glowEffect.lineStyle(4, parseInt(glowConfig.normalColor), glowConfig.normalAlpha);
                this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, glowConfig.normalRadius);
                this.glowEffect.lineStyle(2, parseInt(glowConfig.normalColor), glowConfig.normalAlpha + 0.3);
                this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, glowConfig.normalRadius - 5);
            }
        } else if (this.isFollowing && this.glowEffect) {
            // Subtle glow when following
            this.glowEffect.clear();
            this.glowEffect.lineStyle(2, parseInt(glowConfig.normalColor), 0.1);
            this.glowEffect.strokeCircle(this.sprite.x, this.sprite.y, 15);
        }
    }

    updatePlatformDetection() {
        this.oneWayPlatformsBelow = [];
        this.shadowZonesBelow = [];
    }

    registerShadowZoneBelow(platform) {
        if (platform.getType() === 'shadowOnly' &&
            !this.shadowZonesBelow.includes(platform)) {
            this.shadowZonesBelow.push(platform);
        }
    }

    registerOneWayPlatformBelow(platform) {
        if (platform.getType() === 'oneWay' &&
            !this.oneWayPlatformsBelow.includes(platform)) {
            this.oneWayPlatformsBelow.push(platform);
        }
    }

    validateShadowZoneAccess() {
        this.canAccessShadowZones = true;
    }

    preventEdgeGlitching() {
        const body = this.sprite.body;

        if (body.touching.down) {
            const velocityX = Math.abs(body.velocity.x);
            if (velocityX < 50) {
                body.x = Math.round(body.x);
            }
        }
    }

    onLanding() {
        this.createDustEffect();
        this.createShadowLandingEffect();
    }

    createShadowLandingEffect() {
        const position = this.getPosition();
        const landingConfig = this.config.EFFECTS.landingEffect;

        if (this.scene.textures.exists(landingConfig.texture)) {
            const tint = this.inShadowZone ? parseInt(this.config.VISUAL.shadowZoneTint) : 0x666666;
            const emitter = this.scene.add.particles(
                position.x,
                position.y + landingConfig.offsetY,
                landingConfig.texture,
                {
                    scale: landingConfig.scale,
                    alpha: landingConfig.alpha,
                    speed: landingConfig.speed,
                    lifespan: landingConfig.lifespan,
                    quantity: landingConfig.quantity,
                    tint: tint
                }
            );

            this.scene.time.delayedCall(landingConfig.lifespan + 100, () => emitter.destroy());
        }
    }

    canAccessPlatform(platformType) {
        switch (platformType) {
            case 'ground':
            case 'float':
            case 'oneWay':
            case 'shadowOnly':
                return true;
            default:
                return false;
        }
    }

    createSwitchEffect() {
        const switchConfig = this.config.EFFECTS.enterEffect;

        if (this.scene.textures.exists(switchConfig.texture)) {
            const tint = this.inShadowZone ? parseInt(switchConfig.tint) : parseInt(this.config.VISUAL.activeTint);
            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, switchConfig.texture, {
                scale: switchConfig.scale,
                alpha: switchConfig.alpha,
                speed: switchConfig.speed,
                lifespan: switchConfig.lifespan,
                quantity: switchConfig.quantity,
                tint: tint
            });

            this.scene.time.delayedCall(switchConfig.lifespan + 100, () => emitter.destroy());
        }
    }

    createDustEffect() {
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

    // New shadow zone specific methods
    isInValidShadowZone() {
        return this.inShadowZone;
    }

    getShadowMovementMultiplier() {
        return this.shadowMovementRestricted ? this.restrictedSpeedMultiplier : 1.0;
    }

    resetShadowViolation() {
        this.shadowMovementRestricted = false;
        this.lastViolationTime = 0;
    }
}