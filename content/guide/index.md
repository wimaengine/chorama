---
title: "Guide"
---

# Guide

This guide helps you build scenes with Chorama using practical, task-first steps.

## Overview

Chorama is a modular WebGL2 rendering library focused on explicit control: you compose render behavior with plugins, build scenes from reusable object/material/light primitives, and keep direct visibility into the render flow.

> [!WARNING]
> Chorama is currently experimental and is not recommended for production use.
> Expect API changes, behavior changes and breaking changes as the library evolves.

This guide is structured to take you from first render to production-style scene setup. Instead of covering every class in isolation first, each chapter is anchored to a concrete task and points you to full runnable examples.

By the end of this guide, you should be able to:

- Set up a render loop with `WebGLRenderDevice`, `CanvasTarget`, and `WebGLRenderer`
- Build and animate scene objects with camera, materials, and lights
- Load texture/model assets and handle async content safely
- Use render targets and view configuration for offscreen and multi-view scenarios
- Understand the plugin-driven pipeline enough to debug and extend behavior

## Who This Guide Is For

Use this if you want direct WebGL2 control but still want reusable building blocks.

## How To Use This Guide

- New to Chorama: follow the reading order from top to bottom.
- Migrating from another renderer: start at [First Scene](/guide/first-scene), then jump to [Plugins and Render Pipeline](/guide/plugins-and-render-pipeline).
- Looking for a specific API: use [API Map](/guide/api-map) as an index, then return to task pages for applied usage.
- Blocked on behavior: check [Troubleshooting](/guide/troubleshooting), then compare your setup against a matching example route.

## Reading Order

1. [Installation](/guide/installation)
2. [First Scene](/guide/first-scene)
3. [Camera and Controls](/guide/camera-and-controls)
4. [Materials and Lighting](/guide/materials-and-lighting)
5. [Textures and Assets](/guide/textures-and-assets)
6. [Render Targets and Views](/guide/render-targets-and-views)
7. [Scene Graph and Transforms](/guide/scene-graph-and-transforms)
8. [Plugins and Render Pipeline](/guide/plugins-and-render-pipeline)
9. [API Map](/guide/api-map)
10. [Troubleshooting](/guide/troubleshooting)
