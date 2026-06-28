// LevelManager.js
// Builds Level 1 from LevelData.json and wires up its interactive mechanics.
//
// Responsibilities:
//   - Instantiate platforms (deferring any flagged `hidden` until revealed).
//   - Instantiate light sources.
//   - Instantiate switches and bind each switch's `action` to a concrete effect:
//       revealPlatform - lazily build a hidden platform (Beat B bridge).
//       openGate       - destroy a blocking platform (Beat C gate).
//       toggleLitPath  - reveal targets while held, hide them when released (Beat D).
//   - Poll switch overlaps each frame.
//   - Detect the Main reaching the exit portal (win condition).
//
// The scene owns physics/colliders, so this manager calls back into the scene
// via `registerPlatformCollisions(platform)` whenever it builds a new platform
// at runtime, keeping a single collision-setup code path.
class LevelManager {
    constructor(scene, lightSourceManager) {
        this.scene = scene;
        this.lightSourceManager = lightSourceManager;
        this.levelData = window.GameConfig.getConfig('LevelData');

        // Live Platform instances keyed by id (only those currently in the world).
        this.platforms = new Map();
        // Definitions for platforms not yet built (hidden / lit path).
        this.deferredDefs = new Map();

        this.switches = [];
        this.portal = null;
        this.portalGraphics = null;
        this.won = false;
    }

    // Build the static portions of the level. Returns the list of platform
    // instances that exist at start (so the scene can register obstacles/colliders).
    build() {
        const data = this.levelData;

        this.buildPlatforms(data.platforms || []);
        this.buildLights(data.lightSources || []);
        this.buildSwitches(data.interactiveElements || []);
        this.buildPortal(data.portal);

        return this.getActivePlatforms();
    }

    buildPlatforms(defs) {
        defs.forEach(def => {
            if (def.hidden) {
                // Store for later; do not instantiate yet.
                this.deferredDefs.set(def.id, def);
            } else {
                this.instantiatePlatform(def);
            }
        });
    }

    // Create a Platform from a def, register it for collisions + shadow casting,
    // and track it. Safe to call at runtime for reveals.
    instantiatePlatform(def) {
        if (this.platforms.has(def.id)) {
            return this.platforms.get(def.id);
        }

        const platform = new Platform(this.scene, def.x, def.y, def.width, def.height, def.type);
        platform.levelId = def.id;
        this.platforms.set(def.id, platform);

        // Register colliders (scene owns physics groups). The scene also adds it
        // to its master `this.platforms` array so update loops see it.
        if (this.scene.registerPlatformCollisions) {
            this.scene.registerPlatformCollisions(platform);
        }

        // Register as a shadow-casting obstacle.
        this.lightSourceManager.registerObstacle(platform);

        return platform;
    }

    // Reveal a previously hidden platform (idempotent).
    revealPlatform(id) {
        if (this.platforms.has(id)) return;
        const def = this.deferredDefs.get(id);
        if (!def) {
            console.warn(`LevelManager.revealPlatform: no deferred def for "${id}"`);
            return;
        }
        this.instantiatePlatform(def);
    }

    // Hide / remove a platform from the world. Keeps the def so it can be
    // re-revealed (used by hold-mode lit paths).
    hidePlatform(id) {
        const platform = this.platforms.get(id);
        if (!platform) return;

        this.lightSourceManager.unregisterObstacle(platform);
        if (this.scene.unregisterPlatform) {
            this.scene.unregisterPlatform(platform);
        }
        platform.destroy();
        this.platforms.delete(id);
    }

    buildLights(defs) {
        defs.forEach(def => {
            const light = this.lightSourceManager.addLightSource(def.id, def.x, def.y, def.type);
            // Apply data-driven overrides where the light supports them.
            if (light) {
                if (typeof def.radius === 'number' && light.setRadius) light.setRadius(def.radius);
                if (typeof def.intensity === 'number' && light.setIntensity) light.setIntensity(def.intensity);
                if (def.initialState === 'inactive' && light.deactivate) light.deactivate();
            }
        });
    }

    buildSwitches(defs) {
        defs.forEach(def => {
            const sw = new Switch(this.scene, def);
            this.bindSwitchAction(sw);
            this.switches.push(sw);
        });
    }

    // Map a switch's declarative `action` onto concrete reveal/gate/path effects.
    bindSwitchAction(sw) {
        const action = sw.action;
        if (!action) return;

        const targets = action.targets || [];

        switch (action.kind) {
            case 'revealPlatform':
                sw.onActivate = () => targets.forEach(id => this.revealPlatform(id));
                break;

            case 'openGate':
                sw.onActivate = () => targets.forEach(id => this.hidePlatform(id));
                break;

            case 'toggleLitPath':
                // Hold-mode: present while standing on the switch, gone otherwise.
                sw.onActivate = () => targets.forEach(id => this.revealPlatform(id));
                sw.onDeactivate = () => targets.forEach(id => this.hidePlatform(id));
                break;

            default:
                console.warn(`LevelManager: unknown switch action "${action.kind}"`);
        }
    }

    buildPortal(def) {
        if (!def) return;
        this.portal = def;

        // Draw the exit portal (no texture asset exists for it).
        const g = this.scene.add.graphics();
        g.setDepth(3);
        g.fillStyle(0xAAFFFF, 0.18);
        g.fillEllipse(def.x, def.y, def.radius * 1.4, def.radius * 2.4);
        g.lineStyle(3, 0xAAFFFF, 0.9);
        g.strokeEllipse(def.x, def.y, def.radius * 1.1, def.radius * 2.1);
        g.lineStyle(1.5, 0xD68FE0, 0.7);
        g.strokeEllipse(def.x, def.y, def.radius * 0.6, def.radius * 1.4);
        this.portalGraphics = g;

        const label = this.scene.add.text(def.x, def.y - def.radius * 2.4 - 14, 'EXIT', {
            fontSize: '14px',
            color: '#AAFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);
        this.portalLabel = label;
    }

    // Platform instances currently present in the world.
    getActivePlatforms() {
        return Array.from(this.platforms.values());
    }

    // Poll switches against the currently active character each frame.
    update(activeCharacter, activeType) {
        if (this.won) return;

        for (const sw of this.switches) {
            const overlapping = sw.overlaps(activeCharacter, activeType);

            if (sw.mode === 'hold') {
                if (overlapping && !sw.isActive) {
                    sw.activate();
                } else if (!overlapping && sw.isActive) {
                    sw.deactivate();
                }
            } else { // toggle: latch on first qualifying overlap
                if (overlapping && !sw.isActive) {
                    sw.activate();
                }
            }
        }
    }

    // True when the Main character has reached the exit portal.
    checkWin(mainCharacter) {
        if (this.won || !this.portal) return false;

        const pos = mainCharacter.getPosition();
        const dx = pos.x - this.portal.x;
        const dy = pos.y - this.portal.y;
        const r = this.portal.radius + 20;

        if (dx * dx + dy * dy <= r * r) {
            this.won = true;
            return true;
        }
        return false;
    }
}
