import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { website } from "wima-docs-website-template";
import { getReflectionKindSlug } from "wima-docs-website-template/utils/typedoc";

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
    apiRoute: "/api",
    sourceBranch: "main",
    introContentPath: "README.md",
    guideContentDir: "content/guide",
    examplesContentDir: "examples",
    apiSourceDir: "src",
    apiEntryRoute: (entryPath, reflection) => {
      const packageName = entryPath.split("/")[0] || "root";
      const kind = getReflectionKindSlug(reflection.kind);
      return `${packageName}/${kind}-${reflection.name}`;
    }
  })],
});
