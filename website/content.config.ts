import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const examplesRoot = path.resolve("./examples");

interface ExampleEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  filePath: string;
  source: string;
}

function toTitle(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function collectExampleFiles(dir: string, root: string): Promise<string[]> {
  const dirEntries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const dirEntry of dirEntries) {
    const fullPath = path.join(dir, dirEntry.name);
    const relativePath = path.relative(root, fullPath).split(path.sep).join("/");

    if (dirEntry.isDirectory()) {
      if (relativePath === "addons" || relativePath.startsWith("addons/")) {
        continue;
      }
      files.push(...(await collectExampleFiles(fullPath, root)));
      continue;
    }

    if (dirEntry.isFile() && dirEntry.name.endsWith(".js")) {
      files.push(path.relative(root, fullPath));
    }
  }

  return files;
}

const examples = defineCollection({
  loader: async (): Promise<ExampleEntry[]> => {
    const relativePaths = await collectExampleFiles(examplesRoot, examplesRoot);

    return Promise.all(
      relativePaths.map(async (relativePath) => {
        const normalizedPath = relativePath.split(path.sep).join("/");
        const id = normalizedPath.replace(/\.js$/, "");
        const segments = id.split("/");
        const category = segments[0] || "uncategorized";
        const fileName = segments.at(-1) || "example";

        return {
          id,
          title: toTitle(fileName),
          description: `${toTitle(category)} example`,
          category,
          filePath: `/examples/${normalizedPath}`,
          source: await readFile(path.join(examplesRoot, relativePath), "utf-8")
        };
      })
    );
  },
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    filePath: z.string(),
    source: z.string()
  })
});

const guide = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./content/guide",
    deferRender: true
  }),
  schema: z.object({
    title: z.string()
  })
});

export const collections = {
  examples,
  guide
};
