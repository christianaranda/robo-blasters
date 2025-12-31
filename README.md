# Three.js First Person Shooter Game

A basic first-person shooter game built with Three.js that runs in the browser.

## Features

- **First-person controls**: WASD movement, mouse look, and jump
- **Shooting mechanics**: Raycast-based hit detection with ammo management
- **Target system**: Destructible targets that respawn after being destroyed
- **Score tracking**: Points awarded for destroying targets
- **Visual feedback**: Muzzle flash, hit indicators, and smooth animations

## Controls

- **WASD** - Move (forward, backward, strafe left, strafe right)
- **Mouse** - Look around (first-person camera)
- **Left Click** - Shoot
- **R** - Reload
- **Space** - Jump

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

## Requirements

- A modern web browser with WebGL support
- A local web server (files must be served, not opened directly via file://)

## Technical Details

- **Three.js**: Used for 3D rendering and scene management
- **ES6 Modules**: Code is organized into modular components
- **Pointer Lock API**: Used for mouse capture in first-person view
- **Raycasting**: Used for hit detection when shooting

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

