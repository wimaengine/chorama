import { withBase } from "../utils/url";

const alertLabels = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

function rewriteBaseUrl(node, ctx) {
  if (typeof node.url === "string") {
    ctx.setProperty(node, "url", withBase(node.url));
  }
}

function createAlertNode(type, children) {
  return {
    type: "containerDirective",
    data: {
      hName: "div",
      hProperties: {
        className: ["markdown-alert", `markdown-alert-${type}`],
      },
    },
    children: [
      {
        type: "paragraph",
        data: {
          hProperties: {
            className: ["markdown-alert-title"],
          },
        },
        children: [{ type: "text", value: alertLabels[type] }],
      },
      ...children,
    ],
  };
}

export const markdownPlugins = [
  {
    name: "directive-alerts",
    containerDirective(node, ctx) {
      const type = typeof node.name === "string" ? node.name.toLowerCase() : "";
      if (!(type in alertLabels)) {
        return;
      }

      // Use Satteri's native directive node shape instead of raw HTML.
      ctx.replaceNode(node, createAlertNode(type, node.children ?? []));
    },
  },
  {
    name: "rewrite-base-urls",
    link: rewriteBaseUrl,
    image: rewriteBaseUrl,
  },
];
