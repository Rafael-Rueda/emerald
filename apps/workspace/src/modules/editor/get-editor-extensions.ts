import type { AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Heading from "@tiptap/extension-heading";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { all, createLowlight } from "lowlight";
import { Callout, CustomImage, TabItem, Tabs } from "./extensions";

const lowlight = createLowlight(all);

export const SUPPORTED_LANGUAGES = lowlight.listLanguages().sort();

export function getEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing your document...",
    }),
    Heading.configure({
      levels: [1, 2, 3, 4],
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
    }),
    CustomImage,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    Tabs,
    TabItem,
  ];
}
