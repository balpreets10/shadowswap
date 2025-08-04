// AssetManager.js
class AssetManager {
    constructor() {
        this.loadQueue = [];
    }

    preload(scene) {
        // Create simple colored rectangles for sprint 1
        this.createPlayerAssets(scene);
        this.createPlatformAssets(scene);
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
}