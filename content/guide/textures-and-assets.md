---
title: "Textures and Assets"
---

This guide assumes your scene already renders from [First Scene](/guide/first-scene).
Here, we focus only on bringing external assets into that scene.

## What You Will Add

- image textures
- OBJ models
- glTF models
- safe runtime handling while assets stream in

## Step 1: Import Loaders

```js
import { TextureLoader, OBJLoader, GLTFLoader } from "chorama";
```

Create one loader instance per asset type and reuse it.

## Step 2: Load a Texture

```js
const textureLoader = new TextureLoader();

const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipX: false,
  flipY: true
});
```

Keep paths relative to your app's static/public asset root.
`flipX` mirrors the image horizontally and `flipY` mirrors it vertically before upload.

## Step 3: Apply the Texture to a Material

```js
const material = new BasicMaterial({
  mainTexture: texture
});

const object = new MeshMaterial3D(mesh, material);
```

Once assigned, the texture updates automatically when loading completes.
You can render immediately, no manual onready callback is required for basic flow.

## Step 4: Load an OBJ Model

```js
const objLoader = new OBJLoader();

const objRoot = objLoader.load({
  paths: ["/models/model.obj"]
});
```

`objRoot` is available immediately and fills as data arrives.
You can include it in your render list right away.

## Step 5: Optionally Patch Imported OBJ Materials

If you want to force a change across imported meshes, use `postprocessor`.
An example is to assign a texture to all objects in an obj file

```js
const objRoot = objLoader.load({
  paths: ["/models/obj/pirate_girl/pirate_girl.obj"],
  postprocessor: (asset) => {
    asset.traverseDFS((node) => {
      if (node instanceof MeshMaterial3D) {
        node.material.mainTexture = texture;
      }
      return true;
    });
  }
});
```

## Step 6: Load a glTF Scene

```js
const gltfLoader = new GLTFLoader();

const sceneRoot = gltfLoader.load({
  paths: ["/models/pirate_girl.gltf"]
});
```

Use glTF when you want richer material data and better modern tooling support.

## Step 7: Render Streaming Assets Safely

```js
function frame() {
  renderer.render([object, objRoot, sceneRoot, camera], device);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Does not block rendering while waiting for loaders;
Render continuously with placeholders and loaded data will appear as they become ready.

## Path Rules That Prevent Most Loading Errors

1. Use forward slashes in URLs, even on Windows.
2. Use absolute app-root paths like `...` when possible.
3. Keep `.gltf` sidecar files (`.bin`, textures) in expected relative locations.
4. Confirm your dev server actually serves the asset directory.

## Reference Examples

- [OBJ Loader](/examples/loader/objloader)
- [glTF Loader](/examples/loader/gltfloader)
- [Iridescence Lamp](/examples/loader/gltf/material/iridescence_lamp)
- [Teapot Reflection Refraction](/examples/material/standard/reflection_refraction)

After this works, continue with [Scene Graph and Transforms](/guide/scene-graph-and-transforms)
