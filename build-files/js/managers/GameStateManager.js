// GameStateManager.js
class GameStateManager {
    constructor() {
        this.state = {
            currentLevel: 1,
            playerHealth: 100,
            activeCharacter: 'main', // 'main' or 'shadow'
            gameState: 'playing' // 'playing', 'paused', 'gameOver'
        };
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    getState() {
        return { ...this.state };
    }
}