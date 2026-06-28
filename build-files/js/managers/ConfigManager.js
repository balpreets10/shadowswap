// ConfigManager.js
// Single responsibility: load, cache, and serve all JSON configuration files.
// Exposed globally as `window.GameConfig` (the rest of the game reads config via
// `window.GameConfig.getConfig(name)`), and instantiated at the bottom of this file
// so it exists before GameInitializer.initialize() runs.
class ConfigManager {
    constructor() {
        // Logical config name -> file path. All data-driven tunables live here so
        // they can be changed without touching any script (per project rules).
        this.configPaths = {
            PlayerConfig: 'data/PlayerConfig.json',
            ShadowConfig: 'data/ShadowConfig.json',
            PlatformConfig: 'data/PlatformConfig.json',
            GameConfig: 'data/GameConfig.json',
            CollisionConfig: 'data/CollisionConfig.json',
            LightSourceConfig: 'js/config/LightSourceConfig.json',
            LevelData: 'data/LevelData.json'
        };

        // Cache of loaded configs, keyed by logical name.
        this.configs = {};
    }

    // Fetch every registered config in parallel and cache it. Individual failures
    // are tolerated (cached as {}) so a single bad file does not block boot;
    // GameInitializer.validateConfigurations() already warns on empty configs.
    async loadAllConfigs() {
        const names = Object.keys(this.configPaths);

        const results = await Promise.all(
            names.map(async (name) => {
                try {
                    const config = await this._fetchJson(this.configPaths[name]);
                    return { name, config };
                } catch (error) {
                    console.error(`ConfigManager: failed to load ${name} (${this.configPaths[name]}):`, error);
                    return { name, config: {} };
                }
            })
        );

        results.forEach(({ name, config }) => {
            this.configs[name] = config;
        });

        return this.configs;
    }

    // Load (or reload) a single config by file path. Used by the debug console
    // (window.shadowSwapDebug.reloadConfig). Caches under the matching logical
    // name if the path is known, otherwise under the file's basename.
    async loadConfig(path) {
        const config = await this._fetchJson(path);
        const name = this._nameForPath(path) || this._basename(path);
        this.configs[name] = config;
        return config;
    }

    // Return a cached config by logical name. Returns an empty object (never
    // undefined) so consumer constructors that immediately read sub-keys fail
    // loudly on the missing key rather than on `undefined.getConfig`.
    getConfig(name) {
        return this.configs[name] || {};
    }

    async _fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return response.json();
    }

    _nameForPath(path) {
        return Object.keys(this.configPaths).find(
            (name) => this.configPaths[name] === path
        ) || null;
    }

    _basename(path) {
        return path.split('/').pop().replace(/\.json$/, '');
    }
}

// Instantiate the global config manager. This must exist before the inline
// GameInitializer in index.html calls window.GameConfig.loadAllConfigs().
window.GameConfig = new ConfigManager();
