---
title: Chorama
---

A modular WebGL2 rendering library built in JavaScript.

## Features

- Rendering architecture
  - Modular, plugin-driven rendering pipeline
  - Multi-pass/view rendering support
  - Render-time resource and state caching to reduce redundant GPU work
  - Extensible shader include/define system

- Scene and transforms
  - Hierarchical scene graph for parent-child object relationships
  - Local/world transform propagation
  - Traversal utilities for update and render preparation flows
  - Support for static and skinned scene objects

- Geometry and mesh creation
  - Ready-to-use procedural geometry builders:
    - Plane
    - Circle
    - Cylinder
    - Cuboid
    - UV sphere
    - Wireframe conversion
  - Attribute-based mesh data model (positions, normals, UVs, tangents, skinning data)
  - Flexible vertex/index data handling for custom mesh pipelines

- Materials and shading
  - Multiple built-in shading styles:
    - Unlit/basic shading
    - Lambert diffuse shading
    - Phong shading
    - Standard physically based shading
    - Normal/depth debug shading
    - Raw/custom shader paths
  - Material properties for color, texture mapping, emissive, metallic and roughness workflows
  - Shared shader code modules for common math, color and lighting logic

- Lighting and shadows
  - Supported light types:
    - Ambient
    - Directional
    - Point
    - Spot
  - Shadow rendering support integrated into the render pipeline
  - Lighting/material integration for lit and physically based workflows

- Textures and sampling
  - Multiple texture formats and usage patterns
  - Sampler controls for filtering and wrapping behavior

- Render targets and offscreen rendering
  - Direct rendering to canvas
  - Offscreen/image render target support
  - Framebuffer-based workflows for multi-step rendering
  - Foundations for post-process and texture-to-texture pipelines

- Asset loading
  - Built-in loaders for:
    - Image textures
    - OBJ models
    - glTF scenes/assets
  - Async loading with default placeholders while assets stream in
  - Asset reuse and clone/copy loading strategies
  - glTF material/texture/skeleton parsing paths

- Camera and interaction
  - Perspective and orthographic camera projections
  - Orbit-style interaction controls for inspection/navigation
  - Camera-aware rendering integration through the plugin system

- Math and low-level utilities
  - Core math types and operations for:
    - Vectors
    - Quaternions
    - Matrices/affine transforms
  - Buffer/type conversion helpers for GPU upload workflows
  - WebGL mapping helpers for vertex formats, attachments and texture formats

## Who This Is For

Use this library if you want lower-level control than full game engines, but still want reusable rendering building blocks for WebGL2 projects.

## Getting Started

### Requirements

- Node.js 18+
- npm
- A browser with WebGL2 support

### Install dependencies

```bash
npm install
```

### Build library bundles

```bash
npm run build
```

Build output:

- `dist/index.umd.js`
- `dist/index.module.js`

### Run demos

```bash
npx vite .
```

Then open:

- `http://localhost:5173/examples/index.html`

## Core Usage Flow

1. Create a `WebGLRenderDevice` from a canvas.
2. Create a render target (`CanvasTarget` or `ImageTarget`).
3. Create a `WebGLRenderer` with the plugins needed by your scene.
4. Build scene objects (meshes, lights, camera).
5. Call `renderer.render(objects, renderDevice)` each frame.
