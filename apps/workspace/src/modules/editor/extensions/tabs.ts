import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tabs: {
      insertTabs: () => ReturnType;
    };
  }
}

export const TabItem = Node.create({
  name: "tabItem",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      label: {
        default: "Tab",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-tab-label") ?? "Tab",
        renderHTML: (attributes: { label?: unknown }) => ({
          "data-tab-label": typeof attributes.label === "string" ? attributes.label : "Tab",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-tab-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-tab-item": "true",
          class: "editor-tab-item",
        },
        HTMLAttributes,
      ),
      0,
    ];
  },
});

export const Tabs = Node.create({
  name: "tabs",
  group: "block",
  content: "tabItem+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-tabs]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-tabs": "true",
          class: "editor-tabs",
        },
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      insertTabs:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              {
                type: "tabItem",
                attrs: { label: "Tab 1" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Tab 1 content" }],
                  },
                ],
              },
              {
                type: "tabItem",
                attrs: { label: "Tab 2" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Tab 2 content" }],
                  },
                ],
              },
            ],
          }),
    };
  },
});
