---
title: "Installation"
---

Choose how you want to use the library:

- If you want to use it now: use **Manual Installation**.
- If you are waiting for package distribution: see **NPM** or **CDN**.

## NPM

> [!Note]
> This method is not yet available.

## CDN

> [!Note]
> This method is not yet available.

## Manual Installation

### 1) Requirements

Install these first:

- [Git](https://git-scm.com/downloads) to clone the source code
- [Node.js 18+](https://nodejs.org/) (includes npm) to install dependencies and build
- A browser with WebGL2 support to run your app/examples

### 2) Clone the repository and install dependencies

```bash
git clone https://github.com/waynemwashuma/chorama.git
cd chorama
npm install
```

### 3) Build the library files

```bash
npm run build-src
```

This creates build output in `dist/`, including:

- `dist/index.umd.js`
- `dist/index.module.js`

Optional: if you also want local docs/examples output, run:

```bash
npm run build
```

### 4) Copy files to your project

Copy one or both build files into your own project.

- Use `dist/index.module.js` for ESM usage (recommended).
- Use `dist/index.umd.js` for plain script-tag usage.

Example layout used below:

```text
your-project/
  libs/
    chorama/
      index.module.js
      index.umd.js
```

### 5) Use in your project

#### ESM (recommended)

If you use a bundler, set an alias so your app can import from `"chorama"` directly.

##### Vite (`vite.config.js`)

```js
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      chorama: path.resolve(__dirname, "libs/chorama/index.module.js")
    }
  }
});
```

##### Webpack (`webpack.config.js`)

```js
const path = require("node:path");

module.exports = {
  resolve: {
    alias: {
      chorama: path.resolve(__dirname, "libs/chorama/index.module.js")
    }
  }
};
```

Then import in app code:

```js
import { WebGLRenderer, MeshMaterialPlugin, CameraPlugin } from "chorama";
```

#### Plain HTML with browser import maps (no bundler)

Use the ESM file with an import map:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chorama - Import Map</title>
    <script type="importmap">
      {
        "imports": {
          "chorama": "./libs/chorama/index.module.js"
        }
      }
    </script>
  </head>
  <body>
    <canvas id="app"></canvas>
    <script type="module">
      import { WebGLRenderer, WebGLRenderDevice, MeshMaterialPlugin, CameraPlugin } from "chorama";

      const canvas = document.getElementById("app");
      const device = new WebGLRenderDevice(canvas);
      const renderer = new WebGLRenderer({
        renderDevice: device,
        plugins: [new MeshMaterialPlugin(), new CameraPlugin()]
      });
    </script>
  </body>
</html>
```

#### Plain HTML with script tag (UMD)

Use the UMD build if you do not want modules:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chorama - Plain HTML</title>
    <script src="./libs/chorama/index.umd.js"></script>
  </head>
  <body>
    <canvas id="app"></canvas>
    <script>
      const { WebGLRenderer, WebGLRenderDevice, MeshMaterialPlugin, CameraPlugin } = window.CHORAMA;
      const canvas = document.getElementById("app");
      const device = new WebGLRenderDevice(canvas);

      const renderer = new WebGLRenderer({
        renderDevice: device,
        plugins: [new MeshMaterialPlugin(), new CameraPlugin()]
      });
    </script>
  </body>
</html>
```
