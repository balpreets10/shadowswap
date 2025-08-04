// InputManager.js
class InputManager {
    constructor() {
        this.keys = {};
        this.cursors = null;
        this.wasd = {};
        this.extraKeys = {};
    }

    init(scene) {
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys('W,S,A,D,SPACE');
        this.extraKeys = scene.input.keyboard.addKeys('F');

        // Track key states
        this.keys = {
            left: () => this.cursors.left.isDown || this.wasd.A.isDown,
            right: () => this.cursors.right.isDown || this.wasd.D.isDown,
            up: () => this.cursors.up.isDown || this.wasd.W.isDown,
            down: () => this.cursors.down.isDown || this.wasd.S.isDown,
            jump: () => Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.SPACE),
            switch: () => Phaser.Input.Keyboard.JustDown(this.extraKeys.F)
        };
    }

    isPressed(action) {
        return this.keys[action] ? this.keys[action]() : false;
    }

    isHeld(action) {
        const heldKeys = {
            left: () => this.cursors.left.isDown || this.wasd.A.isDown,
            right: () => this.cursors.right.isDown || this.wasd.D.isDown,
            up: () => this.cursors.up.isDown || this.wasd.W.isDown,
            down: () => this.cursors.down.isDown || this.wasd.S.isDown
        };
        return heldKeys[action] ? heldKeys[action]() : false;
    }
}