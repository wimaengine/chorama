import { getCollection, render } from "astro:content";
import { getHeadings as getReadmeHeadings } from "../../README.md";
import { rawContent as getGuideIndexRawContent } from "../../content/guide/index.md";
import { withBase } from "../utils/url";

export interface NavTab {
  label: string;
  href?: string;
  children?: NavTab[];
}

interface HeadingLike {
  depth: number;
  slug: string;
  text: string;
}

interface GuideCollectionEntry {
  id: string;
  slug?: string;
  data: {
    title: string;
  };
}

interface ReadingOrderEntry {
  href: string;
  order: number;
  sourceOrder: number;
}

interface OrderedGuideEntry {
  entry: GuideCollectionEntry;
  index: number;
  route: string;
}

interface NavNode extends NavTab {
  depth: number;
  children: NavNode[];
}

function cleanLabel(value: string): string {
  return value.replace(/^\s*\d+[.)-]?\s+/, "").trim();
}

function getPageLabel(headings: HeadingLike[], preferredDepth: number, fallback: string): string {
  const preferredHeading = headings.find((heading) => heading.depth === preferredDepth);
  const fallbackHeading = headings[0];
  return cleanLabel(preferredHeading?.text ?? fallbackHeading?.text ?? fallback);
}

function toNavTab(node: NavNode): NavTab {
  const children = node.children.map(toNavTab);

  return children.length > 0
    ? {
        label: node.label,
        href: node.href,
        children
      }
    : {
        label: node.label,
        href: node.href
      };
}

function buildHeadingTree(headings: HeadingLike[], basePath: string): NavTab[] {
  const roots: NavNode[] = [];
  const stack: NavNode[] = [];

  for (const heading of headings) {
    const node: NavNode = {
      depth: heading.depth,
      label: cleanLabel(heading.text),
      href: withBase(`${basePath}#${heading.slug}`),
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots.map(toNavTab);
}

function buildPageTab(
  headings: HeadingLike[],
  basePath: string,
  options: {
    fallback: string;
    preferredDepth?: number;
    trimMatchingFirstChild?: boolean;
  }
): NavTab {
  const preferredDepth = options.preferredDepth ?? 1;
  const label = getPageLabel(headings, preferredDepth, options.fallback);
  const children = buildHeadingTree(headings.filter((heading) => heading.depth > 1), basePath);

  if (options.trimMatchingFirstChild && children[0]?.label === label) {
    children.shift();
  }

  return children.length > 0
    ? {
        label,
        href: withBase(basePath),
        children
      }
    : {
        label,
        href: withBase(basePath)
      };
}

function parseReadingOrder(raw: string): ReadingOrderEntry[] {
  const entries: ReadingOrderEntry[] = [];
  const lines = raw.split(/\r?\n/);
  let inReadingOrder = false;
  let sourceOrder = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      const headingText = cleanLabel(headingMatch[1].trim());
      if (inReadingOrder && headingText !== "Reading Order") {
        break;
      }

      inReadingOrder = headingText === "Reading Order";
      continue;
    }

    if (!inReadingOrder) {
      continue;
    }

    const itemMatch = line.match(/^\s*(\d+)\.\s+\[(.+?)\]\((.+?)\)\s*$/);
    if (!itemMatch) {
      continue;
    }

    const [, order, , href] = itemMatch;
    entries.push({
      href: href.replace(/\/+$/, ""),
      order: Number.parseInt(order, 10) || sourceOrder,
      sourceOrder
    });
    sourceOrder += 1;
  }

  return entries.sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder);
}

function getGuideRoute(entry: { id: string; slug?: string }): string {
  const raw = entry.slug ?? entry.id;
  const cleaned = raw.replace(/\.md$/, "");
  return cleaned === "index" ? "/guide" : `/guide/${cleaned}`;
}

const readmeHeadings = getReadmeHeadings() as HeadingLike[];
const guideIndexRaw = getGuideIndexRawContent();
const readingOrder = parseReadingOrder(guideIndexRaw);

const guideEntries = (await getCollection("guide")) as GuideCollectionEntry[];
const guideIndexEntry = guideEntries.find((entry: GuideCollectionEntry) => getGuideRoute(entry) === "/guide");

if (!guideIndexEntry) {
  throw new Error("Missing guide index entry");
}

const guideIndexRendered = await render(guideIndexEntry);
const guideIndexHeadings = guideIndexRendered.headings as HeadingLike[];

const readingOrderIndex = new Map<string, number>(
  readingOrder.map((entry, index) => [entry.href.replace(/\/+$/, ""), index])
);

const guideChapters: OrderedGuideEntry[] = guideEntries
  .filter((entry: GuideCollectionEntry) => getGuideRoute(entry) !== "/guide")
  .map((entry: GuideCollectionEntry, index: number) => ({
    entry,
    index,
    route: getGuideRoute(entry)
  }))
  .sort((a: OrderedGuideEntry, b: OrderedGuideEntry) => {
    const aOrder = readingOrderIndex.get(a.route) ?? a.index;
    const bOrder = readingOrderIndex.get(b.route) ?? b.index;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.route.localeCompare(b.route);
  });

const sidebarTabs: NavTab[] = [
  {
    label: "Introduction",
    children: buildHeadingTree(readmeHeadings.filter((heading) => heading.depth > 1), "/")
  },
  {
    label: "Guide",
    children: [
      buildPageTab(guideIndexHeadings, "/guide", {
        fallback: "Guide",
        preferredDepth: 2,
        trimMatchingFirstChild: true
      }),
      ...await Promise.all(
        guideChapters.map(async ({ entry, route }: OrderedGuideEntry) => {
          const rendered = await render(entry);
          const headings = rendered.headings as HeadingLike[];
          const label = getPageLabel(headings, 1, entry.data.title);

          return buildPageTab(headings, route, {
            fallback: label,
            preferredDepth: 1
          });
        })
      )
    ]
  },
  {
    label: "Examples",
    href: withBase("/examples")
  }
];

export { sidebarTabs };
