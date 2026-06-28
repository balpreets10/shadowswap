// PerformanceProfiler.js
class PerformanceProfiler {
    constructor(scene) {
        this.scene = scene;
        this.enabled = LightSourceConfig.DEBUG.showPerformanceInfo;

        this.metrics = {
            frameTime: [],
            lightCalculationTime: [],
            shadowCalculationTime: [],
            renderTime: [],
            memoryUsage: [],
            lightCount: [],
            shadowZoneCount: [],
            fps: []
        };

        this.thresholds = {
            targetFPS: 60,
            maxFrameTime: 16.67, // 60 FPS
            criticalFrameTime: 33.33, // 30 FPS
            maxLights: 10,
            maxShadowZones: 20
        };

        this.samplingConfig = {
            maxSamples: 100,
            samplingInterval: 100, // ms
            averageWindow: 30
        };

        this.lastSample = 0;
        this.profilingData = {};
        this.bottlenecks = [];

        this.setupProfiling();
    }

    setupProfiling() {
        this.profilingData = {
            lightManager: {
                updateTime: 0,
                shadowCalculationTime: 0,
                renderTime: 0,
                lastUpdate: 0
            },
            shadowCaster: {
                raycastTime: 0,
                polygonGenerationTime: 0,
                zoneDetectionTime: 0,
                lastUpdate: 0
            },
            renderer: {
                drawCallsCount: 0,
                particleCount: 0,
                textureMemory: 0,
                lastUpdate: 0
            }
        };

        // Performance monitoring intervals
        this.fpsCalculator = new FPSCalculator();
        this.memoryMonitor = new MemoryMonitor();
    }

    // Main profiling methods
    startProfiling(category, operation) {
        if (!this.enabled) return null;

        return {
            category,
            operation,
            startTime: performance.now(),
            startMemory: this.getMemoryUsage()
        };
    }

    endProfiling(profileData) {
        if (!this.enabled || !profileData) return;

        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();

        const duration = endTime - profileData.startTime;
        const memoryDelta = endMemory - profileData.startMemory;

        this.recordMetric(profileData.category, profileData.operation, {
            duration,
            memory: memoryDelta,
            timestamp: endTime
        });
    }

    recordMetric(category, operation, data) {
        if (!this.profilingData[category]) {
            this.profilingData[category] = {};
        }

        if (!this.profilingData[category][operation]) {
            this.profilingData[category][operation] = {
                samples: [],
                totalTime: 0,
                totalMemory: 0,
                callCount: 0,
                averageTime: 0,
                maxTime: 0,
                minTime: Infinity
            };
        }

        const metric = this.profilingData[category][operation];
        metric.samples.push(data);
        metric.totalTime += data.duration;
        metric.totalMemory += data.memory;
        metric.callCount++;
        metric.maxTime = Math.max(metric.maxTime, data.duration);
        metric.minTime = Math.min(metric.minTime, data.duration);
        metric.averageTime = metric.totalTime / metric.callCount;

        // Keep only recent samples
        if (metric.samples.length > this.samplingConfig.maxSamples) {
            const removed = metric.samples.shift();
            metric.totalTime -= removed.duration;
            metric.totalMemory -= removed.memory;
            metric.callCount--;
        }
    }

    // Update method called each frame
    update(time, delta) {
        if (!this.enabled) return;

        if (time - this.lastSample < this.samplingConfig.samplingInterval) {
            return;
        }
        this.lastSample = time;

        // Update FPS and frame time
        this.fpsCalculator.update(delta);
        const currentFPS = this.fpsCalculator.getFPS();
        const frameTime = 1000 / currentFPS;

        this.recordSample('fps', currentFPS);
        this.recordSample('frameTime', frameTime);

        // Update memory usage
        const memoryUsage = this.getMemoryUsage();
        this.recordSample('memoryUsage', memoryUsage);

        // Check for performance issues
        this.checkPerformanceThresholds(frameTime, currentFPS);

        // Update bottleneck detection
        this.updateBottleneckDetection();
    }

    recordSample(metric, value) {
        if (!this.metrics[metric]) {
            this.metrics[metric] = [];
        }

        this.metrics[metric].push({
            value,
            timestamp: performance.now()
        });

        // Keep only recent samples
        if (this.metrics[metric].length > this.samplingConfig.maxSamples) {
            this.metrics[metric].shift();
        }
    }

    checkPerformanceThresholds(frameTime, fps) {
        const issues = [];

        if (fps < this.thresholds.targetFPS * 0.8) {
            issues.push({
                type: 'low_fps',
                severity: fps < this.thresholds.targetFPS * 0.5 ? 'critical' : 'warning',
                value: fps,
                threshold: this.thresholds.targetFPS
            });
        }

        if (frameTime > this.thresholds.maxFrameTime) {
            issues.push({
                type: 'high_frame_time',
                severity: frameTime > this.thresholds.criticalFrameTime ? 'critical' : 'warning',
                value: frameTime,
                threshold: this.thresholds.maxFrameTime
            });
        }

        // Check light system specific thresholds
        if (this.scene.lightSourceManager) {
            const lightCount = this.scene.lightSourceManager.getActiveLightSources().length;
            const shadowZoneCount = this.scene.lightSourceManager.getActiveShadowZones().length;

            if (lightCount > this.thresholds.maxLights) {
                issues.push({
                    type: 'too_many_lights',
                    severity: 'warning',
                    value: lightCount,
                    threshold: this.thresholds.maxLights
                });
            }

            if (shadowZoneCount > this.thresholds.maxShadowZones) {
                issues.push({
                    type: 'too_many_shadow_zones',
                    severity: 'warning',
                    value: shadowZoneCount,
                    threshold: this.thresholds.maxShadowZones
                });
            }
        }

        this.processPerformanceIssues(issues);
    }

    processPerformanceIssues(issues) {
        for (const issue of issues) {
            console.warn(`Performance Issue [${issue.severity}]: ${issue.type}`, {
                current: issue.value,
                threshold: issue.threshold,
                recommendations: this.getRecommendations(issue.type)
            });

            // Auto-optimize if critical
            if (issue.severity === 'critical') {
                this.autoOptimize(issue.type);
            }
        }
    }

    autoOptimize(issueType) {
        switch (issueType) {
            case 'low_fps':
            case 'high_frame_time':
                if (this.scene.lightSourceManager) {
                    this.scene.lightSourceManager.lowerQuality();
                }
                break;

            case 'too_many_lights':
                if (this.scene.lightSourceManager) {
                    this.optimizeLightSources();
                }
                break;

            case 'too_many_shadow_zones':
                if (this.scene.lightSourceManager) {
                    this.optimizeShadowZones();
                }
                break;
        }
    }

    optimizeLightSources() {
        const lightManager = this.scene.lightSourceManager;
        const activeLights = lightManager.getActiveLightSources();

        // Disable furthest lights first
        const cameraCenter = lightManager.getCameraCenter();
        const sortedLights = activeLights.sort((a, b) =>
            b.distanceToPoint(cameraCenter.x, cameraCenter.y) -
            a.distanceToPoint(cameraCenter.x, cameraCenter.y)
        );

        const lightsToDisable = Math.max(1, sortedLights.length - this.thresholds.maxLights);
        for (let i = 0; i < lightsToDisable; i++) {
            sortedLights[i].deactivate();
        }

        console.log(`Auto-optimization: Disabled ${lightsToDisable} distant light sources`);
    }

    optimizeShadowZones() {
        // This would involve optimizing shadow zone calculation
        // For now, just reduce shadow quality
        if (this.scene.lightSourceManager) {
            this.scene.lightSourceManager.lowerQuality();
        }
    }

    updateBottleneckDetection() {
        this.bottlenecks = [];

        // Analyze profiling data to find bottlenecks
        for (const [category, operations] of Object.entries(this.profilingData)) {
            for (const [operation, data] of Object.entries(operations)) {
                if (data.averageTime > 5) { // More than 5ms average
                    this.bottlenecks.push({
                        category,
                        operation,
                        averageTime: data.averageTime,
                        maxTime: data.maxTime,
                        callCount: data.callCount,
                        severity: data.averageTime > 10 ? 'high' : 'medium'
                    });
                }
            }
        }

        // Sort by impact (average time * call frequency)
        this.bottlenecks.sort((a, b) =>
            (b.averageTime * b.callCount) - (a.averageTime * a.callCount)
        );
    }

    getRecommendations(issueType) {
        const recommendations = {
            'low_fps': [
                'Reduce light source count',
                'Lower shadow quality settings',
                'Disable particle effects',
                'Reduce shadow zone complexity'
            ],
            'high_frame_time': [
                'Enable spatial optimization',
                'Increase shadow update interval',
                'Use object pooling',
                'Reduce ray casting resolution'
            ],
            'too_many_lights': [
                'Implement light culling',
                'Use level-of-detail for distant lights',
                'Merge nearby light sources',
                'Disable lights outside view'
            ],
            'too_many_shadow_zones': [
                'Merge adjacent shadow zones',
                'Reduce shadow resolution',
                'Implement zone pooling',
                'Use simplified shadow shapes'
            ]
        };

        return recommendations[issueType] || [];
    }

    // Utility methods
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
    }

    getAverageMetric(metric, windowSize = this.samplingConfig.averageWindow) {
        if (!this.metrics[metric] || this.metrics[metric].length === 0) {
            return 0;
        }

        const samples = this.metrics[metric].slice(-windowSize);
        const sum = samples.reduce((acc, sample) => acc + sample.value, 0);
        return sum / samples.length;
    }

    // Public API methods
    getPerformanceReport() {
        return {
            fps: {
                current: this.fpsCalculator.getFPS(),
                average: this.getAverageMetric('fps'),
                min: Math.min(...this.metrics.fps.slice(-30).map(s => s.value)),
                max: Math.max(...this.metrics.fps.slice(-30).map(s => s.value))
            },
            frameTime: {
                current: this.getAverageMetric('frameTime', 1),
                average: this.getAverageMetric('frameTime'),
                max: Math.max(...this.metrics.frameTime.slice(-30).map(s => s.value))
            },
            memory: {
                current: this.getMemoryUsage(),
                average: this.getAverageMetric('memoryUsage'),
                trend: this.getMemoryTrend()
            },
            bottlenecks: this.bottlenecks.slice(0, 5), // Top 5 bottlenecks
            recommendations: this.getActiveRecommendations()
        };
    }

    getMemoryTrend() {
        if (this.metrics.memoryUsage.length < 10) return 'stable';

        const recent = this.metrics.memoryUsage.slice(-10);
        const older = this.metrics.memoryUsage.slice(-20, -10);

        const recentAvg = recent.reduce((sum, s) => sum + s.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.value, 0) / older.length;

        const change = (recentAvg - olderAvg) / olderAvg;

        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }

    getActiveRecommendations() {
        const recommendations = [];
        const fps = this.getAverageMetric('fps');
        const frameTime = this.getAverageMetric('frameTime');

        if (fps < this.thresholds.targetFPS * 0.9) {
            recommendations.push(...this.getRecommendations('low_fps'));
        }

        if (frameTime > this.thresholds.maxFrameTime * 1.1) {
            recommendations.push(...this.getRecommendations('high_frame_time'));
        }

        return [...new Set(recommendations)]; // Remove duplicates
    }

    // Configuration methods
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setThreshold(metric, value) {
        if (this.thresholds.hasOwnProperty(metric)) {
            this.thresholds[metric] = value;
        }
    }

    setSamplingInterval(interval) {
        this.samplingConfig.samplingInterval = Math.max(50, interval);
    }

    // Debug methods
    logPerformanceReport() {
        const report = this.getPerformanceReport();
        console.group('Performance Report');

        console.log('FPS:', report.fps);
        console.log('Frame Time:', report.frameTime);
        console.log('Memory:', report.memory);

        if (report.bottlenecks.length > 0) {
            console.group('Top Bottlenecks');
            report.bottlenecks.forEach((bottleneck, index) => {
                console.log(`${index + 1}. ${bottleneck.category}.${bottleneck.operation}: ${bottleneck.averageTime.toFixed(2)}ms avg`);
            });
            console.groupEnd();
        }

        if (report.recommendations.length > 0) {
            console.group('Recommendations');
            report.recommendations.forEach(rec => console.log('•', rec));
            console.groupEnd();
        }

        console.groupEnd();
    }

    exportData() {
        return {
            metrics: this.metrics,
            profilingData: this.profilingData,
            bottlenecks: this.bottlenecks,
            thresholds: this.thresholds,
            timestamp: Date.now()
        };
    }

    // Cleanup
    destroy() {
        this.metrics = {};
        this.profilingData = {};
        this.bottlenecks = [];
        this.fpsCalculator = null;
        this.memoryMonitor = null;
    }
}

// Helper classes
class FPSCalculator {
    constructor() {
        this.fps = 60;
        this.frames = 0;
        this.lastTime = performance.now();
    }

    update(delta) {
        this.frames++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            this.frames = 0;
            this.lastTime = currentTime;
        }
    }

    getFPS() {
        return this.fps;
    }
}

class MemoryMonitor {
    constructor() {
        this.baseline = this.getCurrentMemory();
        this.peak = this.baseline;
    }

    getCurrentMemory() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    getMemoryStats() {
        const current = this.getCurrentMemory();
        this.peak = Math.max(this.peak, current);

        return {
            current: current / 1024 / 1024, // MB
            baseline: this.baseline / 1024 / 1024, // MB
            peak: this.peak / 1024 / 1024, // MB
            growth: (current - this.baseline) / 1024 / 1024 // MB
        };
    }
}