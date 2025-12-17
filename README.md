CAD Sketcher — Variational Geometry Editor

Overview
This repository contains a monorepo with:
- apps/sketcher — React app with an SVG-based editor for creating points and segments, applying constraints, and visual feedback.
- packages/solver — TypeScript variational solver implementing Levenberg–Marquardt with numeric Jacobian and a constraint system.

Quick start
1) Install pnpm if not installed: https://pnpm.io/installation
2) Install deps:
   pnpm install
3) Run app:
   pnpm --filter @cad/sketcher dev
4) Run tests:
   pnpm -r test

Workspace layout
- pnpm-workspace.yaml — workspace definition
- tsconfig.base.json — base TypeScript configuration
- apps/sketcher — Vite + React 18 + TypeScript app
- packages/solver — publishable TS package, no React dependency

Notes
- Keep code FP-oriented; avoid classes unless there is a clear benefit.
- The solver is UI-agnostic and can be tested independently.
- Constraints currently include: coincident points, fixed point, distance; more to come.

License
MIT


