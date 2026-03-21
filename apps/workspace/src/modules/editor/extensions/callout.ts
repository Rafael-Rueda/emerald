import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutTone = "info" | "warn" | "danger" | "success";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (tone?: CalloutTone) => ReturnType;
      toggleCallout: (tone?: CalloutTone) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

const VALID_TONES: readonly CalloutTone[] = ["info", "warn", "danger", "success"];

function normalizeTone(tone: unknown): CalloutTone {
  if (typeof tone !== "string") {
    return "info";
  }

  return (VALID_TONES as readonly string[]).includes(tone) ? (tone as CalloutTone) : "info";
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info",
        parseHTML: (element: HTMLElement) => normalizeTone(element.getAttribute("data-callout-tone")),
        renderHTML: (attributes: { tone?: unknown }) => ({
          "data-callout-tone": normalizeTone(attributes.tone),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout-tone]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          class: "editor-callout",
        },
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (tone = "info") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone: normalizeTone(tone) }),
      toggleCallout:
        (tone = "info") =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tone: normalizeTone(tone) }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
