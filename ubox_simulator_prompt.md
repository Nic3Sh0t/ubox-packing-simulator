# Claude Code Prompt: U-Box 3D Packing Simulator

## Project Overview

Build a local browser-based 3D packing simulator that lets me model a U-Haul U-Box container and arrange furniture inside it to plan my move layout. This is a personal utility tool — prioritize functionality and usability over visual polish.

## Tech Stack

- **Vite + React + TypeScript**
- **React Three Fiber (@react-three/fiber)** for 3D rendering
- **@react-three/drei** for OrbitControls, TransformControls, Grid, Html, Text, etc.
- **Tailwind CSS** for the UI panels
- **zustand** for state management (furniture list, selection state, undo history)

## U-Box Container Specs

Internal dimensions (these are confirmed and must be exact):
- **Length**: 95 inches
- **Width**: 56 inches  
- **Height**: 83.5 inches
- Capacity: 257 cubic feet
- Max weight: 2,000 lbs

Render the U-Box as:
- Semi-transparent amber/orange walls (color #f5a623, opacity ~0.08)
- Solid orange wireframe edges on all 12 edges
- Dimension labels on each axis (e.g. "95in (L)")
- A subtle grid on the floor inside the box

Support toggling between 1–4 U-Boxes displayed side by side with a small gap between them.

## Furniture System

### Shape Types

Each furniture item has: name, shape type, dimensions (in inches), and a user-selectable color.

1. **Box** (rectangular prism) — params: Length, Width, Height
2. **L-Shape** — params: Length (full back), Width (full side), Height, Arm Width (thickness of both arms). Modeled as two joined rectangular prisms.
3. **Cylinder** — params: Diameter, Height

### Presets

Include a dropdown of common furniture presets that auto-fill dimensions (user can still edit before adding):
- King Mattress: 76 x 80 x 11 (box)
- Queen Mattress: 60 x 80 x 11 (box)
- 3-Seat Sofa: 84 x 36 x 34 (box)
- L-Shaped Sectional: 84 x 84 x 34, armW 36 (lshape)
- Bookshelf: 36 x 12 x 72 (box)
- Dining Table: 60 x 36 x 30 (box)
- Dining Chair: 18 x 20 x 36 (box)
- Dresser: 60 x 18 x 34 (box)
- Nightstand: 24 x 16 x 24 (box)
- TV (55"): 49 x 4 x 28 (box)
- Desk: 48 x 24 x 30 (box)
- Washer/Dryer: 27 x 28 x 36 (box)
- Moving Box (Large): 18 x 18 x 24 (box)
- Moving Box (Medium): 18 x 18 x 16 (box)
- Floor Lamp (cylinder): diameter 12, height 65
- Bar Stool: 15 x 15 x 30 (box)

## Interaction Model

### Camera
- OrbitControls from drei — left drag to orbit, scroll to zoom, right drag to pan
- Default camera angle: elevated 3/4 view looking at the U-Box
- A "Reset View" button to snap back to the default angle

### Object Manipulation
- **Click** an object to select it (highlight with wireframe outline or glow)
- **Drag** selected object on the floor plane (XZ) by default
- **Shift + Drag** to move vertically (Y axis)
- **TransformControls** from drei on the selected object — allow translate mode. Optionally toggle rotate mode.
- **R key** or button: rotate selected 90° around Y axis
- **Delete key** or button: remove selected item
- **Duplicate button**: clone selected item with same dimensions, place it offset slightly

### Boundary Enforcement
- Furniture items should be constrained to stay within the U-Box boundaries (clamp position so the bounding box doesn't exceed the container walls)
- Visual warning (e.g. red tint) if an item overlaps another item (basic AABB collision check is fine, doesn't need to be perfect for L-shapes)

## UI Layout

```
┌──────────────────────────────────────────────────┐
│  [Left Sidebar - 320px]  │   [3D Viewport]       │
│                          │                        │
│  ┌─ Add Furniture ─────┐ │                        │
│  │ Preset: [dropdown]  │ │                        │
│  │ Name: [input]       │ │                        │
│  │ Shape: [box|L|cyl]  │ │                        │
│  │ L: [__] W: [__]     │ │                        │
│  │ H: [__]             │ │                        │
│  │ Color: [swatches]   │ │                        │
│  │ [Add Item]          │ │                        │
│  └─────────────────────┘ │                        │
│                          │                        │
│  ┌─ Items List ────────┐ │                        │
│  │ ● Sofa  84x36x34   │ │                        │
│  │ ● Desk  48x24x30   │ │                        │
│  │ ...                 │ │                        │
│  └─────────────────────┘ │                        │
│                          │                        │
│  ┌─ Stats ─────────────┐ │                        │
│  │ Volume used: XX%    │ │                        │
│  │ Items: N            │ │                        │
│  │ U-Boxes: [1][2][3]  │ │                        │
│  └─────────────────────┘ │                        │
│                          │                        │
│  ┌─ Controls ──────────┐ │                        │
│  │ [Rotate] [Delete]   │ │                        │
│  │ [Duplicate]         │ │                        │
│  │ [Reset View]        │ │                        │
│  └─────────────────────┘ │                        │
└──────────────────────────────────────────────────┘
```

## Stats Panel

Show at a glance:
- Total items count
- Total volume of all items vs. U-Box capacity (257 cu ft per box), as a percentage and a visual bar
- Estimated total weight (optional: let user input weight per item, otherwise skip)

## Design Direction

- Dark background (dark navy/charcoal, e.g. #1a1a2e)
- U-Box in U-Haul orange (#f5a623) wireframe
- Clean, utilitarian UI — this is a tool, not a showpiece
- Sidebar on dark gray (#111827 or similar)
- Good contrast on form inputs
- Mobile is NOT a priority — optimize for desktop mouse interaction

## Implementation Notes

- Use inches as the internal unit everywhere. Display in inches in the UI.
- Scale factor for Three.js: 1 inch = 0.02 Three.js units (so the U-Box is about 1.9 units long). Or pick whatever scale makes the camera/controls feel right.
- For the items list in the sidebar, clicking an item should select it in the 3D view (and vice versa — selecting in 3D should highlight it in the list).
- Furniture items should sit on the floor by default (Y position = half their height).
- Use zustand so the state is easy to manage and extend later.

## Stretch Goals (only if core works well)

- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Save/load layout to a JSON file (export button → downloads JSON, import button → file picker)
- Snap-to-grid toggle (e.g. 1-inch grid snapping)
- "Top-down view" toggle button (orthographic camera looking straight down)
- Weight tracking per item
