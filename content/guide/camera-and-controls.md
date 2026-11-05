---
title: "Camera and Controls"
---

# Camera and Controls

This guide assumes you already have a working render loop from [First Scene](/guide/first-scene).
Here, we only focus on camera setup and controls.

## What You Will Add

- one camera bound to a render target
- a perspective projection setup
- orbit controls for mouse/touch navigation
- a free camera controller for keyboard and mouse navigation
- 2D pan, zoom, and rotation controls

## Step 1: Import Camera APIs

```js
import {
  Camera,
  PerspectiveProjection,
  OrthographicProjection,
  OrbitCameraControls,
  FreeCameraController,
  Pan2DCameraController
} from "chorama";
```

You only need `OrthographicProjection` if you plan to switch projection type.

## Step 2: Create a Camera

```js
const camera = new Camera(target);
camera.transform.position.z = 3;
```

`target` should be your existing `CanvasTarget`.
The `z` offset keeps objects visible in front of the camera.

## Step 3: Configure Perspective Projection

```js
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 3;
  camera.projection.aspect = innerWidth / innerHeight;
}
```

Use this as the default for most real-time 3D scenes.

## Step 4: Add Orbit Controls

```js
const controls = new OrbitCameraControls(camera, canvas);
controls.distance = 4;
```

`canvas` should be the element receiving pointer input.
`distance` controls how far the orbit camera stays from its target.

## Step 5: Update Controls in the Frame Loop

```js
function frame() {
  controls.update();
  renderer.render([object, camera], device);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Call `controls.update()` every frame before rendering.
If you skip it, input changes will not be applied.

## Use a Free Camera

`FreeCameraController` provides first-person-style movement. Hold the left
pointer button and drag to look around, use `WASD` or the arrow keys to move,
and use `E`/`Space` and `Q`/`Ctrl` to move up and down. Hold `Shift` to move
faster.

```js
const controls = new FreeCameraController(camera, canvas);
controls.movementSpeed = 4;

function frame() {
  controls.update();
  renderer.render([object, camera], device);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Pass a frame delta in seconds when you want movement to be independent of the
render rate, for example `controls.update(deltaTime)`.

## Use a 2D Camera Controller

`Pan2DCameraController` is intended for an orthographic camera viewing a 2D
scene. Drag with the left pointer button to pan, drag with the right or middle
button to rotate around the Z axis, and use the wheel to zoom. Touch input
supports one-finger panning and two-finger pan, pinch, and rotation gestures.

```js
const controls = new Pan2DCameraController(camera, canvas)
controls.minZoom = 0.25
controls.maxZoom = 8

function frame() {
  controls.update()
  renderer.render([sprite, camera], device)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
```

The controller keeps the orthographic projection bounds under your control and
applies zoom through the camera transform. `panSensitivity` scales the
screen-to-world pan distance and defaults to `1`.

## Switch to Orthographic Projection

Use orthographic projection when you need no perspective foreshortening.

```js
const ortho = new OrthographicProjection();
ortho.left = -5;
ortho.right = 5;
ortho.top = 5;
ortho.bottom = -5;

camera.projection = ortho;
```

For orthographic cameras, update bounds yourself when viewport shape changes.

## Reference Examples

If you want to compare against an example, see:

- [Perspective Camera](/examples/camera/perspective)
- [Orthographic Camera](/examples/camera/orthographic)

After this works, continue with [Materials and Lighting](/guide/materials-and-lighting).
