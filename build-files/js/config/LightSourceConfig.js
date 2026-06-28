// LightSourceConfig.js
// Global numeric light/shadow configuration consumed directly (as `LightSourceConfig`)
// by the lighting system (LightSource, LightSourceManager, ShadowCaster,
// ShadowZoneDetector). Values are numbers because they feed straight into Phaser
// graphics calls (e.g. fillStyle(color, alpha)) and color.toString(16).
//
// NOTE: js/config/LightSourceConfig.json mirrors this data in string form for any
// tooling that loads it via ConfigManager; this .js file is the runtime source of
// truth for the lighting code.
const LightSourceConfig = {
    LIGHT_TYPES: {
        torch: {
            radius: 120,
            intensity: 1.0,
            color: 0xFFAA44,
            shadowCasting: true,
            animated: true,
            animationSpeed: 0.05,
            animationRange: 0.2,
            energyCost: 0,
            category: 'static'
        },
        lamp: {
            radius: 80,
            intensity: 0.8,
            color: 0xFFFFAA,
            shadowCasting: true,
            animated: false,
            animationSpeed: 0,
            animationRange: 0,
            energyCost: 0,
            category: 'static'
        },
        beacon: {
            radius: 200,
            intensity: 1.5,
            color: 0xAAFFFF,
            shadowCasting: true,
            animated: true,
            animationSpeed: 0.02,
            animationRange: 0.3,
            energyCost: 0,
            category: 'moving'
        },
        candle: {
            radius: 60,
            intensity: 0.6,
            color: 0xFFDD88,
            shadowCasting: true,
            animated: true,
            animationSpeed: 0.08,
            animationRange: 0.15,
            energyCost: 0,
            category: 'static'
        }
    },
    SHADOW_CASTING: {
        rayCount: 32,
        maxRayDistance: 300,
        shadowResolution: 8,
        edgeSmoothing: true,
        ambientShadowAlpha: 0.3,
        shadowColor: 0x000000,
        shadowBlendMode: 'MULTIPLY'
    },
    PERFORMANCE: {
        maxLightsPerFrame: 5,
        shadowUpdateInterval: 16,
        useObjectPooling: true,
        spatialPartitionSize: 128,
        cullingDistance: 400,
        qualityLevels: {
            high: { rayCount: 32, shadowResolution: 8, updateInterval: 16 },
            medium: { rayCount: 24, shadowResolution: 6, updateInterval: 24 },
            low: { rayCount: 16, shadowResolution: 4, updateInterval: 32 }
        }
    },
    SHADOW_ZONES: {
        minimumShadowArea: 400,
        shadowMergeDistance: 20,
        zonePadding: 8,
        dynamicUpdate: true,
        collisionCategory: 0x0040,
        debugVisualization: true
    },
    DEBUG: {
        showLightRadius: false,
        showShadowRays: false,
        showShadowZones: true,
        showPerformanceInfo: true,
        lightColor: 0xFFFF00,
        rayColor: 0xFF0000,
        shadowZoneColor: 0xFF00FF
    }
};
