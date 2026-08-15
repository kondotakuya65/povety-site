"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string, text: string) => void;
};

function ToolButton({
  label,
  title,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition disabled:opacity-35 ${
        active ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-soft hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Share your story here…",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "rich-editor-content min-h-52 px-4 py-4 text-ink outline-none",
        "aria-label": "Your story",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML(), current.getText({ blockSeparator: "\n" }));
    },
  });

  if (!editor) {
    return <div className="min-h-64 animate-pulse rounded-xl border border-line bg-brand-mist" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
      <div className="flex flex-wrap gap-1 border-b border-line bg-brand-mist/70 p-2">
        <ToolButton
          label="P"
          title="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolButton
          label="H2"
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolButton
          label="B"
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label="I"
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <span className="mx-1 w-px bg-line" aria-hidden />
        <ToolButton
          label="• List"
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="1. List"
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolButton
          label="❝"
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <span className="mx-1 w-px bg-line" aria-hidden />
        <ToolButton
          label="↶"
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolButton
          label="↷"
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
