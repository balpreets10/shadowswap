// ShadowCaster.js
class ShadowCaster {
    constructor(scene) {
        this.scene = scene;
        this.config = LightSourceConfig.SHADOW_CASTING;
        this.performanceConfig = LightSourceConfig.PERFORMANCE;

        this.shadowPolygons = [];
        this.shadowZones = [];
        this.obstacles = [];

        this.setupGraphics();
        this.setupObjectPools();
    }

    setupGraphics() {
        // Graphics for shadow rendering
        this.shadowGraphics = this.scene.add.graphics();
        this.shadowGraphics.setDepth(-5);

        // Debug graphics for rays and zones
        if (LightSourceConfig.DEBUG.showShadowRays || LightSourceConfig.DEBUG.showShadowZones) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(99);
        }
    }

    setupObjectPools() {
        if (!this.performanceConfig.useObjectPooling) return;

        // Ray pool for performance optimization
        this.rayPool = [];
        this.shadowPointPool = [];
        this.polygonPool = [];

        // Pre-allocate objects
        for (let i = 0; i < 100; i++) {
            this.rayPool.push({ x1: 0, y1: 0, x2: 0, y2: 0, hit: false });
            this.shadowPointPool.push({ x: 0, y: 0 });
        }
    }

    // Register obstacles that cast shadows
    registerObstacle(obstacle) {
        if (!this.obstacles.includes(obstacle)) {
            this.obstacles.push(obstacle);
        }
    }

    unregisterObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index !== -1) {
            this.obstacles.splice(index, 1);
        }
    }

    // Main shadow calculation method
    calculateShadows(lightSource) {
        if (!lightSource.isActive || !lightSource.shadowCasting) {
            return [];
        }

        const lightPos = lightSource.getPosition();
        const shadowPolygons = [];

        // Get relevant obstacles within light range
        const relevantObstacles = this.getRelevantObstacles(
            lightPos.x,
            lightPos.y,
            lightSource.radius
        );

        // Cast shadows for each obstacle
        for (const obstacle of relevantObstacles) {
            const shadowPolygon = this.castShadowFromObstacle(lightPos, obstacle, lightSource.radius);
            if (shadowPolygon && shadowPolygon.length > 0) {
                shadowPolygons.push(shadowPolygon);
            }
        }

        return shadowPolygons;
    }

    getRelevantObstacles(lightX, lightY, lightRadius) {
        return this.obstacles.filter(obstacle => {
            const bounds = obstacle.getBounds();
            if (!bounds) return false;

            // Check if obstacle is within light range + buffer
            const buffer = 50;
            const distance = Phaser.Math.Distance.Between(
                lightX, lightY,
                bounds.x + bounds.width / 2,
                bounds.y + bounds.height / 2
            );

            return distance <= lightRadius + buffer;
        });
    }

    castShadowFromObstacle(lightPos, obstacle, maxDistance) {
        const bounds = obstacle.getBounds();
        if (!bounds) return null;

        // Get obstacle corners
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height }
        ];

        // Find visible corners (ones facing the light)
        const visibleCorners = this.findVisibleCorners(lightPos, corners, bounds);

        if (visibleCorners.length < 2) return null;

        // Cast rays from visible corners
        const shadowPolygon = [];

        for (const corner of visibleCorners) {
            // Add the corner itself
            shadowPolygon.push({ x: corner.x, y: corner.y });

            // Cast ray from light through corner
            const rayDirection = {
                x: corner.x - lightPos.x,
                y: corner.y - lightPos.y
            };

            // Normalize and extend ray
            const rayLength = Math.sqrt(rayDirection.x * rayDirection.x + rayDirection.y * rayDirection.y);
            if (rayLength > 0) {
                rayDirection.x = (rayDirection.x / rayLength) * maxDistance;
                rayDirection.y = (rayDirection.y / rayLength) * maxDistance;

                const shadowPoint = {
                    x: corner.x + rayDirection.x,
                    y: corner.y + rayDirection.y
                };

                shadowPolygon.push(shadowPoint);
            }
        }

        return shadowPolygon;
    }

    findVisibleCorners(lightPos, corners, bounds) {
        const visibleCorners = [];

        // Simple visibility check - corners that are on the "shadow side"
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        const lightToCenter = {
            x: centerX - lightPos.x,
            y: centerY - lightPos.y
        };

        for (const corner of corners) {
            const lightToCorner = {
                x: corner.x - lightPos.x,
                y: corner.y - lightPos.y
            };

            // Use dot product to determine if corner is on the far side
            const dot = lightToCenter.x * lightToCorner.x + lightToCenter.y * lightToCorner.y;

            if (dot > 0) { // Corner is on the far side of the obstacle
                visibleCorners.push(corner);
            }
        }

        // Sort corners by angle for proper polygon formation
        if (visibleCorners.length > 1) {
            visibleCorners.sort((a, b) => {
                const angleA = Math.atan2(a.y - lightPos.y, a.x - lightPos.x);
                const angleB = Math.atan2(b.y - lightPos.y, b.x - lightPos.x);
                return angleA - angleB;
            });
        }

        return visibleCorners;
    }

    // Generate shadow zones where shadow character can move
    generateShadowZones(shadowPolygons) {
        const zones = [];
        const config = LightSourceConfig.SHADOW_ZONES;

        for (const polygon of shadowPolygons) {
            if (polygon.length < 3) continue;

            // Calculate polygon area
            const area = this.calculatePolygonArea(polygon);

            // Only create zones for shadows large enough
            if (area >= config.minimumShadowArea) {
                const zone = {
                    polygon: polygon,
                    area: area,
                    bounds: this.calculatePolygonBounds(polygon),
                    id: `shadow_zone_${zones.length}`
                };

                zones.push(zone);
            }
        }

        // Merge nearby zones if enabled
        return config.shadowMergeDistance > 0 ? this.mergeNearbyZones(zones) : zones;
    }

    calculatePolygonArea(polygon) {
        if (polygon.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        return Math.abs(area) / 2;
    }

    calculatePolygonBounds(polygon) {
        if (polygon.length === 0) return null;

        let minX = polygon[0].x, maxX = polygon[0].x;
        let minY = polygon[0].y, maxY = polygon[0].y;

        for (const point of polygon) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    mergeNearbyZones(zones) {
        const mergeDistance = LightSourceConfig.SHADOW_ZONES.shadowMergeDistance;
        const merged = [];
        const processed = new Set();

        for (let i = 0; i < zones.length; i++) {
            if (processed.has(i)) continue;

            const currentZone = zones[i];
            const nearbyZones = [currentZone];
            processed.add(i);

            // Find nearby zones
            for (let j = i + 1; j < zones.length; j++) {
                if (processed.has(j)) continue;

                const distance = Phaser.Math.Distance.Between(
                    currentZone.bounds.x + currentZone.bounds.width / 2,
                    currentZone.bounds.y + currentZone.bounds.height / 2,
                    zones[j].bounds.x + zones[j].bounds.width / 2,
                    zones[j].bounds.y + zones[j].bounds.height / 2
                );

                if (distance <= mergeDistance) {
                    nearbyZones.push(zones[j]);
                    processed.add(j);
                }
            }

            // Merge zones or add single zone
            if (nearbyZones.length > 1) {
                const mergedZone = this.mergeZones(nearbyZones);
                merged.push(mergedZone);
            } else {
                merged.push(currentZone);
            }
        }

        return merged;
    }

    mergeZones(zones) {
        // Simple merge by combining all polygons
        const allPoints = [];
        let totalArea = 0;

        for (const zone of zones) {
            allPoints.push(...zone.polygon);
            totalArea += zone.area;
        }

        return {
            polygon: allPoints,
            area: totalArea,
            bounds: this.calculatePolygonBounds(allPoints),
            id: `merged_zone_${Date.now()}`
        };
    }

    // Check if point is within shadow zone
    isPointInShadowZone(x, y, zones) {
        for (const zone of zones) {
            if (this.isPointInPolygon(x, y, zone.polygon)) {
                return true;
            }
        }
        return false;
    }

    isPointInPolygon(x, y, polygon) {
        if (polygon.length < 3) return false;

        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if ((polygon[i].y > y) !== (polygon[j].y > y) &&
                x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Rendering methods
    renderShadows(shadowPolygons) {
        this.shadowGraphics.clear();

        if (shadowPolygons.length === 0) return;

        this.shadowGraphics.fillStyle(
            this.config.shadowColor,
            this.config.ambientShadowAlpha
        );

        for (const polygon of shadowPolygons) {
            if (polygon.length < 3) continue;

            this.shadowGraphics.beginPath();
            this.shadowGraphics.moveTo(polygon[0].x, polygon[0].y);

            for (let i = 1; i < polygon.length; i++) {
                this.shadowGraphics.lineTo(polygon[i].x, polygon[i].y);
            }

            this.shadowGraphics.closePath();
            this.shadowGraphics.fillPath();
        }
    }

    renderDebugInfo(lightSource, shadowPolygons, shadowZones) {
        if (!this.debugGraphics) return;

        this.debugGraphics.clear();

        // Render shadow rays
        if (LightSourceConfig.DEBUG.showShadowRays) {
            this.renderDebugRays(lightSource, shadowPolygons);
        }

        // Render shadow zones
        if (LightSourceConfig.DEBUG.showShadowZones) {
            this.renderDebugZones(shadowZones);
        }
    }

    renderDebugRays(lightSource, shadowPolygons) {
        const lightPos = lightSource.getPosition();

        this.debugGraphics.lineStyle(1, LightSourceConfig.DEBUG.rayColor, 0.5);

        for (const polygon of shadowPolygons) {
            for (const point of polygon) {
                this.debugGraphics.lineBetween(lightPos.x, lightPos.y, point.x, point.y);
            }
        }
    }

    renderDebugZones(shadowZones) {
        this.debugGraphics.lineStyle(2, LightSourceConfig.DEBUG.shadowZoneColor, 0.8);
        this.debugGraphics.fillStyle(LightSourceConfig.DEBUG.shadowZoneColor, 0.1);

        for (const zone of shadowZones) {
            if (zone.polygon.length < 3) continue;

            this.debugGraphics.beginPath();
            this.debugGraphics.moveTo(zone.polygon[0].x, zone.polygon[0].y);

            for (let i = 1; i < zone.polygon.length; i++) {
                this.debugGraphics.lineTo(zone.polygon[i].x, zone.polygon[i].y);
            }

            this.debugGraphics.closePath();
            this.debugGraphics.fillPath();
            this.debugGraphics.strokePath();
        }
    }

    // Cleanup
    destroy() {
        if (this.shadowGraphics) {
            this.shadowGraphics.destroy();
        }

        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }

        this.shadowPolygons = [];
        this.shadowZones = [];
        this.obstacles = [];
        this.rayPool = [];
        this.shadowPointPool = [];
        this.polygonPool = [];
    }
}