---
title: "API Map"
---

# API Map

This is a high-level map of the public surface exported from `src/index.js`.

## Quick Import Example

```js
import {
  WebGLRenderDevice,
  WebGLRenderer,
  Camera,
  MeshMaterial3D,
  MeshMaterialPlugin,
  CameraPlugin
} from "chorama";
```

## Rendering Core

- `WebGLRenderDevice`
- `WebGLRenderer`
- Core descriptors/pipeline types from `core`

## Scene Objects

- `Object3D`
- `MeshMaterial3D`
- `Camera`
- `SkyBox`
- `Bone3D`

## Materials

- `BasicMaterial`
- `LambertMaterial`
- `PhongMaterial`
- `StandardMaterial`
- `RawMaterial`
- Debug variants (`NormalMaterial`, `DepthMaterial`)

## Lighting

- `AmbientLight`
- `DirectionalLight`
- `PointLight`
- `SpotLight`
- Shadow helpers

## Geometry and Mesh

- `Mesh`
- Mesh builders: `PlaneMeshBuilder`, `CuboidMeshBuilder`, `UVSphereMeshBuilder`, etc.
- `Attribute` and attribute-data utilities

## Camera and Control

- `PerspectiveProjection`
- `OrthographicProjection`
- `CameraController`
- `OrbitCameraControls`
- `FreeCameraController`
- `Pan2DCameraController`

## Assets and Textures

- `TextureLoader`
- `OBJLoader`
- `GLTFLoader`
- `Texture`, `Sampler`

## Render Targets

- `CanvasTarget`
- `ImageTarget`
- `RenderTarget`

## Plugins

- `CameraPlugin`
- `MeshMaterialPlugin`
- `LightPlugin`
- `ShadowPlugin`
- `SkyboxPlugin`

For real usage patterns:

- [Rotating Cube](/examples/other/rotatingCube)
- [Examples Overview](/examples)
