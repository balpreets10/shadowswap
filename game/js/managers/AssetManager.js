// AssetManager.js
class AssetManager {
    constructor() {
        this.loadQueue = [];
    }

    preload(scene) {
        // Create simple colored rectangles for sprint 2
        this.createPlayerAssets(scene);
        this.createShadowAssets(scene);
        this.createPlatformAssets(scene);
        this.createParticleAssets(scene);
        this.createUIAssets(scene);
    }

    createPlayerAssets(scene) {
        // Create a simple player sprite (blue rectangle)
        scene.add.graphics()
            .fillStyle(0x4CAF50)
            .fillRect(0, 0, 32, 48)
            .generateTexture('player-idle', 32, 48);

        // Create running animation frames
        for (let i = 0; i < 4; i++) {
            scene.add.graphics()
                .fillStyle(0x4CAF50)
                .fillRect(0, 0, 32, 48)
                .fillStyle(0x2E7D32)
                .fillRect(i * 2, 40, 8, 8)
                .generateTexture(`player-run-${i}`, 32, 48);
        }

        // Jumping frame
        scene.add.graphics()
            .fillStyle(0x66BB6A)
            .fillRect(0, 0, 32, 48)
            .generateTexture('player-jump', 32, 48);
    }

    createShadowAssets(scene) {
        // Create shadow sprite (dark purple rectangle)
        scene.add.graphics()
            .fillStyle(0x4A148C)
            .fillRect(0, 0, 32, 48)
            .generateTexture('shadow-idle', 32, 48);

        // Create shadow running animation frames
        for (let i = 0; i < 4; i++) {
            scene.add.graphics()
                .fillStyle(0x4A148C)
                .fillRect(0, 0, 32, 48)
                .fillStyle(0x6A1B9A)
                .fillRect(i * 2, 40, 8, 8)
                .generateTexture(`shadow-run-${i}`, 32, 48);
        }

        // Shadow jumping frame
        scene.add.graphics()
            .fillStyle(0x7B1FA2)
            .fillRect(0, 0, 32, 48)
            .generateTexture('shadow-jump', 32, 48);
    }

    createPlatformAssets(scene) {
        // Ground platform
        scene.add.graphics()
            .fillStyle(0x8D6E63)
            .fillRect(0, 0, 64, 32)
            .lineStyle(2, 0x5D4E75, 1)
            .strokeRect(0, 0, 64, 32)
            .generateTexture('platform-ground', 64, 32);

        // Floating platform
        scene.add.graphics()
            .fillStyle(0x5D4E75)
            .fillRect(0, 0, 64, 16)
            .lineStyle(1, 0x3F2A5C, 1)
            .strokeRect(0, 0, 64, 16)
            .generateTexture('platform-float', 64, 16);

        // One-way platform (semi-transparent with dashed border)
        const oneWayGraphics = scene.add.graphics();
        oneWayGraphics.fillStyle(0x4CAF50, 0.6);
        oneWayGraphics.fillRect(0, 0, 64, 8);

        // Dashed line effect for one-way visual
        for (let i = 0; i < 64; i += 8) {
            oneWayGraphics.lineStyle(2, 0x2E7D32, 0.8);
            oneWayGraphics.lineBetween(i, 0, i + 4, 0);
            oneWayGraphics.lineBetween(i, 8, i + 4, 8);
        }
        oneWayGraphics.generateTexture('platform-oneway', 64, 8);

        // Shadow-only platform (dark purple with mystical effect)
        const shadowGraphics = scene.add.graphics();
        shadowGraphics.fillStyle(0x4A148C, 0.8);
        shadowGraphics.fillRect(0, 0, 64, 16);
        shadowGraphics.lineStyle(2, 0x9C27B0, 0.6);
        shadowGraphics.strokeRect(0, 0, 64, 16);

        // Add mystical dots pattern
        for (let i = 8; i < 64; i += 16) {
            for (let j = 4; j < 16; j += 8) {
                shadowGraphics.fillStyle(0x9C27B0, 0.4);
                shadowGraphics.fillCircle(i, j, 2);
            }
        }
        shadowGraphics.generateTexture('platform-shadow', 64, 16);
    }

    createParticleAssets(scene) {
        // Switch particle
        scene.add.graphics()
            .fillStyle(0x9C27B0)
            .fillCircle(4, 4, 4)
            .generateTexture('switch-particle', 8, 8);

        // Dust particle
        scene.add.graphics()
            .fillStyle(0x8D6E63)
            .fillCircle(3, 3, 3)
            .generateTexture('dust-particle', 6, 6);
    }

    createUIAssets(scene) {
        // Main character active indicator
        scene.add.graphics()
            .fillStyle(0x4CAF50)
            .fillCircle(8, 8, 8)
            .generateTexture('ui-main-active', 16, 16);

        // Shadow character active indicator
        scene.add.graphics()
            .fillStyle(0x9C27B0)
            .fillCircle(8, 8, 8)
            .generateTexture('ui-shadow-active', 16, 16);

        // Inactive indicator
        scene.add.graphics()
            .fillStyle(0x666666)
            .fillCircle(8, 8, 8)
            .generateTexture('ui-inactive', 16, 16);
    }
}