// LightSource.js
class LightSource {
    constructor(scene, x, y, type = 'torch', config = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = config || LightSourceConfig.LIGHT_TYPES[type];

        if (!this.config) {
            console.warn(`Unknown light type: ${type}. Using 'torch' as default.`);
            this.type = 'torch';
            this.config = LightSourceConfig.LIGHT_TYPES.torch;
        }

        this.setupProperties();
        this.createVisuals();
        this.setupAnimation();
    }

    setupProperties() {
        // Core light properties
        this.radius = this.config.radius;
        this.intensity = this.config.intensity;
        this.color = this.config.color;
        this.shadowCasting = this.config.shadowCasting;

        // Animation properties
        this.baseRadius = this.radius;
        this.baseIntensity = this.intensity;
        this.animationTime = Math.random() * Math.PI * 2; // Random start phase

        // State properties
        this.isActive = true;
        this.isDynamic = false;
        this.movementPattern = null;

        // Performance properties
        this.lastShadowUpdate = 0;
        this.shadowUpdateInterval = LightSourceConfig.PERFORMANCE.shadowUpdateInterval;
        this.cullingDistance = LightSourceConfig.PERFORMANCE.cullingDistance;
    }

    createVisuals() {
        // Create light sprite
        this.sprite = this.scene.add.graphics();

        // Create light glow effect (must exist before updateVisuals, which clears it)
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.setDepth(-10);

        // Create debug visualization if enabled
        if (LightSourceConfig.DEBUG.showLightRadius) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(100);
        }

        this.updateVisuals();
    }

    setupAnimation() {
        if (this.config.animated) {
            // Create animation tween for flickering effect
            this.animationTween = this.scene.tweens.add({
                targets: this,
                animationTime: Math.PI * 2,
                duration: (1 / this.config.animationSpeed) * 1000,
                repeat: -1,
                ease: 'Linear',
                onUpdate: () => this.updateAnimatedProperties()
            });
        }
    }

    updateAnimatedProperties() {
        if (!this.config.animated) return;

        const flickerAmount = Math.sin(this.animationTime) * this.config.animationRange;
        this.radius = this.baseRadius * (1 + flickerAmount);
        this.intensity = this.baseIntensity * (1 + flickerAmount * 0.5);

        this.updateVisuals();
    }

    updateVisuals() {
        if (!this.sprite) return;

        // Clear previous graphics
        this.sprite.clear();
        this.glowEffect.clear();

        if (!this.isActive) return;

        // Draw main light source
        this.sprite.fillStyle(this.color, this.intensity * 0.8);
        this.sprite.fillCircle(this.x, this.y, 8);

        // Draw glow effect with gradient
        const glowSteps = 5;
        for (let i = glowSteps; i >= 0; i--) {
            const alpha = (this.intensity * 0.3) * (i / glowSteps);
            const size = (this.radius * 0.6) * ((glowSteps - i) / glowSteps);

            this.glowEffect.fillStyle(this.color, alpha);
            this.glowEffect.fillCircle(this.x, this.y, size);
        }

        // Update debug visualization
        this.updateDebugVisualization();
    }

    updateDebugVisualization() {
        if (!this.debugGraphics || !LightSourceConfig.DEBUG.showLightRadius) return;

        this.debugGraphics.clear();

        if (this.isActive) {
            // Draw light radius circle
            this.debugGraphics.lineStyle(2, LightSourceConfig.DEBUG.lightColor, 0.5);
            this.debugGraphics.strokeCircle(this.x, this.y, this.radius);

            // Draw light info text
            const infoText = `${this.type}\nR:${Math.round(this.radius)}\nI:${this.intensity.toFixed(1)}`;
            if (this.scene.add && this.scene.add.text) {
                if (this.debugText) this.debugText.destroy();
                this.debugText = this.scene.add.text(
                    this.x + this.radius + 10,
                    this.y - 20,
                    infoText,
                    {
                        fontSize: '10px',
                        color: `#${LightSourceConfig.DEBUG.lightColor.toString(16)}`,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: { x: 4, y: 2 }
                    }
                );
            }
        }
    }

    // Position management
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateVisuals();
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    move(deltaX, deltaY) {
        this.setPosition(this.x + deltaX, this.y + deltaY);
    }

    // State management
    activate() {
        this.isActive = true;
        this.updateVisuals();
    }

    deactivate() {
        this.isActive = false;
        this.updateVisuals();
    }

    toggle() {
        this.isActive = !this.isActive;
        this.updateVisuals();
    }

    // Property modification
    setIntensity(intensity) {
        this.baseIntensity = Math.max(0, Math.min(2, intensity));
        this.intensity = this.baseIntensity;
        this.updateVisuals();
    }

    setRadius(radius) {
        this.baseRadius = Math.max(10, Math.min(500, radius));
        this.radius = this.baseRadius;
        this.updateVisuals();
    }

    setColor(color) {
        this.color = color;
        this.updateVisuals();
    }

    // Movement patterns for dynamic lights
    setMovementPattern(pattern) {
        this.movementPattern = pattern;
        this.isDynamic = pattern !== null;
    }

    updateMovement(deltaTime) {
        if (!this.isDynamic || !this.movementPattern) return;

        // This will be extended with specific movement patterns
        // For now, placeholder for future movement logic
    }

    // Collision and interaction
    containsPoint(x, y) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);
        return distance <= this.radius;
    }

    distanceToPoint(x, y) {
        return Phaser.Math.Distance.Between(this.x, this.y, x, y);
    }

    isWithinCullingDistance(cameraX, cameraY) {
        const distance = this.distanceToPoint(cameraX, cameraY);
        return distance <= this.cullingDistance;
    }

    // Performance optimization
    shouldUpdateShadows(currentTime) {
        if (currentTime - this.lastShadowUpdate >= this.shadowUpdateInterval) {
            this.lastShadowUpdate = currentTime;
            return true;
        }
        return false;
    }

    // Utility methods
    getLightInfo() {
        return {
            id: this.id,
            type: this.type,
            position: { x: this.x, y: this.y },
            radius: this.radius,
            intensity: this.intensity,
            color: this.color,
            isActive: this.isActive,
            shadowCasting: this.shadowCasting
        };
    }

    // Cleanup
    destroy() {
        if (this.animationTween) {
            this.animationTween.destroy();
        }

        if (this.sprite) {
            this.sprite.destroy();
        }

        if (this.glowEffect) {
            this.glowEffect.destroy();
        }

        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }

        if (this.debugText) {
            this.debugText.destroy();
        }
    }
}