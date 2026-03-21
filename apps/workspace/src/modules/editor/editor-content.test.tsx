import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorContent } from "./editor-content";

const mocks = vi.hoisted(() => {
  const chain = {
    focus: vi.fn(),
    insertContent: vi.fn(),
    run: vi.fn(() => true),
    toggleOrderedList: vi.fn(),
    toggleBulletList: vi.fn(),
    insertTable: vi.fn(),
    insertTabs: vi.fn(),
  };

  chain.focus.mockReturnValue(chain);
  chain.insertContent.mockReturnValue(chain);
  chain.toggleOrderedList.mockReturnValue(chain);
  chain.toggleBulletList.mockReturnValue(chain);
  chain.insertTable.mockReturnValue(chain);
  chain.insertTabs.mockReturnValue(chain);

  return {
    chain,
    editor: {
      chain: vi.fn(() => chain),
      getJSON: vi.fn(() => ({ type: "doc", content: [] })),
    },
    uploadImageMock: vi.fn(),
  };
});

vi.mock("@tiptap/react", () => ({
  useEditor: () => mocks.editor,
  EditorContent: ({ className }: { className?: string }) => (
    <div data-testid="mock-tiptap-editor" className={className} />
  ),
}));

vi.mock("./get-editor-extensions", () => ({
  getEditorExtensions: () => [],
}));

vi.mock("./infrastructure/editor-assets-api", () => ({
  uploadWorkspaceEditorImageAsset: (...args: unknown[]) => mocks.uploadImageMock(...args),
}));

describe("EditorContent image upload", () => {
  beforeEach(() => {
    mocks.chain.insertContent.mockClear();
    mocks.uploadImageMock.mockReset();
  });

  it("uploads PNG/JPG images, shows thumbnail, and inserts GCP URL into image attrs", async () => {
    const user = userEvent.setup();
    const uploadedUrl = "https://storage.googleapis.com/emerald-assets/uploaded-image.png";

    mocks.uploadImageMock.mockResolvedValue({
      status: "success",
      data: { url: uploadedUrl },
    });

    render(
      <EditorContent
        uploadContext={{
          entityType: "document",
          entityId: "11111111-1111-4111-8111-111111111111",
          field: "content-image",
          maxFileSizeMb: 10,
        }}
      />,
    );

    await user.click(screen.getByTestId("editor-insert-image"));

    const fileInput = screen.getByTestId("editor-image-upload-input") as HTMLInputElement;
    const imageFile = new File([new Uint8Array([137, 80, 78, 71])], "example.png", {
      type: "image/png",
    });

    await user.upload(fileInput, imageFile);
    await user.click(screen.getByRole("button", { name: /^Upload$/i }));

    await waitFor(() => {
      expect(mocks.uploadImageMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.uploadImageMock).toHaveBeenCalledWith({
      entityType: "document",
      entityId: "11111111-1111-4111-8111-111111111111",
      field: "content-image",
      file: imageFile,
    });

    expect(screen.getByTestId("editor-image-upload-thumbnail")).toHaveAttribute("src", uploadedUrl);

    expect(mocks.chain.insertContent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "image",
        attrs: expect.objectContaining({
          src: uploadedUrl,
          assetId: uploadedUrl,
        }),
      }),
    );
  });

  it("rejects non-image MIME types with a user-facing error and skips upload", async () => {
    const user = userEvent.setup();

    render(<EditorContent />);

    await user.click(screen.getByTestId("editor-insert-image"));

    const fileInput = screen.getByTestId("editor-image-upload-input") as HTMLInputElement;
    const invalidFile = new File(["console.log('x')"], "not-image.js", {
      type: "application/javascript",
    });

    fireEvent.change(fileInput, {
      target: {
        files: [invalidFile],
      },
    });
    await user.click(screen.getByRole("button", { name: /^Upload$/i }));

    expect(screen.getByTestId("editor-image-upload-error")).toHaveTextContent(
      "Only PNG or JPG images are allowed.",
    );
    expect(mocks.uploadImageMock).not.toHaveBeenCalled();
    expect(mocks.chain.insertContent).not.toHaveBeenCalled();
  });

  it("rejects oversized files with a user-facing error and skips upload", async () => {
    const user = userEvent.setup();

    render(
      <EditorContent
        uploadContext={{
          entityType: "document",
          entityId: "22222222-2222-4222-8222-222222222222",
          field: "content-image",
          maxFileSizeMb: 1,
        }}
      />,
    );

    await user.click(screen.getByTestId("editor-insert-image"));

    const fileInput = screen.getByTestId("editor-image-upload-input") as HTMLInputElement;
    const oversizedFile = new File([new Uint8Array(1_048_577)], "oversized.png", {
      type: "image/png",
    });

    await user.upload(fileInput, oversizedFile);
    await user.click(screen.getByRole("button", { name: /^Upload$/i }));

    expect(screen.getByTestId("editor-image-upload-error")).toHaveTextContent(
      "Image exceeds the 1MB size limit.",
    );
    expect(mocks.uploadImageMock).not.toHaveBeenCalled();
    expect(mocks.chain.insertContent).not.toHaveBeenCalled();
  });
});
