---
title: "Materials and Lighting"
---

This guide assumes you already have a working scene from [First Scene](/guide/first-scene).
Here, you will add lit materials and light objects in small steps.

## What You Will Add

- a material choice based on visual style
- renderer plugins required for lighting
- ambient light for base visibility
- one direct light source
- a render list that includes lights

## Step 1: Import Material and Light APIs

```js
import {
  BasicMaterial,
  LambertMaterial,
  PhongMaterial,
  StandardMaterial,
  AmbientLight,
  DirectionalLight,
  LightPlugin
} from "chorama";
```

Use `BasicMaterial` when you do not need scene lighting.
Use `LambertMaterial`, `PhongMaterial`, or `StandardMaterial` when you want lights to affect the surface.

## Step 2: Pick a Material Model

```js
const basic = new BasicMaterial();
const lambert = new LambertMaterial();
const phong = new PhongMaterial();
const standard = new StandardMaterial({ roughness: 0.5, metallic: 0.1 });
```

Quick guidance:

- `BasicMaterial`: unlit shading
- `LambertMaterial`: diffuse lit shading
- `PhongMaterial`: diffuse + specular highlight shading
- `StandardMaterial`: physically-based roughness/metallic shasing

For a first lit scene, start with `LambertMaterial`.

## Step 3: Apply the Material to Your Mesh Object

```js
const object = new MeshMaterial3D(mesh, lambert);
```
The second parameter can be any of the materials shown in the previous step.
If you keep `BasicMaterial` as the material of the object, lights will not change the object's appearance.

## Step 4: Enable the Lighting Pipeline in the Renderer

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

`LightPlugin` must be present on the renderer for lit materials to respond to lights.

## Step 5: Add Ambient Light

```js
const ambient = new AmbientLight();
ambient.intensity = 0.15;
```

Ambient light gives a soft base so unlit sides are still visible.
It is used to approximate indirect lighting for the entire scene.
Keep this low so directional/point/spot lights can affect the object's appearance.

## Step 6: Add a Directional Light

```js
const sun = new DirectionalLight();
sun.intensity = 1.0;
sun.transform.orientation.rotateX(-Math.PI / 4);
sun.transform.orientation.rotateZ(-Math.PI / 4);
```

Directional light is a good first light because it is simple and predictable.
It behaves like a distant light source with parallel rays. In this case, the light
will point downwards onto the scene.

## Step 7: Render with Object, Lights, and Camera

```js
renderer.render([object, ambient, sun, camera], device);
```

Your render list must include light objects each frame.
If lights are missing from the list, lit materials may look black or flat.

## Step 8: Animate and Keep Scene Responsive

```js
function frame() {
  renderer.render([object, ambient, sun, camera], device);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Keep your existing resize handler from [First Scene](/guide/first-scene).
Perspective scenes still require `camera.projection.aspect` updates on resize.

## Switching Between Material Types

You can swap material at runtime to compare look and performance:

```js
object.material = phong;
// object.material = standard;
// object.material = lambert;
```

## Reference Examples

- [Directional Light](/examples/lights/directional)
- [Point Light](/examples/lights/point)
- [Spot Light](/examples/lights/spot)

After this works, continue with [Textures and Assets](/guide/textures-and-assets)
