// ShadowZoneDetector.js
class ShadowZoneDetector {
    constructor(scene, lightSourceManager) {
        this.scene = scene;
        this.lightSourceManager = lightSourceManager;
        this.config = LightSourceConfig.SHADOW_ZONES;

        this.setupCollisionDetection();
        this.setupDebugVisualization();
    }

    setupCollisionDetection() {
        this.trackedCharacters = new Map();
        this.characterShadowStates = new Map();
        this.collisionCallbacks = new Map();

        // Performance optimization
        this.lastCheck = 0;
        this.checkInterval = 16; // Check every 16ms (60fps)
        this.spatialOptimization = true;
    }

    setupDebugVisualization() {
        if (LightSourceConfig.DEBUG.showShadowZones) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(98);
        }
    }

    // Character registration
    registerCharacter(character, characterType = 'shadow') {
        const id = character.sprite.body ? character.sprite.body.id || character.id : character.id;

        this.trackedCharacters.set(id, {
            character: character,
            type: characterType,
            lastPosition: character.getPosition(),
            inShadowZone: false,
            currentZone: null,
            canUseShadowZones: characterType === 'shadow'
        });

        this.characterShadowStates.set(id, {
            wasInShadow: false,
            enterTime: 0,
            exitTime: 0,
            violations: 0
        });

        return id;
    }

    unregisterCharacter(characterId) {
        this.trackedCharacters.delete(characterId);
        this.characterShadowStates.delete(characterId);
        this.collisionCallbacks.delete(characterId);
    }

    // Callback system
    onShadowZoneEnter(characterId, callback) {
        if (!this.collisionCallbacks.has(characterId)) {
            this.collisionCallbacks.set(characterId, {});
        }
        this.collisionCallbacks.get(characterId).onEnter = callback;
    }

    onShadowZoneExit(characterId, callback) {
        if (!this.collisionCallbacks.has(characterId)) {
            this.collisionCallbacks.set(characterId, {});
        }
        this.collisionCallbacks.get(characterId).onExit = callback;
    }

    onShadowZoneViolation(characterId, callback) {
        if (!this.collisionCallbacks.has(characterId)) {
            this.collisionCallbacks.set(characterId, {});
        }
        this.collisionCallbacks.get(characterId).onViolation = callback;
    }

    // Main update loop
    update(time, delta) {
        if (time - this.lastCheck < this.checkInterval) {
            return;
        }
        this.lastCheck = time;

        const shadowZones = this.lightSourceManager.getActiveShadowZones();

        for (const [characterId, characterData] of this.trackedCharacters) {
            this.updateCharacterShadowState(characterId, characterData, shadowZones, time);
        }

        this.updateDebugVisualization(shadowZones);
    }

    updateCharacterShadowState(characterId, characterData, shadowZones, time) {
        const character = characterData.character;
        const currentPos = character.getPosition();
        const characterState = this.characterShadowStates.get(characterId);

        // Check if character is in any shadow zone
        const { inShadow, zone } = this.checkShadowZoneCollision(currentPos, shadowZones);

        const wasInShadow = characterData.inShadowZone;
        characterData.inShadowZone = inShadow;
        characterData.currentZone = zone;
        characterData.lastPosition = currentPos;

        // Handle shadow zone transitions
        if (inShadow && !wasInShadow) {
            this.handleShadowZoneEnter(characterId, characterData, zone, time);
        } else if (!inShadow && wasInShadow) {
            this.handleShadowZoneExit(characterId, characterData, time);
        }

        // Check for violations (main character in shadow zones when not allowed)
        if (inShadow && characterData.type === 'main' && !characterData.canUseShadowZones) {
            this.handleShadowZoneViolation(characterId, characterData, time);
        }

        // Update character state
        characterState.wasInShadow = inShadow;
    }

    checkShadowZoneCollision(position, shadowZones) {
        if (!this.spatialOptimization) {
            // Simple check all zones
            for (const zone of shadowZones) {
                if (this.isPointInZone(position.x, position.y, zone)) {
                    return { inShadow: true, zone: zone };
                }
            }
            return { inShadow: false, zone: null };
        }

        // Optimized spatial check
        const nearbyZones = shadowZones.filter(zone =>
            this.isPositionNearZone(position, zone)
        );

        for (const zone of nearbyZones) {
            if (this.isPointInZone(position.x, position.y, zone)) {
                return { inShadow: true, zone: zone };
            }
        }

        return { inShadow: false, zone: null };
    }

    isPositionNearZone(position, zone) {
        const bounds = zone.bounds;
        const padding = this.config.zonePadding;

        return position.x >= bounds.x - padding &&
            position.x <= bounds.x + bounds.width + padding &&
            position.y >= bounds.y - padding &&
            position.y <= bounds.y + bounds.height + padding;
    }

    isPointInZone(x, y, zone) {
        return this.lightSourceManager.shadowCaster.isPointInPolygon(x, y, zone.polygon);
    }

    // Event handlers
    handleShadowZoneEnter(characterId, characterData, zone, time) {
        const characterState = this.characterShadowStates.get(characterId);
        characterState.enterTime = time;

        // Execute callback
        const callbacks = this.collisionCallbacks.get(characterId);
        if (callbacks && callbacks.onEnter) {
            callbacks.onEnter(characterData.character, zone);
        }

        // Visual feedback
        this.createEnterEffect(characterData.character, zone);
    }

    handleShadowZoneExit(characterId, characterData, time) {
        const characterState = this.characterShadowStates.get(characterId);
        characterState.exitTime = time;

        // Execute callback
        const callbacks = this.collisionCallbacks.get(characterId);
        if (callbacks && callbacks.onExit) {
            callbacks.onExit(characterData.character, characterData.currentZone);
        }

        // Visual feedback
        this.createExitEffect(characterData.character);
    }

    handleShadowZoneViolation(characterId, characterData, time) {
        const characterState = this.characterShadowStates.get(characterId);
        characterState.violations++;

        // Execute callback
        const callbacks = this.collisionCallbacks.get(characterId);
        if (callbacks && callbacks.onViolation) {
            callbacks.onViolation(characterData.character, characterData.currentZone);
        }

        // Visual feedback for violation
        this.createViolationEffect(characterData.character);
    }

    // Visual effects
    createEnterEffect(character, zone) {
        const pos = character.getPosition();

        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(pos.x, pos.y, 'switch-particle', {
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.8, end: 0 },
                speed: { min: 30, max: 80 },
                lifespan: 600,
                quantity: 8,
                tint: 0x9C27B0
            });

            this.scene.time.delayedCall(700, () => emitter.destroy());
        }
    }

    createExitEffect(character) {
        const pos = character.getPosition();

        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(pos.x, pos.y, 'switch-particle', {
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.6, end: 0 },
                speed: { min: 50, max: 100 },
                lifespan: 400,
                quantity: 6,
                tint: 0x666666
            });

            this.scene.time.delayedCall(500, () => emitter.destroy());
        }
    }

    createViolationEffect(character) {
        const pos = character.getPosition();

        // Warning flash effect
        this.scene.cameras.main.flash(200, 255, 100, 100, false);

        if (this.scene.textures.exists('switch-particle')) {
            const emitter = this.scene.add.particles(pos.x, pos.y, 'switch-particle', {
                scale: { start: 0.6, end: 0 },
                alpha: { start: 1, end: 0 },
                speed: { min: 80, max: 150 },
                lifespan: 300,
                quantity: 12,
                tint: 0xFF4444
            });

            this.scene.time.delayedCall(400, () => emitter.destroy());
        }
    }

    // Query methods
    isCharacterInShadowZone(characterId) {
        const characterData = this.trackedCharacters.get(characterId);
        return characterData ? characterData.inShadowZone : false;
    }

    getCharacterCurrentZone(characterId) {
        const characterData = this.trackedCharacters.get(characterId);
        return characterData ? characterData.currentZone : null;
    }

    getCharacterShadowState(characterId) {
        return this.characterShadowStates.get(characterId);
    }

    getAllCharacterStates() {
        const states = {};
        for (const [id, data] of this.trackedCharacters) {
            states[id] = {
                character: data.character,
                type: data.type,
                inShadowZone: data.inShadowZone,
                currentZone: data.currentZone,
                shadowState: this.characterShadowStates.get(id)
            };
        }
        return states;
    }

    // Configuration
    setCharacterShadowAccess(characterId, canUseShadowZones) {
        const characterData = this.trackedCharacters.get(characterId);
        if (characterData) {
            characterData.canUseShadowZones = canUseShadowZones;
        }
    }

    setSpatialOptimization(enabled) {
        this.spatialOptimization = enabled;
    }

    setCheckInterval(interval) {
        this.checkInterval = Math.max(8, interval); // Minimum 8ms (120fps)
    }

    // Debug visualization
    updateDebugVisualization(shadowZones) {
        if (!this.debugGraphics) return;

        this.debugGraphics.clear();

        // Draw character positions and states
        for (const [characterId, characterData] of this.trackedCharacters) {
            const pos = characterData.character.getPosition();
            const color = characterData.inShadowZone ? 0x00FF00 : 0xFF0000;
            const alpha = characterData.canUseShadowZones ? 0.8 : 0.4;

            this.debugGraphics.fillStyle(color, alpha);
            this.debugGraphics.fillCircle(pos.x, pos.y, 8);

            // Draw character type indicator
            const typeColor = characterData.type === 'shadow' ? 0x9C27B0 : 0x4CAF50;
            this.debugGraphics.lineStyle(2, typeColor, 0.8);
            this.debugGraphics.strokeCircle(pos.x, pos.y, 12);
        }

        // Draw zone interaction indicators
        this.drawZoneInteractions(shadowZones);
    }

    drawZoneInteractions(shadowZones) {
        for (const [characterId, characterData] of this.trackedCharacters) {
            if (characterData.inShadowZone && characterData.currentZone) {
                const pos = characterData.character.getPosition();
                const zone = characterData.currentZone;
                const zoneBounds = zone.bounds;
                const zoneCenter = {
                    x: zoneBounds.x + zoneBounds.width / 2,
                    y: zoneBounds.y + zoneBounds.height / 2
                };

                // Draw connection line
                const lineColor = characterData.canUseShadowZones ? 0x00FF00 : 0xFF0000;
                this.debugGraphics.lineStyle(2, lineColor, 0.6);
                this.debugGraphics.lineBetween(pos.x, pos.y, zoneCenter.x, zoneCenter.y);
            }
        }
    }

    // Utility methods
    getClosestShadowZone(position) {
        const shadowZones = this.lightSourceManager.getActiveShadowZones();
        let closestZone = null;
        let closestDistance = Infinity;

        for (const zone of shadowZones) {
            const zoneBounds = zone.bounds;
            const zoneCenter = {
                x: zoneBounds.x + zoneBounds.width / 2,
                y: zoneBounds.y + zoneBounds.height / 2
            };

            const distance = Phaser.Math.Distance.Between(
                position.x, position.y,
                zoneCenter.x, zoneCenter.y
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestZone = zone;
            }
        }

        return { zone: closestZone, distance: closestDistance };
    }

    getShadowZonesInRadius(position, radius) {
        const shadowZones = this.lightSourceManager.getActiveShadowZones();
        return shadowZones.filter(zone => {
            const zoneBounds = zone.bounds;
            const zoneCenter = {
                x: zoneBounds.x + zoneBounds.width / 2,
                y: zoneBounds.y + zoneBounds.height / 2
            };

            const distance = Phaser.Math.Distance.Between(
                position.x, position.y,
                zoneCenter.x, zoneCenter.y
            );

            return distance <= radius;
        });
    }

    // Performance monitoring
    getPerformanceMetrics() {
        return {
            trackedCharacters: this.trackedCharacters.size,
            checkInterval: this.checkInterval,
            spatialOptimization: this.spatialOptimization,
            activeShadowZones: this.lightSourceManager.getActiveShadowZones().length
        };
    }

    // Cleanup
    destroy() {
        this.trackedCharacters.clear();
        this.characterShadowStates.clear();
        this.collisionCallbacks.clear();

        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
    }
}