// CharacterManager.js
class CharacterManager {
    constructor(scene) {
        this.scene = scene;
        this.mainCharacter = null;
        this.shadowCharacter = null;
        this.activeCharacter = 'main';
        this.switchCooldown = false;
        this.switchEffects = [];

        // Get configuration
        this.gameConfig = window.GameConfig.getConfig('GameConfig');
        this.playerConfig = window.GameConfig.getConfig('PlayerConfig');
        this.shadowConfig = window.GameConfig.getConfig('ShadowConfig');
    }

    initialize(mainCharacter, shadowCharacter) {
        this.mainCharacter = mainCharacter;
        this.shadowCharacter = shadowCharacter;

        // Set initial states - shadow should follow main character
        this.activateMain();
    }

    update(inputManager) {
        // Only process movement/switching while actively playing (frozen on
        // gameOver and levelComplete).
        if (this.scene.gameStateManager.getState().gameState !== 'playing') {
            return;
        }

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
        const switchConfig = this.gameConfig.CHARACTER_SWITCHING;

        this.switchCooldown = true;

        if (this.activeCharacter === 'main') {
            this.activateShadow();
        } else {
            this.activateMain();
        }

        this.createSwitchEffect();

        // Camera shake effect
        this.scene.cameras.main.shake(
            switchConfig.cameraShakeDuration,
            switchConfig.cameraShakeIntensity
        );

        // Cooldown to prevent rapid switching
        this.scene.time.delayedCall(switchConfig.cooldown, () => {
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
        const cameraConfig = this.gameConfig.CAMERA;
        this.scene.cameras.main.startFollow(
            this.mainCharacter.sprite,
            true,
            cameraConfig.followLerp,
            cameraConfig.followLerp
        );

        // Update game state
        this.scene.gameStateManager.updateState({ activeCharacter: 'main' });

        // Dispatch custom event for UI updates
        document.dispatchEvent(new CustomEvent('characterSwitch', {
            detail: { activeCharacter: 'main' }
        }));
    }

    activateShadow() {
        this.activeCharacter = 'shadow';

        // Activate shadow character and stop following
        this.shadowCharacter.activate();

        // Deactivate main character but don't make it follow (main character stays put)
        this.mainCharacter.deactivate();

        // Camera follows shadow
        const cameraConfig = this.gameConfig.CAMERA;
        this.scene.cameras.main.startFollow(
            this.shadowCharacter.sprite,
            true,
            cameraConfig.followLerp,
            cameraConfig.followLerp
        );

        // Update game state
        this.scene.gameStateManager.updateState({ activeCharacter: 'shadow' });

        // Dispatch custom event for UI updates
        document.dispatchEvent(new CustomEvent('characterSwitch', {
            detail: { activeCharacter: 'shadow' }
        }));
    }

    createSwitchEffect() {
        const mainPos = this.mainCharacter.getPosition();
        const shadowPos = this.shadowCharacter.getPosition();
        const switchConfig = this.gameConfig.CHARACTER_SWITCHING;

        // Create connection line effect
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(3, parseInt(this.shadowConfig.VISUAL.shadowZoneTint), 0.8);
        graphics.lineBetween(mainPos.x, mainPos.y, shadowPos.x, shadowPos.y);

        // Fade out line
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: switchConfig.effectDuration,
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
        const followConfig = this.shadowConfig.EFFECTS.trailParticles;

        // Ethereal particles to show shadow becoming follower
        if (this.scene.textures.exists(followConfig.texture)) {
            const emitter = this.scene.add.particles(x, y, followConfig.texture, {
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.6, end: 0 },
                speed: { min: 30, max: 60 },
                lifespan: 800,
                quantity: 6,
                tint: parseInt(this.shadowConfig.VISUAL.shadowZoneTint)
            });

            this.scene.time.delayedCall(900, () => emitter.destroy());
        }
    }

    createFollowStopEffect(x, y) {
        const enterConfig = this.shadowConfig.EFFECTS.enterEffect;

        // Solid particles to show shadow becoming solid/controllable
        if (this.scene.textures.exists(enterConfig.texture)) {
            const emitter = this.scene.add.particles(x, y, enterConfig.texture, {
                scale: enterConfig.scale,
                alpha: enterConfig.alpha,
                speed: { min: 80, max: 120 },
                lifespan: 600,
                quantity: 10,
                tint: parseInt(enterConfig.tint)
            });

            this.scene.time.delayedCall(700, () => emitter.destroy());
        }
    }

    createParticleBurst(x, y) {
        const switchConfig = this.gameConfig.PARTICLES.switchEffect;

        if (this.scene.textures.exists(switchConfig.texture)) {
            const emitter = this.scene.add.particles(x, y, switchConfig.texture, {
                scale: switchConfig.scale,
                alpha: switchConfig.alpha,
                speed: switchConfig.speed,
                lifespan: switchConfig.lifespan,
                quantity: switchConfig.quantity,
                emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 5), quantity: switchConfig.quantity }
            });

            this.scene.time.delayedCall(switchConfig.lifespan + 100, () => emitter.destroy());
        }
    }

    // Kill both characters together (main dies => shadow dies) and end the game.
    killAll() {
        if (this.scene.gameStateManager.getState().gameState === 'gameOver') {
            return;
        }

        if (this.mainCharacter) this.mainCharacter.die();
        if (this.shadowCharacter) this.shadowCharacter.die();

        this.scene.gameStateManager.updateState({ gameState: 'gameOver' });
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