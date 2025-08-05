// CharacterManager.js
class CharacterManager {
    constructor(scene) {
        this.scene = scene;
        this.mainCharacter = null;
        this.shadowCharacter = null;
        this.activeCharacter = 'main';
        this.switchCooldown = false;
        this.switchEffects = [];
    }

    initialize(mainCharacter, shadowCharacter) {
        this.mainCharacter = mainCharacter;
        this.shadowCharacter = shadowCharacter;

        // Set initial states - shadow should follow main character
        this.activateMain();
    }

    update(inputManager) {
        // Handle character switching
        if (inputManager.isPressed('switch') && !this.switchCooldown) {
            this.switchCharacter();
        }

        // Update both characters
        if (this.mainCharacter) {
            this.mainCharacter.update(inputManager);
        }
        if (this.shadowCharacter) {
            this.shadowCharacter.update(inputManager);
        }
    }

    switchCharacter() {
        this.switchCooldown = true;

        if (this.activeCharacter === 'main') {
            this.activateShadow();
        } else {
            this.activateMain();
        }

        this.createSwitchEffect();
        this.scene.cameras.main.shake(100, 0.02);

        // Cooldown to prevent rapid switching
        this.scene.time.delayedCall(200, () => {
            this.switchCooldown = false;
        });
    }

    activateMain() {
        this.activeCharacter = 'main';

        // Activate main character
        this.mainCharacter.activate();

        // Deactivate shadow and make it follow main character
        this.shadowCharacter.deactivate();
        this.shadowCharacter.startFollowing(this.mainCharacter);

        // Camera follows main character
        this.scene.cameras.main.startFollow(this.mainCharacter.sprite, true, 0.1, 0.1);

        // Update game state
        this.scene.gameStateManager.updateState({ activeCharacter: 'main' });
    }

    activateShadow() {
        this.activeCharacter = 'shadow';

        // Activate shadow character and stop following
        this.shadowCharacter.activate();

        // Deactivate main character but don't make it follow (main character stays put)
        this.mainCharacter.deactivate();

        // Camera follows shadow
        this.scene.cameras.main.startFollow(this.shadowCharacter.sprite, true, 0.1, 0.1);

        // Update game state
        this.scene.gameStateManager.updateState({ activeCharacter: 'shadow' });
    }

    createSwitchEffect() {
        const mainPos = this.mainCharacter.getPosition();
        const shadowPos = this.shadowCharacter.getPosition();

        // Create connection line effect
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(3, 0x9C27B0, 0.8);
        graphics.lineBetween(mainPos.x, mainPos.y, shadowPos.x, shadowPos.y);

        // Fade out line
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 300,
            onComplete: () => graphics.destroy()
        });

        // Particle burst at both characters
        this.createParticleBurst(mainPos.x, mainPos.y);
        this.createParticleBurst(shadowPos.x, shadowPos.y);

        // Extra visual feedback for switching to/from following mode
        if (this.activeCharacter === 'main') {
            // Switching to main - shadow will start following
            this.createFollowStartEffect(shadowPos.x, shadowPos.y);
        } else {
            // Switching to shadow - shadow stops following
            this.createFollowStopEffect(shadowPos.x, shadowPos.y);
        }
    }

    createFollowStartEffect(x, y) {
        // Ethereal particles to show shadow becoming follower
        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(x, y, 'switch-particle', {
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.6, end: 0 },
                speed: { min: 30, max: 60 },
                lifespan: 800,
                quantity: 6,
                tint: 0x9C27B0
            });

            this.scene.time.delayedCall(900, () => emitter.destroy());
        }
    }

    createFollowStopEffect(x, y) {
        // Solid particles to show shadow becoming solid/controllable
        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(x, y, 'switch-particle', {
                scale: { start: 0.6, end: 0 },
                alpha: { start: 1, end: 0 },
                speed: { min: 80, max: 120 },
                lifespan: 600,
                quantity: 10,
                tint: 0x9C27B0
            });

            this.scene.time.delayedCall(700, () => emitter.destroy());
        }
    }

    createParticleBurst(x, y) {
        const emitter = this.scene.add.particles(x, y, 'switch-particle', {
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            speed: { min: 80, max: 150 },
            lifespan: 500,
            quantity: 12,
            emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 5), quantity: 12 }
        });

        this.scene.time.delayedCall(600, () => emitter.destroy());
    }

    getActiveCharacter() {
        return this.activeCharacter === 'main' ? this.mainCharacter : this.shadowCharacter;
    }

    getInactiveCharacter() {
        return this.activeCharacter === 'main' ? this.shadowCharacter : this.mainCharacter;
    }

    getMainCharacter() {
        return this.mainCharacter;
    }

    getShadowCharacter() {
        return this.shadowCharacter;
    }

    getCurrentState() {
        return {
            activeCharacter: this.activeCharacter,
            mainPosition: this.mainCharacter ? this.mainCharacter.getPosition() : null,
            shadowPosition: this.shadowCharacter ? this.shadowCharacter.getPosition() : null,
            shadowFollowing: this.shadowCharacter ? this.shadowCharacter.isFollowing : false
        };
    }

    // Utility method to check if shadow is following
    isShadowFollowing() {
        return this.shadowCharacter && this.shadowCharacter.isFollowing;
    }

    // Method to adjust follow settings if needed
    setShadowFollowSettings(followSpeed, followDistance, followOffset) {
        if (this.shadowCharacter) {
            if (followSpeed !== undefined) this.shadowCharacter.followSpeed = followSpeed;
            if (followDistance !== undefined) this.shadowCharacter.followDistance = followDistance;
            if (followOffset !== undefined) this.shadowCharacter.followOffset = followOffset;
        }
    }
}