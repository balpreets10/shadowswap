// Switch.js
// A lightweight interactive trigger placed in the level from LevelData's
// `interactiveElements`. It detects when a qualifying character overlaps it and
// fires onActivate / onDeactivate callbacks. The concrete effect (reveal a
// platform, open a gate, toggle a lit path) is wired up by LevelManager.
//
// Two modes:
//   'toggle' - activates once on first qualifying overlap and stays active.
//   'hold'   - active only while a qualifying body is overlapping; deactivates
//              the moment no qualifying body remains on it.
//
// `activatedBy` gates which character types can trigger it (e.g. a
// shadowOnlySwitch lists only ["shadow"], so the Main walking over it is ignored).
//
// No texture assets exist for switches, so it is drawn with primitive graphics.
class Switch {
    constructor(scene, def) {
        this.scene = scene;
        this.id = def.id;
        this.type = def.type; // 'lightSwitch' | 'shadowOnlySwitch'
        this.activatedBy = def.activatedBy || ['main', 'shadow'];
        this.mode = def.mode || 'toggle';
        this.action = def.action || null;

        // Center coordinates (switches use center origin).
        this.x = def.x;
        this.y = def.y;

        // Footprint of the switch's interaction zone.
        this.width = def.width || 56;
        this.height = def.height || 18;

        this.isActive = false;

        // Effect callbacks, assigned by LevelManager.
        this.onActivate = null;
        this.onDeactivate = null;

        this.createVisual();
    }

    createVisual() {
        // Color hints at who can use the switch: cyan/white for either,
        // purple for shadow-only.
        const shadowOnly = this.type === 'shadowOnlySwitch';
        this.baseColor = shadowOnly ? 0x9C27B0 : 0xAAFFFF;
        this.activeColor = shadowOnly ? 0xE1BEE7 : 0xEAFCFF;

        const left = this.x - this.width / 2;
        const top = this.y - this.height / 2;

        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(5);
        this.drawState(false);

        // A subtle pedestal/base under the switch plate.
        this.baseGraphics = this.scene.add.graphics();
        this.baseGraphics.setDepth(4);
        this.baseGraphics.fillStyle(0x1b2840, 1);
        this.baseGraphics.fillRect(left - 2, top - 2, this.width + 4, this.height + 4);
        this.baseGraphics.lineStyle(1.5, this.baseColor, 0.7);
        this.baseGraphics.strokeRect(left - 2, top - 2, this.width + 4, this.height + 4);
        this.baseGraphics.setDepth(4);
        // Ensure plate renders above the base.
        this.graphics.setDepth(5);
    }

    drawState(active) {
        const left = this.x - this.width / 2;
        const top = this.y - this.height / 2;
        const color = active ? this.activeColor : this.baseColor;
        const alpha = active ? 0.95 : 0.55;

        this.graphics.clear();
        this.graphics.fillStyle(color, alpha);
        this.graphics.fillRect(left, top, this.width, this.height);
        this.graphics.lineStyle(2, color, 1);
        this.graphics.strokeRect(left, top, this.width, this.height);

        // A little upright nub so the switch reads as a lever.
        this.graphics.fillStyle(color, active ? 1 : 0.8);
        this.graphics.fillRect(this.x - 3, top - 10, 6, 12);
    }

    // True if the given character of `type` is allowed to and currently does
    // overlap this switch's interaction zone.
    overlaps(character, type) {
        if (!this.activatedBy.includes(type)) {
            return false;
        }

        const body = character.sprite && character.sprite.body;
        if (!body) return false;

        const halfW = this.width / 2;
        const halfH = this.height / 2;

        // AABB overlap between the character body and the switch zone.
        return body.right >= this.x - halfW &&
            body.left <= this.x + halfW &&
            body.bottom >= this.y - halfH &&
            body.top <= this.y + halfH;
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        this.drawState(true);
        if (this.onActivate) this.onActivate();
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        this.drawState(false);
        if (this.onDeactivate) this.onDeactivate();
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
        if (this.baseGraphics) this.baseGraphics.destroy();
    }
}
