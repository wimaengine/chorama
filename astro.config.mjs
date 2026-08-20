import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { website } from "wima-docs-website-template";

function glsl() {
  return {
    name: "glsl",
    enforce: "pre",
    load(id) {
      if (!id.endsWith(".glsl")) {
        return null;
      }

      return `export default ${JSON.stringify(readFileSync(id, "utf8"))}`;
    },
  };
}

export default defineConfig({
  output: "static",
  compressHTML: true,
  publicDir: "./assets",
  outDir: "./dist/website",
  vite: {
    plugins: [glsl()],
  },
  integrations: [website({
    guideRoute: "/guide",
    examplesRoute: "/examples",
    guideContentDir: "content/guide",
    examplesContentDir: "examples"
  })],
});
