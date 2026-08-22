---
title: "Plugins and Render Pipeline"
---

This renderer is plugin-driven.
Plugins discover scene objects, prepare render data, and contribute render work.
The snippets below assume you already have a `device` variable that points to the `WebGLRenderDevice` you render with.

## What You Will Add

- a plugin stack for your renderer
- a clear plugin order strategy

## Step 1: Import Core Renderer and Plugins

```js
import {
  WebGLRenderer,
  CameraPlugin,
  MeshMaterialPlugin,
  LightPlugin,
  ShadowPlugin,
  SkyboxPlugin
} from "chorama";
```

Start with the smallest plugin set your scene needs.
Add others only when features require them.

## Step 2: Build a Minimal Plugin Stack

```js
const renderer = new WebGLRenderer({
  renderDevice: device,
  plugins: [
    new MeshMaterialPlugin(),
    new CameraPlugin()
  ]
});
```

This stack is enough for camera + mesh/material scenes without lighting.

## Step 3: Add Lighting Support

```js
const renderer = new WebGLRenderer({
  renderDevice: device,
  plugins: [
    new LightPlugin(),
    new MeshMaterialPlugin(),
    new CameraPlugin()
  ]
});
```

`LightPlugin` provides light uniform data for lit shaders.
Without it, lit materials may render incorrectly.

## Step 4: Add Shadows and Skybox When Needed

```js
const renderer = new WebGLRenderer({
  renderDevice: device,
  plugins: [
    new ShadowPlugin(),
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
    new CameraPlugin()
  ]
});
```

Use this fuller stack only when your scene needs shadows/skybox.
It is heavier than the minimal stack.

## Step 5: Render as Usual

```js
renderer.render(objects, device);
```

The pipeline stays behind this single call.
You choose behavior by changing plugins and scene objects.

## What Happens During `render()`

High-level flow:

1. Object transforms are updated through scene traversal.
2. Each plugin preprocesses scene data.
3. Plugins contribute views/render items.
4. Views are sorted and rendered.

This is why missing plugins often look like "nothing happens" rather than hard errors.

## Plugin Roles

- `CameraPlugin`: creates camera views and per-view camera data.
- `MeshMaterialPlugin`: converts `MeshMaterial3D` objects into draw items.
- `LightPlugin`: collects light objects and uploads light blocks.
- `ShadowPlugin`: builds shadow passes/resources for shadow-casting lights.
- `SkyboxPlugin`: adds skybox rendering behavior.

## Create a Custom Plugin

```js
class MyPlugin extends Plugin {
  init(renderer) {
    // register resources, shader defines, or view fillers
  }

  preprocess(objects, device, renderer) {
    // inspect scene, prepare data, push views/resources
  }

  getRenderItem(object, device, renderer) {
    // return a render item for supported object types
    return undefined;
  }
}
```

A custom plugin should solve one focused concern.
Avoid mixing unrelated responsibilities in one plugin.
