# Three.js First Person Shooter Game

A basic first-person shooter game built with Three.js that runs in the browser.

## Features

- **First-person controls**: WASD movement, mouse look, and jump
- **Shooting mechanics**: Raycast-based hit detection with ammo management
- **Target system**: Destructible targets that respawn after being destroyed
- **Enemy AI**: Hostile robots that shoot back at the player with accuracy spread and range limits
- **Score tracking**: Points awarded for destroying targets
- **Visual feedback**: Muzzle flash, hit indicators, and smooth animations

## Controls

- **WASD** - Move (forward, backward, strafe left, strafe right)
- **Mouse** - Look around (first-person camera)
- **Left Click** - Shoot
- **R** - Reload
- **Space** - Jump

## Enemy AI & Combat

The game features hostile enemy robots that actively engage the player in combat.

### Hostile Robots

- **Blue Robots (20 points)**: These are hostile and will shoot at the player. They move around the map and actively engage in combat.
- **Red Robots (10 points)**: These are stationary and non-hostile. They do not shoot or move.

### Shooting Mechanics

Hostile robots (blue/20-point targets) use the following combat systems:

- **Accuracy System**: Robots have an accuracy spread of 0.15 radians (~8.6 degrees) applied to both horizontal and vertical axes, making shots less precise. This prevents robots from having perfect aim and adds tactical gameplay.

- **Range System**: Projectiles have a maximum range of 30 units and are automatically removed when they exceed this distance. This prevents infinite-range attacks and creates engagement zones.

- **Line of Sight**: Robots check for obstacles (walls, trees, etc.) blocking their shots before firing. If an obstacle is between the robot and the player, the robot will not shoot. Note that other targets do not block line of sight.

- **Cooldown**: Robots shoot every 2 seconds (2000ms cooldown), preventing constant spam and allowing players time to react.

### Projectile Behavior

- Projectiles travel at 15 units per second
- Each projectile deals 10 damage points to the player
- Projectiles are tracked from their starting position and removed when they exceed maximum range or lifetime (3 seconds fallback)

## Setup and Running

### Quick Start (Easiest)

Run the provided script:
```bash
./run.sh
```

Or manually start a server using one of these methods:

### Option 1: Using Python (Simplest)

```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

### Option 2: Using npm/http-server

```bash
npx http-server . -p 8080 -c-1
```

### Option 3: Using VS Code Live Server

If you're using VS Code, install the "Live Server" extension, then right-click on `index.html` and select "Open with Live Server".

### Then Open in Browser

Once the server is running, open your browser and go to:
```
http://localhost:8080
```

**Important:** The game must be served from a web server (not opened directly as a file) because it uses ES6 modules.

## GitHub Pages Deployment

This game can be deployed to GitHub Pages for easy hosting. **Note:** Only single-player mode will work on GitHub Pages. Multiplayer requires a separate Node.js server.

### Setup Steps:

1. **Push your code to GitHub** (if you haven't already)

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

3. **Your game will be available at:**
   ```
   https://[your-username].github.io/robo-blasters/
   ```

The `.nojekyll` file in the repository root ensures GitHub Pages serves all files correctly (including files starting with underscores).

### Multiplayer Note:
Multiplayer functionality requires the server to be running separately (see `server/README.md`). On GitHub Pages, the multiplayer button will attempt to connect but will fail gracefully, allowing single-player mode to work normally.

## Requirements

- A modern web browser with WebGL support
- A local web server (files must be served, not opened directly via file://)

## Technical Details

- **Three.js**: Used for 3D rendering and scene management
- **ES6 Modules**: Code is organized into modular components
- **Pointer Lock API**: Used for mouse capture in first-person view
- **Raycasting**: Used for hit detection when shooting
- **Enemy AI**: Robot shooting mechanics use quaternion rotations for accuracy spread, creating realistic angular deviation from perfect aim

## Robot Shooting Settings Reference

Reference for all robot shooting parameters and settings. These values are defined in `src/target.js`.

| Setting | Value | Description | Location |
|---------|-------|-------------|----------|
| **accuracySpread** | `0.15` radians (~8.6°) | Angular spread applied to both horizontal and vertical axes. Controls how much shots deviate from perfect aim. | Line 429 |
| **maxProjectileRange** | `30` units | Maximum distance projectiles can travel before being automatically removed. | Line 428 |
| **shootCooldown** | `2000` ms (2 seconds) | Minimum time between shots. Robots cannot shoot faster than this rate. | Line 425 |
| **projectileSpeed** | `15` units/second | Velocity of projectiles when fired. | Line 688 |
| **projectileDamage** | `10` damage points | Damage dealt to player when hit by a projectile. | Line 691 |
| **projectileLifetime** | `3000` ms (3 seconds) | Fallback lifetime for projectiles. Used if range check doesn't trigger removal first. | Line 689 |

### Additional Notes

- **Hostile Robots**: Only blue robots (20-point targets) shoot at the player. Red robots (10-point) are stationary and non-hostile.
- **Line of Sight**: Robots check for obstacles blocking their shots before firing. Targets do not block each other's line of sight.
- **Accuracy System**: Accuracy spread uses quaternion rotations for angular deviation from the target direction.
- **Range System**: Range check is distance-based from the projectile's starting position. Projectiles are removed when they exceed `maxProjectileRange` or `projectileLifetime`.

## Credits

- **Background Music**: "RetroFuture Clean" by Kevin MacLeod (incompetech.com)
  - Licensed under Creative Commons: By Attribution 4.0 License
  - http://creativecommons.org/licenses/by/4.0/

## Project Structure

```
├── index.html          # Main HTML file with UI
├── src/
│   ├── main.js        # Game initialization and main loop
│   ├── player.js      # Player controller (movement, camera)
│   ├── weapon.js      # Shooting mechanics and ammo system
│   ├── target.js      # Target objects and target manager
│   └── utils.js       # Utility functions
├── package.json       # Project configuration
└── README.md          # This file
```

## Browser Compatibility

This game requires:
- WebGL support
- ES6 module support
- Pointer Lock API support

Most modern browsers (Chrome, Firefox, Edge, Safari) support these features.

