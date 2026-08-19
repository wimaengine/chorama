import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { exports as resolveExports, legacy as resolveLegacy } from "resolve.exports";
import { withBase } from "./url";

type PackageManifest = {
  version?: string;
  main?: string;
  module?: string;
  browser?: string;
  exports?: unknown;
  type?: string;
  jsdelivr?: string;
  unpkg?: string;
};

const nodeModulesRoot = path.resolve("./node_modules");
const rootPackageJson = JSON.parse(
  readFileSync(path.resolve("./package.json"), "utf8"),
) as {
  name?: string;
  main?: string;
  module?: string;
  exports?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const currentPackageName = rootPackageJson.name ?? "chorama";
const packageManifestCache = new Map<string, PackageManifest>();
const packageEntryCache = new Map<string, string | undefined>();
const packageImportsCache = new Map<boolean, Record<string, string>>();

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeEntryPath(entry: string): string {
  return path.posix.normalize(toPosixPath(entry).replace(/^\.\/+/, ""));
}

function readPackageManifest(packageName: string): PackageManifest {
  const cached = packageManifestCache.get(packageName);
  if (cached) {
    return cached;
  }

  const manifestPath = path.join(nodeModulesRoot, packageName, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing package.json for ${packageName} at ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
  packageManifestCache.set(packageName, manifest);
  return manifest;
}

function normalizeResolvedEntry(entry: unknown): string | undefined {
  if (typeof entry === "string") {
    const normalized = normalizeEntryPath(entry);
    return normalized === "." ? undefined : normalized;
  }

  if (Array.isArray(entry)) {
    for (const item of entry) {
      const resolved = normalizeResolvedEntry(item);
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function hasEsmSyntax(filePath: string): boolean {
  try {
    const source = readFileSync(filePath, "utf8");
    return (
      /^\s*(?:import|export)\s/m.test(source) ||
      /\bexport\s*\{/.test(source)
    );
  } catch {
    return false;
  }
}

function isModuleLikeFile(manifest: PackageManifest, filePath: string): boolean {
  return manifest.type === "module" || path.extname(filePath) === ".mjs" || hasEsmSyntax(filePath);
}

function resolveExportsEntry(manifest: PackageManifest): string | undefined {
  try {
    return normalizeResolvedEntry(resolveExports(manifest, ".", { browser: true }));
  } catch {
    return undefined;
  }
}

function resolveLegacyEntry(manifest: PackageManifest): string | undefined {
  try {
    return normalizeResolvedEntry(
      resolveLegacy(manifest, { browser: true, fields: ["module", "main"] }),
    );
  } catch {
    return undefined;
  }
}

function resolveCurrentPackageEntry(): string | undefined {
  return resolveExportsEntry(rootPackageJson) ?? resolveLegacyEntry(rootPackageJson);
}

function findFirstEsmFile(directory: string): string | undefined {
  if (!existsSync(directory)) {
    return undefined;
  }

  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = findFirstEsmFile(entryPath);
      if (nested) {
        return nested;
      }
      continue;
    }

    if (!entry.isFile() || !/\.(mjs|js)$/i.test(entry.name)) {
      continue;
    }

    if (hasEsmSyntax(entryPath)) {
      return entryPath;
    }
  }

  return undefined;
}

function findSourceEntry(packageName: string, packageDir: string, manifest: PackageManifest): string | undefined {
  const sourceDir = path.join(packageDir, "src");
  if (!existsSync(sourceDir)) {
    return undefined;
  }

  const packageBaseName = (packageName.split("/").pop() ?? packageName).split(/[^a-zA-Z0-9]+/)[0];
  const candidateNames = [
    "index.js",
    "index.mjs",
    `${packageBaseName}.js`,
    `${packageBaseName}.mjs`,
    `${packageBaseName.charAt(0).toUpperCase()}${packageBaseName.slice(1)}.js`,
    `${packageBaseName.charAt(0).toUpperCase()}${packageBaseName.slice(1)}.mjs`,
  ];

  for (const candidateName of candidateNames) {
    const candidatePath = path.join(sourceDir, candidateName);
    if (!existsSync(candidatePath)) {
      continue;
    }

    if (isModuleLikeFile(manifest, candidatePath)) {
      return normalizeEntryPath(path.relative(packageDir, candidatePath));
    }
  }

  const fallback = findFirstEsmFile(sourceDir);
  if (fallback) {
    return normalizeEntryPath(path.relative(packageDir, fallback));
  }

  return undefined;
}

function resolvePackageEntry(packageName: string): string | undefined {
  const cached = packageEntryCache.get(packageName);
  if (cached !== undefined) {
    return cached;
  }

  const packageDir = path.join(nodeModulesRoot, packageName);
  const manifest = readPackageManifest(packageName);

  const exportEntry = resolveExportsEntry(manifest);
  if (exportEntry) {
    packageEntryCache.set(packageName, exportEntry);
    return exportEntry;
  }

  const legacyEntry = resolveLegacyEntry(manifest);
  if (legacyEntry) {
    const legacyPath = path.join(packageDir, legacyEntry);
    if (existsSync(legacyPath) && isModuleLikeFile(manifest, legacyPath)) {
      packageEntryCache.set(packageName, legacyEntry);
      return legacyEntry;
    }
  }

  const sourceEntry = findSourceEntry(packageName, packageDir, manifest);
  if (sourceEntry) {
    packageEntryCache.set(packageName, sourceEntry);
    return sourceEntry;
  }

  if (legacyEntry) {
    packageEntryCache.set(packageName, legacyEntry);
    return legacyEntry;
  }

  packageEntryCache.set(packageName, undefined);
  return undefined;
}

function collectPackageNames(): string[] {
  return [
    ...new Set([
      ...Object.keys(rootPackageJson.dependencies ?? {}),
      ...Object.keys(rootPackageJson.devDependencies ?? {}),
    ]),
  ].sort((a, b) => a.localeCompare(b));
}

function buildPackageUrl(packageName: string, version: string, entry: string, isProd: boolean): string {
  if (isProd) {
    return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${entry}`;
  }

  return path.posix.join("/node_modules", packageName, entry);
}

function buildCurrentPackageUrl(isProd: boolean, entry: string | undefined): string {
  if (!isProd) {
    return withBase("/src/index.js");
  }

  if (!entry) {
    throw new Error(`Unable to resolve the ${currentPackageName} package entry from package.json`);
  }

  return withBase(`/${entry}`);
}

export function buildImportMap(
  isProd: boolean,
): string {
  const importMap = JSON.stringify({
    imports: {
      ...getPackageImports(isProd),
    },
  });
  return importMap;
}

export function getPackageImports(isProd: boolean): Record<string, string> {
  const cached = packageImportsCache.get(isProd);
  if (cached) {
    return cached;
  }

  const imports: Record<string, string> = {};
  imports[currentPackageName] = buildCurrentPackageUrl(isProd, resolveCurrentPackageEntry());

  for (const packageName of collectPackageNames()) {
    const manifest = readPackageManifest(packageName);
    const entry = resolvePackageEntry(packageName);

    if (!entry) {
      continue;
    }

    const version = manifest.version ?? "latest";
    imports[packageName] = buildPackageUrl(packageName, version, entry, isProd);
  }

  packageImportsCache.set(isProd, imports);
  return imports;
}
