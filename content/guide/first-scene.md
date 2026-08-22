---
title: "First Scene"
---

This guide helps you render your first object on screen with the smallest useful setup.
You will build one scene with:

- one canvas
- one render device
- one renderer
- one camera
- one cube mesh
- one animation loop

The goal is to get a stable baseline you can reuse in every new project.

## What You Will Build

At the end, you will have a rotating cube rendered each frame.
No lighting setup, model loading, or advanced scene graph features are required here.
Those topics are covered in other dedicated guides.

## Before You Start

Make sure you already have a working local install from [Installation](/guide/installation).
You should be able to import from `chorama` or your local alias path.

## Build Your first scene

In your source file, do the following:

### Step 1: Import what you need

```js
import {
  WebGLRenderDevice,
  CanvasTarget,
  WebGLRenderer,
  Camera,
  PerspectiveProjection,
  MeshMaterial3D,
  BasicMaterial,
  CuboidMeshBuilder,
  Quaternion,
  MeshMaterialPlugin,
  CameraPlugin
} from "chorama";
```

This imports all the items we require for this setup.

### Step 2: Create and mount a canvas

```js
const canvas = document.createElement("canvas");
document.body.append(canvas);
```
Create the canvas and appends it to the body of the html document

### Step 3: Create device and render target

```js
const device = new WebGLRenderDevice(canvas, { depth: true });
const target = new CanvasTarget(canvas);
```

The `device` manages GPU-side rendering operations.
The `target` is the camera output surface.

### Step 4: Create renderer and required plugins

```js
const renderer = new WebGLRenderer({
  renderDevice: device,
  plugins: [new MeshMaterialPlugin(), new CameraPlugin()]
});
```

These two plugins are required for this scene:

- `MeshMaterialPlugin` draws mesh plus material objects.
- `CameraPlugin` enables camera processing in the render pass.

### Step 5: Create and position a camera

```js
const camera = new Camera(target);
camera.transform.position.z = 2.5;

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 3;
  camera.projection.aspect = 1;
}
```

Moving camera on `z` ensures the cube is in front of the view.
The initial `aspect` is a temporary placeholder; resize will set the real value.

### Step 6: Create a cube object

```js
const cubeMesh = new CuboidMeshBuilder().build();
const cubeMaterial = new BasicMaterial();
const cube = new MeshMaterial3D(cubeMesh, cubeMaterial);
```

This creates one drawable object with default shading.
Using `BasicMaterial` for an object that has no lighting applied to it.

### Step 7: Define per-frame rotation

```js
const stepRotation = Quaternion.fromEuler(0.01, 0.01, 0.0);
```

This rotation is multiplied into cube orientation each frame to animate motion.

### Step 8: Add resize handling

```js
function resize() {
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = cssWidth / cssHeight;
  }
}

window.addEventListener("resize", resize);
resize();
```

This keeps render resolution sharp and camera projection correct.
If you skip this, stretching and blur are likely on resize or high-DPI screens.

### Step 9: Start the render loop

```js
function frame() {
  cube.transform.orientation.multiply(stepRotation);
  renderer.render([cube, camera], device);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Each frame does three things: update state, render, schedule next frame.

## What You Can Try Next

Change only one variable at a time:

- move camera: `camera.transform.position.z = 4`
- stop rotation: remove `cube.transform.orientation.multiply(stepRotation)`
- rotate one axis only: `Quaternion.fromEuler(0.0, 0.01, 0.0)`
- change shape: replace `CuboidMeshBuilder` with another mesh builder

These changes help verify your scene wiring before adding complexity.

## Reference Example

If you want to compare against an example, see:

- [Rotating Cube](/examples/other/rotatingCube)

After this works, continue with [Camera and Controls](/guide/camera-and-controls).
