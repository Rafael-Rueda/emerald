import Image from "@tiptap/extension-image";

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-asset-id") ?? "",
        renderHTML: (attributes: { assetId?: unknown }) => {
          if (typeof attributes.assetId !== "string" || attributes.assetId.length === 0) {
            return {};
          }

          return {
            "data-asset-id": attributes.assetId,
          };
        },
      },
      caption: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes: { caption?: unknown }) => {
          if (typeof attributes.caption !== "string" || attributes.caption.length === 0) {
            return {};
          }

          return {
            "data-caption": attributes.caption,
          };
        },
      },
    };
  },
});
