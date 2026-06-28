// LightSourceManager.js
class LightSourceManager {
    constructor(scene) {
        this.scene = scene;
        this.config = LightSourceConfig;

        this.lightSources = new Map();
        this.shadowCaster = new ShadowCaster(scene);
        this.activeShadowZones = [];

        this.setupPerformanceOptimization();
        this.setupUpdateLoop();
    }

    setupPerformanceOptimization() {
        this.performanceConfig = this.config.PERFORMANCE;
        this.currentQuality = 'high';
        this.frameTime = 0;
        this.lastOptimizationCheck = 0;

        // Spatial partitioning for efficient culling
        this.spatialGrid = new Map();
        this.gridSize = this.performanceConfig.spatialPartitionSize;
    }

    setupUpdateLoop() {
        this.lastUpdate = 0;
        this.updateInterval = this.performanceConfig.qualityLevels[this.currentQuality].updateInterval;

        // Performance monitoring
        this.performanceMetrics = {
            lightCount: 0,
            shadowsCalculated: 0,
            frameTime: 0,
            lastFPS: 60
        };
    }

    // Light source management
    addLightSource(id, x, y, type = 'torch', config = null) {
        if (this.lightSources.has(id)) {
            console.warn(`Light source with ID ${id} already exists. Updating position.`);
            this.lightSources.get(id).setPosition(x, y);
            return this.lightSources.get(id);
        }

        const lightSource = new LightSource(this.scene, x, y, type, config);
        lightSource.id = id;
        this.lightSources.set(id, lightSource);

        this.updateSpatialGrid(lightSource);
        return lightSource;
    }

    removeLightSource(id) {
        const lightSource = this.lightSources.get(id);
        if (lightSource) {
            this.removeFromSpatialGrid(lightSource);
            lightSource.destroy();
            this.lightSources.delete(id);
            return true;
        }
        return false;
    }

    getLightSource(id) {
        return this.lightSources.get(id);
    }

    getAllLightSources() {
        return Array.from(this.lightSources.values());
    }

    getActiveLightSources() {
        return Array.from(this.lightSources.values()).filter(light => light.isActive);
    }

    // Spatial grid management for performance
    updateSpatialGrid(lightSource) {
        this.removeFromSpatialGrid(lightSource);

        const gridX = Math.floor(lightSource.x / this.gridSize);
        const gridY = Math.floor(lightSource.y / this.gridSize);
        const key = `${gridX},${gridY}`;

        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, []);
        }

        this.spatialGrid.get(key).push(lightSource);
        lightSource.gridKey = key;
    }

    removeFromSpatialGrid(lightSource) {
        if (lightSource.gridKey) {
            const grid = this.spatialGrid.get(lightSource.gridKey);
            if (grid) {
                const index = grid.indexOf(lightSource);
                if (index !== -1) {
                    grid.splice(index, 1);
                    if (grid.length === 0) {
                        this.spatialGrid.delete(lightSource.gridKey);
                    }
                }
            }
            lightSource.gridKey = null;
        }
    }

    getNearbyLightSources(x, y, radius) {
        const nearby = [];
        const searchRadius = Math.ceil(radius / this.gridSize);
        const centerX = Math.floor(x / this.gridSize);
        const centerY = Math.floor(y / this.gridSize);

        for (let gx = centerX - searchRadius; gx <= centerX + searchRadius; gx++) {
            for (let gy = centerY - searchRadius; gy <= centerY + searchRadius; gy++) {
                const key = `${gx},${gy}`;
                const grid = this.spatialGrid.get(key);
                if (grid) {
                    for (const light of grid) {
                        if (light.distanceToPoint(x, y) <= radius) {
                            nearby.push(light);
                        }
                    }
                }
            }
        }

        return nearby;
    }

    // Obstacle management
    registerObstacle(obstacle) {
        this.shadowCaster.registerObstacle(obstacle);
    }

    unregisterObstacle(obstacle) {
        this.shadowCaster.unregisterObstacle(obstacle);
    }

    // Main update loop
    update(time, delta) {
        const startTime = performance.now();

        // Check if we should update this frame
        if (time - this.lastUpdate < this.updateInterval) {
            return;
        }

        this.lastUpdate = time;

        // Update light sources
        this.updateLightSources(delta);

        // Calculate shadows and zones
        this.updateShadowCalculations();

        // Performance monitoring and optimization
        this.frameTime = performance.now() - startTime;
        this.updatePerformanceMetrics(time);
        this.optimizePerformance();
    }

    updateLightSources(delta) {
        for (const lightSource of this.lightSources.values()) {
            if (lightSource.isDynamic) {
                lightSource.updateMovement(delta);
                this.updateSpatialGrid(lightSource);
            }
        }
    }

    updateShadowCalculations() {
        const activeLights = this.getActiveLightSources();
        const cameraCenter = this.getCameraCenter();

        // Cull lights outside view
        const visibleLights = activeLights.filter(light =>
            light.isWithinCullingDistance(cameraCenter.x, cameraCenter.y)
        );

        // Limit number of lights processed per frame
        const lightsToProcess = visibleLights.slice(0, this.performanceConfig.maxLightsPerFrame);

        // Calculate shadows for each light
        const allShadowPolygons = [];
        for (const light of lightsToProcess) {
            if (light.shouldUpdateShadows(this.lastUpdate)) {
                const shadowPolygons = this.shadowCaster.calculateShadows(light);
                allShadowPolygons.push(...shadowPolygons);
            }
        }

        // Generate shadow zones
        this.activeShadowZones = this.shadowCaster.generateShadowZones(allShadowPolygons);

        // Render shadows
        this.shadowCaster.renderShadows(allShadowPolygons);

        // Debug rendering
        if (this.config.DEBUG.showShadowRays || this.config.DEBUG.showShadowZones) {
            for (const light of lightsToProcess) {
                const shadowPolygons = this.shadowCaster.calculateShadows(light);
                this.shadowCaster.renderDebugInfo(light, shadowPolygons, this.activeShadowZones);
            }
        }

        this.performanceMetrics.shadowsCalculated = allShadowPolygons.length;
    }

    getCameraCenter() {
        const camera = this.scene.cameras.main;
        return {
            x: camera.scrollX + camera.width / 2,
            y: camera.scrollY + camera.height / 2
        };
    }

    // Shadow zone queries
    isPointInShadowZone(x, y) {
        return this.shadowCaster.isPointInShadowZone(x, y, this.activeShadowZones);
    }

    getShadowZonesNearPoint(x, y, radius) {
        return this.activeShadowZones.filter(zone => {
            const bounds = zone.bounds;
            const distance = Phaser.Math.Distance.Between(
                x, y,
                bounds.x + bounds.width / 2,
                bounds.y + bounds.height / 2
            );
            return distance <= radius;
        });
    }

    getActiveShadowZones() {
        return [...this.activeShadowZones];
    }

    // Performance monitoring and optimization
    updatePerformanceMetrics(time) {
        this.performanceMetrics.lightCount = this.lightSources.size;
        this.performanceMetrics.frameTime = this.frameTime;

        // Calculate FPS
        if (time - this.lastOptimizationCheck > 1000) {
            this.performanceMetrics.lastFPS = Math.round(1000 / this.frameTime);
            this.lastOptimizationCheck = time;
        }
    }

    optimizePerformance() {
        const targetFPS = 60;
        const currentFPS = this.performanceMetrics.lastFPS;

        // Auto-adjust quality based on performance
        if (currentFPS < targetFPS - 10 && this.currentQuality !== 'low') {
            this.lowerQuality();
        } else if (currentFPS > targetFPS + 5 && this.currentQuality !== 'high') {
            this.raiseQuality();
        }
    }

    lowerQuality() {
        const qualityLevels = ['high', 'medium', 'low'];
        const currentIndex = qualityLevels.indexOf(this.currentQuality);

        if (currentIndex < qualityLevels.length - 1) {
            this.currentQuality = qualityLevels[currentIndex + 1];
            this.applyQualitySettings();
        }
    }

    raiseQuality() {
        const qualityLevels = ['high', 'medium', 'low'];
        const currentIndex = qualityLevels.indexOf(this.currentQuality);

        if (currentIndex > 0) {
            this.currentQuality = qualityLevels[currentIndex - 1];
            this.applyQualitySettings();
        }
    }

    applyQualitySettings() {
        const settings = this.performanceConfig.qualityLevels[this.currentQuality];
        this.updateInterval = settings.updateInterval;

        // Update shadow caster config
        this.shadowCaster.config.rayCount = settings.rayCount;
        this.shadowCaster.config.shadowResolution = settings.shadowResolution;
    }

    // Light control methods
    activateLight(id) {
        const light = this.getLightSource(id);
        if (light) {
            light.activate();
            return true;
        }
        return false;
    }

    deactivateLight(id) {
        const light = this.getLightSource(id);
        if (light) {
            light.deactivate();
            return true;
        }
        return false;
    }

    toggleLight(id) {
        const light = this.getLightSource(id);
        if (light) {
            light.toggle();
            return light.isActive;
        }
        return false;
    }

    setLightIntensity(id, intensity) {
        const light = this.getLightSource(id);
        if (light) {
            light.setIntensity(intensity);
            return true;
        }
        return false;
    }

    setLightRadius(id, radius) {
        const light = this.getLightSource(id);
        if (light) {
            light.setRadius(radius);
            return true;
        }
        return false;
    }

    moveLightSource(id, x, y) {
        const light = this.getLightSource(id);
        if (light) {
            light.setPosition(x, y);
            this.updateSpatialGrid(light);
            return true;
        }
        return false;
    }

    // Batch operations
    activateAllLights() {
        for (const light of this.lightSources.values()) {
            light.activate();
        }
    }

    deactivateAllLights() {
        for (const light of this.lightSources.values()) {
            light.deactivate();
        }
    }

    setGlobalIntensity(multiplier) {
        for (const light of this.lightSources.values()) {
            light.setIntensity(light.baseIntensity * multiplier);
        }
    }

    // Debug and utility
    getPerformanceInfo() {
        return {
            ...this.performanceMetrics,
            currentQuality: this.currentQuality,
            activeLights: this.getActiveLightSources().length,
            shadowZones: this.activeShadowZones.length
        };
    }

    getDebugInfo() {
        return {
            totalLights: this.lightSources.size,
            activeLights: this.getActiveLightSources().length,
            shadowZones: this.activeShadowZones.length,
            performance: this.getPerformanceInfo(),
            spatialGridCells: this.spatialGrid.size
        };
    }

    // Cleanup
    destroy() {
        // Destroy all light sources
        for (const light of this.lightSources.values()) {
            light.destroy();
        }

        this.lightSources.clear();

        // Destroy shadow caster
        if (this.shadowCaster) {
            this.shadowCaster.destroy();
        }

        // Clear spatial grid
        this.spatialGrid.clear();
        this.activeShadowZones = [];
    }
}