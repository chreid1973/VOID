"use client";

import { useEffect } from "react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import styles from "./RichPostEditor.module.css";

type RichPostEditorValue = {
  html: string;
  text: string;
};

function normalizeEditorHtml(html: string | null | undefined) {
  const normalized = html?.trim() ?? "";
  return normalized === "<p></p>" ? "" : normalized;
}

export default function RichPostEditor({
  value,
  disabled = false,
  placeholder,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (nextValue: RichPostEditorValue) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        orderedList: false,
        strike: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizeEditorHtml(value),
    onUpdate: ({ editor: nextEditor }) => {
      onChange({
        html: normalizeEditorHtml(nextEditor.getHTML()),
        text: nextEditor.getText(),
      });
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = normalizeEditorHtml(value);
    const currentValue = normalizeEditorHtml(editor.getHTML());

    if (currentValue !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  function toggleLink() {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href as string | undefined;
    const nextHrefInput = window.prompt("Link URL", currentHref || "https://");

    if (nextHrefInput === null) {
      return;
    }

    const nextHref = nextHrefInput.trim();

    if (!nextHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const normalizedHref =
      /^[a-z][a-z0-9+.-]*:/i.test(nextHref) || nextHref.startsWith("#")
        ? nextHref
        : `https://${nextHref}`;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: normalizedHref,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      })
      .run();
  }

  const toolbarButtons = [
    {
      label: "Bold",
      active: editor?.isActive("bold") ?? false,
      onClick: () => editor?.chain().focus().toggleBold().run(),
      disabled: !(editor?.can().chain().focus().toggleBold().run() ?? false),
    },
    {
      label: "Italic",
      active: editor?.isActive("italic") ?? false,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      disabled: !(editor?.can().chain().focus().toggleItalic().run() ?? false),
    },
    {
      label: "Quote",
      active: editor?.isActive("blockquote") ?? false,
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      disabled: !(editor?.can().chain().focus().toggleBlockquote().run() ?? false),
    },
    {
      label: "List",
      active: editor?.isActive("bulletList") ?? false,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
      disabled: !(editor?.can().chain().focus().toggleBulletList().run() ?? false),
    },
    {
      label: "Code",
      active: editor?.isActive("code") ?? false,
      onClick: () => editor?.chain().focus().toggleCode().run(),
      disabled: !(editor?.can().chain().focus().toggleCode().run() ?? false),
    },
    {
      label: "Link",
      active: editor?.isActive("link") ?? false,
      onClick: toggleLink,
      disabled: !editor,
    },
  ];

  return (
    <div className={`${styles.wrapper}${disabled ? ` ${styles.disabled}` : ""}`}>
      <div className={styles.toolbar}>
        {toolbarButtons.map((button) => (
          <button
            key={button.label}
            type="button"
            disabled={disabled || button.disabled}
            className={`${styles.toolbarButton}${
              button.active ? ` ${styles.toolbarButtonActive}` : ""
            }`}
            onClick={button.onClick}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className={styles.editor}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
