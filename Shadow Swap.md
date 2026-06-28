# Shadow Swap

A platformer where you switch between a character and their shadow to solve puzzles.

## Core Mechanics:
- Dual Characters: You control a normal character (e.g., a knight, robot, or adventurer) and their shadow.
- The "real" character moves normally on solid platforms.
- The "shadow" can only move on dark/shadowy areas (inverted platforms).

Switching Mechanic:
- Press a key (e.g., Space) to switch control between the character and their shadow.
- When you're controlling main, the shadow follows you, no physics enabled, no collisions
- When you are controlling shadow, main player becomes idle, shadow has collisions enabled
- Some obstacles require coordinating both (e.g., stepping on switches, blocking enemies).
Environment Interaction:
- Light sources (torches, lamps) can create new shadows or remove them.
- Shadows dynamically change based on light positions (simple line-based shadows).
Goal: Reach the end of each level by using both characters wisely.

Example Level Design:
- A gap exists where the real character can’t pass, but their shadow can walk on a shadowy wall.
- A moving light source makes shadows shift, requiring timing to progress.

# Shadow Swap - Revised 2-Week Technical Plan
## Current Status Assessment
✅ Completed (Sprint 1-3):
- Basic character movement and physics
- Character switching mechanism
- Platform collision system (solid, float, oneWay, shadowOnly)
- Asset management and basic visuals

**Sprint 1: Foundation & Main Character (Days 1-2)**
**Goal**: Establish core Phaser setup and main character movement
**Deliverables:**
- ✅ Basic Phaser 3 project structure
- ✅ Main character sprite with animations (idle, walk, jump)
- ✅ Keyboard input handling (WASD/Arrow keys)
- ✅ Basic gravity and jump mechanics
- ✅ Simple test level with colored rectangles as platforms
**Technical Tasks:**
- Initialize Phaser scene with physics system
- Create Player class with sprite management
- Implement movement state machine (idle, moving, jumping, falling)
- Add basic collision detection with static platforms
- Set up asset loading system
**Acceptance Criteria:**
- Character moves smoothly left/right
- Character jumps and falls realistically
- Character stops on platforms
- Basic level layout visible

**Sprint 2: Shadow Character & Switching (Days 3-4)**
**Goal**: Add shadow character and core switching mechanic
**Deliverables:**
- ✅ Shadow character sprite (darker/translucent version)
- ✅ Switch control system (Space key toggle)
- ✅ Visual indicators for active/inactive characters
- ✅ Shadow follows main character position initially
**Technical Tasks:**
- Create Shadow class inheriting from Player
- Implement character switching logic
- Add visual feedback (outline, transparency, particle effects)
- Create CharacterManager to handle dual character state
- Add UI indicators for current active character
**Acceptance Criteria:**
- Press Space to switch between characters
- Only active character responds to input
- Clear visual distinction between active/inactive
- Shadow mirrors main character's position when not controlled
- Shadow doesn’t collide with objects when not in control
- Shadow maintains y position similar to player when not in control

**Sprint 3: Platform Collision System (Days 5-6)**
**Goal**: Robust collision detection and platform interaction
**Deliverables:**
- ✅ Solid platforms for main character
- ✅ Improved physics with proper collision bounds
- ✅ Multiple platform types (ground, floating platforms)
- ✅ Basic level geometry expanded
**Technical Tasks:**
- Refine collision detection with proper hitboxes
- Create Platform class with different collision properties
- Implement one-way platforms (can jump through from below)
- Add collision layers for different character types
- Optimize collision performance
**Acceptance Criteria:**
- Character stands solidly on all platforms
- Can jump through one-way platforms from below
- No glitching through platform edges
- Smooth character movement on slopes/edges

## Identified Gaps in Original Plan
- Light/Shadow System: Oversimplified - needs dedicated architecture
- Puzzle Framework: Missing systematic approach to puzzle creation
- Level Management: No level data structure or progression system
- Camera System: Dual character camera management missing
- Animation System: Basic animations only, missing transition effects
- Audio System: Completely missing from early sprints
- Performance: No optimization strategy for complex shadow calculations
- Tutorial/UX: No onboarding or player guidance system
## Sprint 4: Light Source Foundation & Shadow Casting (Days 7-8)
### Goal: Implement core light/shadow calculation system
### Technical Architecture:
- LightSourceManager: Handles multiple light sources and shadow calculations
- ShadowCaster: Ray-casting algorithm for shadow zone generation
- LightSource: Individual light objects with properties
- ShadowZone: Dynamic areas where shadow character can move
### Deliverables:
- Static light sources (torches, lamps) with configurable radius/intensity
- Basic ray-casting shadow algorithm (simplified geometric approach)
- Shadow zones generated in real-time from light positions
- Visual debug system for light rays and shadow boundaries
- Performance optimization for shadow calculations
### Technical Tasks:
- Create LightSourceManager.js with light registration and update loop
- Implement ShadowCaster.js with geometric shadow calculation
- Add LightSource.js class with radius, intensity, position properties
- Create ShadowZoneDetector.js for character-shadow zone collision
- Add shadow rendering with graphics API
- Implement spatial partitioning for light optimization
### Acceptance Criteria:
- Static lights create visible shadow zones
- Shadow character can only move in generated shadow areas
- Debug visualization shows light rays and shadow boundaries
- Maintains 60fps with up to 5 light sources
- Shadow zones update when lights are added/removed
## Sprint 5: Dynamic Lights & Moving Shadows (Days 9-10)
### Goal: Add moving light sources and advanced shadow mechanics
### Technical Architecture:
- MovingLight: Animated light sources with movement patterns
- ShadowTrail: Visual feedback for shadow movement
- LightAnimator: Handles light movement patterns and timing
- ShadowPathfinding: AI for shadow navigation in complex shadow areas
### Deliverables:
- Moving light sources (swinging torches, rotating beacons)
- Dynamic shadow zone updates as lights move
- Shadow character pathfinding in complex shadow networks
- Timing-based puzzles requiring shadow movement coordination
- Visual effects for shadow transitions
### Technical Tasks:
- Extend LightSource.js with movement patterns and animation
- Create LightAnimator.js for complex light behaviors
- Add shadow zone caching and incremental updates
- Implement ShadowPathfinding.js for navigation assistance
- Create particle effects for shadow transitions
- Add timing mechanics for light-based puzzles
### Acceptance Criteria:
- Lights move smoothly with configurable patterns
- Shadow zones update in real-time (max 16ms per frame)
- Shadow character navigates complex shadow networks
- Complete first timing-based shadow puzzle
- Smooth visual feedback for shadow state changes
## Sprint 6: Interactive Elements & Puzzle Framework (Days 11-12)
### Goal: Create comprehensive puzzle system with interactive elements
### Technical Architecture:
- PuzzleManager: Central system for puzzle state and logic
- InteractiveElement: Base class for switches, doors, pressure plates
- TriggerSystem: Event-driven system for puzzle interactions
- PuzzleValidator: Checks puzzle completion conditions
### Deliverables:
- Pressure switches activated by main/shadow characters
- Doors and barriers controlled by switch combinations
- Character-specific interactive elements (shadow-only switches)
- Multi-step puzzles requiring both characters
- Puzzle state persistence and reset functionality
### Technical Tasks:
- Create PuzzleManager.js with puzzle registration and state tracking
- Implement InteractiveElement.js base class with trigger system
- Add Switch.js, Door.js, PressurePlate.js classes
- Create TriggerSystem.js for event-driven puzzle logic
- Implement PuzzleValidator.js for completion detection
- Add visual feedback system for interactive states
### Acceptance Criteria:
- Switches respond to correct character types
- Doors open/close based on complex switch combinations
- Multi-character coordination puzzles work reliably
- Puzzle states save and restore correctly
- Clear visual/audio feedback for all interactions
## Sprint 7: Level Management & Progression (Days 13-14)
### Goal: Complete level system with progression and data management
### Technical Architecture:
- LevelManager: Level loading, transition, and progression
- LevelData: JSON-based level configuration system
- SceneTransition: Smooth transitions between levels/scenes
- ProgressTracker: Save system for level completion and unlocks
### Deliverables:
- JSON-based level configuration system
- Level loading and unloading with asset management
- Scene transitions with loading screens
- Progress saving and level unlocking
- Complete first level showcasing all mechanics
### Technical Tasks:
- Create LevelManager.js with level loading and transition system
- Design LevelData.json schema for level configuration
- Implement SceneTransition.js with loading screens and effects
- Add ProgressTracker.js with localStorage-based save system
- Create comprehensive first level using all implemented mechanics
- Add level completion detection and progression logic
### Acceptance Criteria:
- Levels load from JSON configuration files
- Smooth transitions between levels with loading feedback
- Progress saves reliably with level unlock system
- Complete playable level demonstrates all core mechanics
- Performance remains stable during level transitions
## Sprint 8: Audio System & Immersive Feedback (Days 15-16)
### Goal: Complete audio implementation and enhanced game feel
### Technical Architecture:
- AudioManager: Centralized audio system with mixing and effects
- SoundEffectPlayer: Context-aware sound effect triggering
- MusicManager: Background music with dynamic mixing
- AudioConfig: Configuration for all audio settings and mixing
### Deliverables:
- Background music with dynamic volume mixing
- Sound effects for all character actions and interactions
- Audio feedback for puzzle completion and character switching
- Ambient sound design for atmosphere
- Audio settings and volume controls
### Technical Tasks:
- Create AudioManager.js with Web Audio API integration
- Implement SoundEffectPlayer.js with spatial audio support
- Add MusicManager.js with cross-fading and dynamic mixing
- Create AudioConfig.json with all sound effect mappings
- Implement audio loading and caching system
- Add volume controls and audio settings UI
### Acceptance Criteria:
- Background music enhances gameplay atmosphere
- Sound effects provide clear feedback for all actions
- Audio settings allow volume control and muting
- Spatial audio works for character positioning
- Audio performance doesn't impact gameplay framerate
## Sprint 9: UI/UX Polish & Tutorial System (Days 17-18)
### Goal: Complete user interface and onboarding experience
### Technical Architecture:
- UIManager: Centralized UI state and component management
- TutorialSystem: Progressive gameplay introduction and hints
- MenuSystem: Main menu, pause, settings, and game over screens
- HUDManager: In-game UI elements and status displays
### Deliverables:
- Main menu with level selection and settings
- In-game pause menu and settings
- Tutorial system with progressive mechanic introduction
- HUD elements (health, active character, objectives)
- Accessibility features and control customization
### Technical Tasks:
- Create UIManager.js with component state management
- Implement TutorialSystem.js with step-by-step guidance
- Add MenuSystem.js with navigation and state management
- Create HUDManager.js for in-game UI elements
- Design responsive CSS for all UI components
- Add keyboard navigation and accessibility features
### Acceptance Criteria:
- Intuitive menu navigation with keyboard and mouse
- Tutorial introduces mechanics progressively without overwhelming
- HUD provides essential information without cluttering screen
- All UI responsive to different screen sizes
- Accessibility features work for keyboard-only navigation
## Sprint 10: Performance Optimization & Polish (Days 19-20)
### Goal: Final optimization, bug fixes, and gameplay polish
### Technical Architecture:
- PerformanceProfiler: Runtime performance monitoring and optimization
- AssetOptimizer: Efficient loading and memory management
- RenderOptimizer: Graphics and rendering performance improvements
- GameplayTuner: Balance and feel adjustments
### Deliverables:
- Performance profiling and optimization
- Visual effects and animation polish
- Gameplay balance and difficulty tuning
- Bug fixes and edge case handling
- Final build preparation and testing
### Technical Tasks:
- Implement PerformanceProfiler.js with FPS monitoring and bottleneck detection
- Optimize shadow calculation algorithms for better performance
- Add object pooling for frequently created/destroyed objects
- Implement AssetOptimizer.js for efficient memory usage
- Polish visual effects, animations, and game feel
- Comprehensive testing and bug fixing
### Acceptance Criteria:
- Maintains consistent 60fps on target hardware
- Memory usage stays within reasonable bounds
- All edge cases and bugs addressed
- Gameplay feels polished and responsive
- Final build ready for deployment
## Configuration Files Required
### New Data Files to Create:
- LightSourceConfig.json - Light properties, shadow casting parameters
- PuzzleConfig.json - Puzzle definitions, trigger conditions, rewards
- LevelData.json - Level layouts, entity placement, progression
- AudioConfig.json - Sound effect mappings, volume settings, music tracks
- UIConfig.json - UI layout, colors, fonts, accessibility settings
- PerformanceConfig.json - Optimization thresholds, quality settings
### Enhanced Existing Files:
- CollisionConfig.js - Add light/shadow collision categories
- GameStateManager.js - Extend for puzzle and level state
- InputManager.js - Add tutorial and menu input handling

## Risk Mitigation Strategies
### Technical Risks:
- Shadow Calculation Performance: Implement LOD system and spatial optimization
- Complex Puzzle States: Use event-driven architecture with clear state machines
- Memory Leaks: Implement proper cleanup and object pooling
- Cross-platform Compatibility: Test on multiple devices throughout development
### Scope Management:
- Each sprint produces a playable build
- Features can be simplified if development falls behind
- Core mechanics prioritized over visual polish
- Fallback implementations ready for complex features
### Quality Assurance:
- Daily build testing with all previous functionality
- Performance benchmarks for each sprint
- User testing for tutorial and UI systems
- Code reviews for architecture decisions
## Daily Development Process
### Morning (2 hours):
- Architecture review and planning
- Code review of previous day's work
- Risk assessment and problem-solving
### Afternoon (6 hours):
- Feature implementation
- Testing and debugging
- Integration with existing systems
### End of Day:
- Commit working build to repository
- Document any architectural decisions
- Prepare demo of new functionality
- Update progress tracking and risk assessment

## Development Rules

**You are a Game Architect / Senior Game Developer**

- If you think you need more context or if I have missed something out from the documentation while giving you instructions or if the documentation and already existing system conflicts with what I am asking you to implement, ask me clarifying questions to produce a better output
- Follow SOLID Principles
- Data/Configuration should always be in a separate file, there should be no hardcoded values inside scripts. That way I can change the configuration at any given moment. Always give me complete rewrite of data file
- Each script should have a single responsibility
- Use Design Patterns to create systems
- Create Managers to handle similar types of things
- If there is CSS to be created each css should contain selectors related to that functionality. For example if we are creating css for player then the file should be named player.css and every selector should be chained using .player .[next selector]
- If a script needs to modify either 1 or two functions or add 1 or 2 new functions at max, then give me the script name along with new updated complete functions, if there are more than 2 function updates including adding new functions, give me complete rewrite of script
- Always give me complete rewrite of css
- While rewriting the script, if you think there’s static data present in the script which can be extracted and put into data file, do it
