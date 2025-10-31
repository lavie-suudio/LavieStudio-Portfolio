# LavieStudio Portfolio - AI Agent Instructions

## Project Overview
Interactive 3D portfolio built with Three.js, Vite, and WebGL. Features a temple scene with animated lanterns, raycaster-based interactions, and day/night texture swapping.

## Architecture & Key Patterns

### Single-File Architecture
- **All logic in `src/main.js`** - No component split, everything is procedural
- Scene setup → Model loading → Event handlers → Render loop pattern
- Keep related functionality grouped in the existing comment-delimited sections

### Three.js Scene Structure
```javascript
// Key scene objects are globally declared at top:
const zAxisLantern = [];      // Meshes for rotation animation
const raycasterObject = [];   // Interactive clickable elements
const pointer = new THREE.Vector2(); // Normalized screen coords
```

### Naming Conventions (Critical for Raycasting)
**From Blender GLB exports:**
- Interactive buttons: `*_Target_Raycaster` (YT_Target_Raycaster, IG_Target_Raycaster, etc.)
- Lanterns: `Temple_Lantern_#_Raycaster` (numbered 1-12)
- Texture sets: `First` and `Second` (match mesh names in Blender)

**Raycaster logic depends on `.includes()` string matching - preserve exact naming!**

### Texture System
Two texture sets (`First`, `Second`) with day/night variants:
- Loaded upfront via `textureMap` object
- Applied during model traverse by matching mesh names
- Always set `flipY = false` and `colorSpace = THREE.SRGBColorSpace`

### Model Loading Pattern
```javascript
loader.load('glb_file', (glb) => {
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      // 1. Apply textures by name matching
      // 2. Populate raycasterObject array
      // 3. Populate animation arrays (zAxisLantern)
    }
  });
  scene.add(glb.scene); // Add AFTER traverse
});
```

## Critical Implementation Details

### Mobile Support (Required)
Both `mousemove`/`click` AND `touchmove`/`touchend` events must update `pointer` vector:
```javascript
pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
```

### Animation Loop
Single `render()` function with `requestAnimationFrame`:
1. Update controls (`controls.update()`)
2. Animate lanterns (sin-wave rotation)
3. Update raycaster & handle intersections
4. Scale buttons on hover (smooth lerp to target scale)
5. Render scene

### Hover Effects
All `*_Target_Raycaster` buttons scale from 1.0 → 1.3 on hover:
- Loop ALL `raycasterObject` to reset scales to 1.0
- Scale hovered button to 1.3
- Use `obj.scale.x += (target - obj.scale.x) * 0.15` for smooth animation

## Development Workflow

### Commands
- `npm run dev` - Vite dev server (hot reload enabled)
- `npm run build` - Production build to `dist/`
- `npx vercel --prod` - Deploy to Vercel (already configured)

### Assets
- **Models:** `public/models/temple_test_v18.glb` (current production version)
- **Textures:** `public/textures/{day,night}/[First|Second]_texture_set_*.webp`
- **Draco:** Required for GLB compression, decoder in `public/draco/`

### Backup/Restore
Backup pattern in use:
```powershell
Copy-Item "src\main.js" "src\main.js.backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
```
Git commits used for version control (push to `main` branch).

## Common Tasks

### Adding Interactive Objects
1. Name mesh `Something_Target_Raycaster` in Blender
2. Export GLB, increment version number
3. Add click handler in `touchend`/`click` listeners using `.includes()` check
4. Update `public/models/` path in loader

### Adjusting Animations
- **Lantern sway:** Modify `Math.sin(time + offset) * amplitude` in render loop
- **Speed:** Change `Date.now() * multiplier` (currently 0.0025)
- **Button hover scale:** Change target from 1.3 to desired size

### Texture Swapping
To add night mode toggle, switch `loadedTextures.day` ↔ `loadedTextures.night` in material assignment.

## Known Gotchas
- **Raycaster threshold:** Set to 0.5 for easier clicking (non-standard)
- **Scene add timing:** Must be AFTER traverse or meshes won't have materials
- **Modal z-index:** About Me modal uses z-index:1000, inline styles for simplicity
- **Mobile popups:** Some browsers block `window.open()` from touch events - consider alternatives
