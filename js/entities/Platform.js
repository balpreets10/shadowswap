// Platform.js
class Platform {
    constructor(scene, x, y, width, height, type = 'ground') {
        this.scene = scene;
        this.type = type;
        this.width = width;
        this.height = height;

        this.createPlatform(x, y);
    }

    createPlatform(x, y) {
        const textureKey = this.type === 'ground' ? 'platform-ground' : 'platform-float';

        // Create a tiled platform
        this.platforms = this.scene.physics.add.staticGroup();

        const tilesX = Math.ceil(this.width / 64);
        const tilesY = Math.ceil(this.height / (this.type === 'ground' ? 32 : 16));

        for (let i = 0; i < tilesX; i++) {
            for (let j = 0; j < tilesY; j++) {
                const tileX = x + (i * 64);
                const tileY = y + (j * (this.type === 'ground' ? 32 : 16));
                const tile = this.platforms.create(tileX, tileY, textureKey);
                tile.setOrigin(0, 0);
            }
        }
    }

    getPhysicsGroup() {
        return this.platforms;
    }
}
