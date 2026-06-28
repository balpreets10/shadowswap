// CollisionConfig.js
const CollisionConfig = {
    // Collision categories (bit flags)
    CATEGORIES: {
        MAIN_CHARACTER: 0x0001,
        SHADOW_CHARACTER: 0x0002,
        SOLID_PLATFORM: 0x0004,
        ONE_WAY_PLATFORM: 0x0008,
        SHADOW_ZONE: 0x0010,
        WORLD_BOUNDS: 0x0020,
        LIGHT_SOURCE: 0x0040,
        DYNAMIC_SHADOW_ZONE: 0x0080
    },

    // Platform types and their properties
    PLATFORM_TYPES: {
        ground: {
            category: 0x0004, // SOLID_PLATFORM
            collidesWith: 0x0003, // MAIN_CHARACTER | SHADOW_CHARACTER
            oneWay: false,
            thickness: 32,
            material: 'stone',
            friction: 0.8,
            bounce: 0,
            castsShadows: true,
            shadowOpacity: 1.0
        },
        float: {
            category: 0x0004, // SOLID_PLATFORM
            collidesWith: 0x0003, // MAIN_CHARACTER | SHADOW_CHARACTER
            oneWay: false,
            thickness: 16,
            material: 'wood',
            friction: 0.6,
            bounce: 0.1,
            castsShadows: true,
            shadowOpacity: 0.8
        },
        oneWay: {
            category: 0x0008, // ONE_WAY_PLATFORM
            collidesWith: 0x0003, // MAIN_CHARACTER | SHADOW_CHARACTER
            oneWay: true,
            thickness: 8,
            material: 'ethereal',
            friction: 0.7,
            bounce: 0,
            castsShadows: false,
            shadowOpacity: 0.3
        },
        shadowOnly: {
            category: 0x0010, // SHADOW_ZONE (static shadow zones)
            collidesWith: 0x0002, // SHADOW_CHARACTER only
            oneWay: false,
            thickness: 16,
            material: 'shadow',
            friction: 0.9,
            bounce: 0,
            castsShadows: false,
            shadowOpacity: 0
        }
    },

    // Character collision properties
    CHARACTER_PHYSICS: {
        main: {
            category: 0x0001, // MAIN_CHARACTER
            collidesWith: 0x0024, // SOLID_PLATFORM | WORLD_BOUNDS
            oneWayCollidesWith: 0x0008, // ONE_WAY_PLATFORM
            shadowZoneCollidesWith: 0x0000, // Cannot access shadow zones
            hitboxWidth: 28,
            hitboxHeight: 44,
            hitboxOffsetX: 2,
            hitboxOffsetY: 4,
            shadowCaster: true,
            shadowRadius: 15
        },
        shadow: {
            category: 0x0002, // SHADOW_CHARACTER
            collidesWith: 0x0034, // SOLID_PLATFORM | SHADOW_ZONE | WORLD_BOUNDS
            oneWayCollidesWith: 0x0008, // ONE_WAY_PLATFORM
            shadowZoneCollidesWith: 0x0090, // SHADOW_ZONE | DYNAMIC_SHADOW_ZONE
            hitboxWidth: 28,
            hitboxHeight: 44,
            hitboxOffsetX: 2,
            hitboxOffsetY: 4,
            shadowCaster: false,
            shadowRadius: 0
        }
    },

    // Light source collision properties
    LIGHT_SOURCE_PHYSICS: {
        torch: {
            category: 0x0040, // LIGHT_SOURCE
            collidesWith: 0x0000, // No physical collision
            radius: 120,
            castsShadows: true,
            blockedBy: 0x0004 | 0x0008 // SOLID_PLATFORM | ONE_WAY_PLATFORM
        },
        lamp: {
            category: 0x0040, // LIGHT_SOURCE
            collidesWith: 0x0000, // No physical collision
            radius: 80,
            castsShadows: true,
            blockedBy: 0x0004 | 0x0008 // SOLID_PLATFORM | ONE_WAY_PLATFORM
        },
        beacon: {
            category: 0x0040, // LIGHT_SOURCE
            collidesWith: 0x0000, // No physical collision
            radius: 200,
            castsShadows: true,
            blockedBy: 0x0004 // Only solid platforms block beacon light
        },
        candle: {
            category: 0x0040, // LIGHT_SOURCE
            collidesWith: 0x0000, // No physical collision
            radius: 60,
            castsShadows: true,
            blockedBy: 0x0004 | 0x0008 // SOLID_PLATFORM | ONE_WAY_PLATFORM
        }
    },

    // Shadow zone properties
    SHADOW_ZONE_PHYSICS: {
        static: {
            category: 0x0010, // SHADOW_ZONE
            collidesWith: 0x0002, // SHADOW_CHARACTER only
            allowsMovement: true,
            restrictMainCharacter: true,
            enhancesShadowAbilities: false
        },
        dynamic: {
            category: 0x0080, // DYNAMIC_SHADOW_ZONE
            collidesWith: 0x0002, // SHADOW_CHARACTER only
            allowsMovement: true,
            restrictMainCharacter: true,
            enhancesShadowAbilities: true
        }
    },

    // One-way platform settings
    ONE_WAY_SETTINGS: {
        velocityThreshold: -50, // Minimum upward velocity to pass through
        positionTolerance: 8, // Pixels above platform center to allow pass-through
        disableTime: 200, // MS to disable collision after passing through
        dropThroughVelocity: 100 // Velocity applied when dropping through
    },

    // Collision detection settings
    COLLISION_SETTINGS: {
        tileSize: 64,
        groundTileHeight: 32,
        floatTileHeight: 16,
        oneWayTileHeight: 8,
        shadowZoneHeight: 16,
        edgeTolerance: 2, // Pixels to prevent edge glitching
        slopeAngleTolerance: 45, // Max angle for walkable slopes
        shadowDetectionRadius: 5, // Radius for shadow zone detection
        lightRayStepSize: 4 // Step size for light ray collision detection
    },

    // Shadow casting settings
    SHADOW_CASTING_SETTINGS: {
        maxShadowDistance: 300,
        shadowRayCount: 32,
        shadowResolution: 8,
        minimumShadowArea: 400,
        shadowMergeDistance: 20,
        shadowEdgeSmoothing: true,
        shadowBlur: 2,
        ambientShadowLevel: 0.3
    },

    // Performance optimization settings
    PERFORMANCE_SETTINGS: {
        maxLightsPerFrame: 5,
        shadowUpdateInterval: 16, // ms
        spatialPartitionSize: 128,
        cullingDistance: 400,
        useObjectPooling: true,
        useSpatialIndexing: true,
        shadowLOD: true, // Level of detail for shadows
        dynamicQualityAdjustment: true
    },

    // Debug visualization colors
    DEBUG_COLORS: {
        solidPlatform: 0x00ff00,
        oneWayPlatform: 0xffff00,
        shadowZone: 0xff00ff,
        dynamicShadowZone: 0x9C27B0,
        characterHitbox: 0xff0000,
        collisionPoint: 0x00ffff,
        lightSource: 0xFFAA44,
        shadowRay: 0xFF4444,
        shadowBoundary: 0x444444,
        lightRadius: 0xFFFF00
    },

    // Movement restriction settings
    MOVEMENT_RESTRICTIONS: {
        shadowOutsideZone: {
            speedMultiplier: 0.3,
            jumpMultiplier: 0.5,
            gracePeriod: 200, // ms before restrictions apply
            warningEffects: true
        },
        mainInShadowZone: {
            pushbackForce: 150,
            damagePerSecond: 10,
            warningDistance: 30, // pixels from shadow zone edge
            pushbackDirection: 'nearest_safe' // 'nearest_safe' or 'last_position'
        }
    },

    // Level interaction settings
    INTERACTION_SETTINGS: {
        switchActivationRadius: 40,
        lightSourceInteractionRadius: 50,
        shadowZoneTransitionTime: 300, // ms for smooth transitions
        characterSwitchCooldown: 200, // ms between character switches
        platformDropThroughHoldTime: 100 // ms to hold down key for drop-through
    }
};