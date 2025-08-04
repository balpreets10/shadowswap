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

        // Set initial states
        this.activateMain();
        this.shadowCharacter.setFollowTarget(this.mainCharacter);
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

        // Visual feedback
        this.mainCharacter.sprite.setAlpha(1);
        this.mainCharacter.sprite.setTint(0xffffff);
        this.shadowCharacter.deactivate();

        // Camera follows main character
        this.scene.cameras.main.startFollow(this.mainCharacter.sprite, true, 0.1, 0.1);

        // Update game state
        this.scene.gameStateManager.updateState({ activeCharacter: 'main' });
    }

    activateShadow() {
        this.activeCharacter = 'shadow';

        // Visual feedback
        this.mainCharacter.sprite.setAlpha(0.4);
        this.mainCharacter.sprite.setTint(0x888888);
        this.shadowCharacter.activate();

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
            shadowPosition: this.shadowCharacter ? this.shadowCharacter.getPosition() : null
        };
    }
}