<!-- PROJECT TITLE & BADGES -->
# CAD Sketcher — Variational Geometry Editor

[![pnpm](https://img.shields.io/badge/pnpm-9.x-ffc233?logo=pnpm&logoColor=000)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=000)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&logoColor=fff)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

An interactive React-based sketcher with a variational constraint solver. Create points and segments, apply constraints
(coincident points, fixed point, distance, etc.), and get immediate visual feedback on the canvas.


## Features
- Create basic 2D geometry: points and segments
- Apply constraints: coincident, fixed position, specified length
- Visual hints and interactive editing on an SVG canvas
- Separate TypeScript solver package implementing Levenberg–Marquardt with numeric Jacobian


## Monorepo architecture
Organized as a pnpm workspace:
- `apps/sketcher` — Vite + React 18 app (UI, canvas, state)
- `packages/solver` — standalone TypeScript solver package, no React dependency

Shared configs:
- `pnpm-workspace.yaml` — workspace definition
- `tsconfig.base.json` — base TypeScript configuration


## Quick start
1) Install pnpm: https://pnpm.io/installation
2) Install dependencies:

```bash
pnpm install
```

3) Run the app:

```bash
pnpm --filter @cad/sketcher dev
```

4) Run tests across all packages:

```bash
pnpm -r test
```


## Useful scripts (root)
```bash
# Start the sketcher
pnpm dev

# Build all packages/apps
pnpm build

# Type-check all packages
pnpm typecheck

# Run tests in all packages
pnpm test
```


## Solver package `@cad/solver`
- Algorithm: Levenberg–Marquardt (LM) with numeric Jacobian
- Purpose: solve a system of constraints over a set of parameters
- Current constraints: coincident points, fixed point, distance
- UI-agnostic: can be tested and used independently from the app


## Tech stack
- React 18, Vite 5, TypeScript 5, TailwindCSS
- Zustand — state management
- Vitest — testing


## Project structure
```text
.
├─ apps/
│  └─ sketcher/           # UI app (Vite + React)
├─ packages/
│  └─ solver/             # Variational solver (TS)
├─ pnpm-workspace.yaml    # Workspace definition
├─ tsconfig.base.json     # Base TS config
└─ README.md
```


## Contributing & code style
- Prefer functional style; use classes only when clearly beneficial
- Keep it simple (KISS) and avoid duplication (DRY)
- Keep the solver UI-agnostic for easier testing and reuse


## License
MIT


