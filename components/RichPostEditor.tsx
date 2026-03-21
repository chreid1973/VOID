"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import MentionAutocompleteMenu, {
  type MentionSuggestion,
} from "./MentionAutocompleteMenu";
import styles from "./RichPostEditor.module.css";

type RichPostEditorValue = {
  html: string;
  text: string;
};

type ActiveMention = {
  query: string;
  from: number;
  to: number;
};

function normalizeEditorHtml(html: string | null | undefined) {
  const normalized = html?.trim() ?? "";
  return normalized === "<p></p>" ? "" : normalized;
}

function getActiveMention(editor: Editor): ActiveMention | null {
  const { selection } = editor.state;

  if (!selection.empty) {
    return null;
  }

  const { $from, from } = selection;
  const beforeCursor = $from.parent.textBetween(0, $from.parentOffset, "\n", "\0");
  const match = /(^|[^a-z0-9_])@([a-z0-9_ ]{0,40})$/i.exec(beforeCursor);

  if (!match) {
    return null;
  }

  const query = match[2].trim();

  if (!query) {
    return null;
  }

  return {
    query,
    from: $from.start() + match.index + match[1].length,
    to: from,
  };
}

export default function RichPostEditor({
  value,
  disabled = false,
  placeholder,
  onChange,
  onActiveMentionQueryChange,
}: {
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (nextValue: RichPostEditorValue) => void;
  onActiveMentionQueryChange?: (query: string) => void;
}) {
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const activeMentionRef = useRef<ActiveMention | null>(null);
  const suggestionsRef = useRef<MentionSuggestion[]>([]);
  const highlightedIndexRef = useRef(0);

  function updateActiveMention(nextEditor: Editor) {
    const nextActiveMention = getActiveMention(nextEditor);
    activeMentionRef.current = nextActiveMention;
    setActiveMention(nextActiveMention);
  }

  function closeMentionMenu() {
    suggestionsRef.current = [];
    highlightedIndexRef.current = 0;
    setSuggestions([]);
    setHighlightedIndex(0);
    setLoadingSuggestions(false);
  }

  function selectSuggestion(suggestion: MentionSuggestion) {
    if (!editor || !activeMentionRef.current) {
      return;
    }

    const replacement = `@${suggestion.username} `;
    const nextSelection = activeMentionRef.current.from + replacement.length;

    editor
      .chain()
      .focus()
      .insertContentAt(
        {
          from: activeMentionRef.current.from,
          to: activeMentionRef.current.to,
        },
        replacement
      )
      .setTextSelection(nextSelection)
      .run();

    closeMentionMenu();
    updateActiveMention(editor);
  }

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
      updateActiveMention(nextEditor);
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      updateActiveMention(nextEditor);
    },
    editorProps: {
      handleKeyDown(_view, event) {
        const currentActiveMention = activeMentionRef.current;
        const currentSuggestions = suggestionsRef.current;

        if (!currentActiveMention?.query || currentSuggestions.length === 0) {
          return false;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          const nextIndex =
            (highlightedIndexRef.current + 1) % currentSuggestions.length;
          highlightedIndexRef.current = nextIndex;
          setHighlightedIndex(nextIndex);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          const nextIndex =
            highlightedIndexRef.current === 0
              ? currentSuggestions.length - 1
              : highlightedIndexRef.current - 1;
          highlightedIndexRef.current = nextIndex;
          setHighlightedIndex(nextIndex);
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          selectSuggestion(
            currentSuggestions[highlightedIndexRef.current] ?? currentSuggestions[0]
          );
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeMentionMenu();
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    activeMentionRef.current = activeMention;
  }, [activeMention]);

  useEffect(() => {
    onActiveMentionQueryChange?.(activeMention?.query ?? "");
  }, [activeMention?.query, onActiveMentionQueryChange]);

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    highlightedIndexRef.current = highlightedIndex;
  }, [highlightedIndex]);

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

  useEffect(() => {
    if (!activeMention?.query) {
      closeMentionMenu();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoadingSuggestions(true);

      try {
        const res = await fetch("/api/mentions/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: activeMention.query,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          suggestionsRef.current = [];
          highlightedIndexRef.current = 0;
          setSuggestions([]);
          setHighlightedIndex(0);
          return;
        }

        const nextSuggestions = Array.isArray(data?.users) ? data.users : [];
        suggestionsRef.current = nextSuggestions;
        highlightedIndexRef.current = 0;
        setSuggestions(nextSuggestions);
        setHighlightedIndex(0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        suggestionsRef.current = [];
        highlightedIndexRef.current = 0;
        setSuggestions([]);
        setHighlightedIndex(0);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeMention?.query]);

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
        <EditorContent
          editor={editor}
          onBlur={() => {
            window.setTimeout(() => {
              if (document.activeElement?.closest("[data-mention-menu]")) {
                return;
              }

              closeMentionMenu();
            }, 0);
          }}
        />
      </div>

      <div data-mention-menu>
        <MentionAutocompleteMenu
          loading={loadingSuggestions}
          query={activeMention?.query ?? ""}
          suggestions={suggestions}
          highlightedIndex={highlightedIndex}
          onSelect={selectSuggestion}
        />
      </div>
    </div>
  );
}
