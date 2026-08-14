import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { readFileSync } from "node:fs";
import path from "node:path";
import { markdownPlugins } from "./website/plugins/markdown-satteri.js";

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
  srcDir: "./website",
  publicDir: "./assets",
  outDir: "./dist/website",
  vite: {
    plugins: [glsl()],
    resolve: {
      alias: {
        "chorama": path.resolve("./src/index.js"),
        "@configs": path.resolve("./website/config"),
        "@layouts": path.resolve("./website/layouts"),
        "@components": path.resolve("./website/components"),
      }
    }
  },
  markdown: {
    processor: satteri({
      features: {
        directive: true,
      },
      mdastPlugins: markdownPlugins,
    }),
  },
});
