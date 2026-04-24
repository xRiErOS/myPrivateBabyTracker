/** CodeMirror 6 WYSIWYG Markdown Editor — single pane, live syntax highlighting.

No split view. Markdown source stored as-is, formatted on-screen via CodeMirror.
Ctrl+B = Bold, Ctrl+I = Italic.
Theme: Catppuccin Latte (light) / Macchiato (dark) via CSS variable awareness.
*/

import { useCallback, useEffect, useRef } from "react";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState, EditorSelection, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { renderMarkdown, toggleCheckbox } from "../lib/markdown";

// ---------------------------------------------------------------------------
// Catppuccin theme for CodeMirror
// ---------------------------------------------------------------------------

/** Build a CodeMirror theme using Catppuccin CSS variables.
 *  Uses literal fallback values matching Catppuccin Latte.
 */
const catppuccinTheme = EditorView.theme(
  {
    "&": {
      color: "var(--color-text, #4c4f69)",
      backgroundColor: "var(--color-surface1, #ccd0da)",
      fontSize: "16px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    ".cm-content": {
      caretColor: "var(--color-peach, #fe640b)",
      padding: "10px 12px",
      lineHeight: "1.6",
      minHeight: "80px",
    },
    ".cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--color-peach, #fe640b)20",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--color-peach, #fe640b)",
    },
    ".cm-line": {
      padding: "0",
    },
    // Markdown syntax highlighting via Catppuccin
    ".cm-strong": { fontWeight: "bold", color: "var(--color-text, #4c4f69)" },
    ".cm-emphasis": { fontStyle: "italic", color: "var(--color-text, #4c4f69)" },
    ".cm-monospace": { fontFamily: "monospace", color: "var(--color-green, #40a02b)" },
    ".cm-link": { color: "var(--color-blue, #1e66f5)" },
    ".cm-url": { color: "var(--color-sapphire, #209fb5)" },
    ".cm-header-1, .cm-header-2, .cm-header-3": {
      fontWeight: "bold",
      color: "var(--color-mauve, #8839ef)",
    },
    ".cm-quote": { color: "var(--color-subtext0, #6c6f85)" },
    ".cm-meta": { color: "var(--color-overlay0, #9ca0b0)" },
    ".cm-atom": { color: "var(--color-green, #40a02b)" },
    // Faint styling for markdown markup characters (**, *, #, etc.)
    ".cm-formatting": { color: "var(--color-overlay0, #9ca0b0)" },
    "&.cm-focused": { outline: "2px solid var(--color-peach, #fe640b)50" },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: false },
);

// ---------------------------------------------------------------------------
// Bold / Italic helpers operating on CodeMirror transaction
// ---------------------------------------------------------------------------

function wrapSelection(view: EditorView, marker: string): boolean {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to);
    if (selected) {
      const replacement = `${marker}${selected}${marker}`;
      return {
        changes: { from: range.from, to: range.to, insert: replacement },
        range: EditorSelection.range(range.from, range.from + replacement.length),
      };
    }
    // No selection: insert markers and place cursor between
    const replacement = `${marker}${marker}`;
    const insertPos = range.from + marker.length;
    return {
      changes: { from: range.from, insert: replacement },
      range: EditorSelection.cursor(insertPos),
    };
  });
  view.dispatch(changes);
  return true;
}

// ---------------------------------------------------------------------------
// Main editor component
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Details (Markdown wird unterstützt)\n\n**fett**, *kursiv*, `code`\n- [ ] Aufgabe\n- [x] Erledigt",
  rows = 6,
  disabled = false,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Track last external value to avoid re-setting when we own the change
  const lastValueRef = useRef(value);
  // Compartment to toggle editable without rebuilding
  const editableCompartment = useRef(new Compartment());

  // Build editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const boldCmd = {
      key: "Mod-b",
      run: (v: EditorView) => wrapSelection(v, "**"),
    };
    const italicCmd = {
      key: "Mod-i",
      run: (v: EditorView) => wrapSelection(v, "*"),
    };

    const startState = EditorState.create({
      doc: value,
      extensions: [
        history(),
        markdown(),
        catppuccinTheme,
        cmPlaceholder(placeholder),
        keymap.of([boldCmd, italicCmd, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newVal = update.state.doc.toString();
            lastValueRef.current = newVal;
            onChange(newVal);
          }
        }),
        editableCompartment.current.of(EditorView.editable.of(!disabled)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });
    viewRef.current = view;

    // Set min-height based on rows
    const lineHeight = 26; // approximate
    view.dom.style.minHeight = `${rows * lineHeight}px`;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Sync external value changes into CodeMirror (e.g. form reset)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value && lastValueRef.current !== value) {
      // External change — replace the whole document
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      lastValueRef.current = value;
    }
  }, [value]);

  // Sync disabled state via compartment reconfiguration
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);

  return (
    <div
      className="rounded-xl border border-surface2 overflow-hidden bg-surface1"
      ref={containerRef}
    />
  );
}

// ---------------------------------------------------------------------------
// MarkdownDisplay — read-only renderer, unchanged from previous implementation
// ---------------------------------------------------------------------------

/** Markdown renderer for display in lists/detail views.
 *  When `onContentChange` is provided, checkboxes are interactive (click to toggle).
 */
export function MarkdownDisplay({
  content,
  onContentChange,
}: {
  content: string | null;
  onContentChange?: (updated: string) => void;
}) {
  if (!content) return null;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && target.getAttribute("type") === "checkbox") {
        e.preventDefault();
        const lineIndex = parseInt(target.getAttribute("data-line") ?? "-1", 10);
        if (lineIndex >= 0 && content && onContentChange) {
          onContentChange(toggleCheckbox(content, lineIndex));
        }
      }
    },
    [content, onContentChange],
  );

  return (
    <div
      className="prose-like"
      onClick={onContentChange ? handleClick : undefined}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
