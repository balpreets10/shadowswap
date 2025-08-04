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
            .generateTexture('platform-ground', 64, 32);

        // Floating platform
        scene.add.graphics()
            .fillStyle(0x5D4E75)
            .fillRect(0, 0, 64, 16)
            .generateTexture('platform-float', 64, 16);
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