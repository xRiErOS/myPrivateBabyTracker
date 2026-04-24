/** Minimal Markdown renderer — no dependencies.

Supports:
- **bold** and *italic*
- `inline code`
- ```code blocks```
- # Headings (h1-h3)
- - / * Unordered lists
- [ ] / [x] Task lists (checkboxes, read-only)
- Blank line = paragraph break

Does NOT support: tables, HTML, links, images.
*/

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let result = escapeHtml(text);
  // Bold **text**
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code `code`
  result = result.replace(/`([^`]+)`/g, '<code class="bg-surface1 px-1 rounded text-xs font-mono">$1</code>');
  return result;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let inList = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      if (inList) { html.push("</ul>"); inList = false; }
      if (inCodeBlock) {
        html.push("</code></pre>");
        inCodeBlock = false;
      } else {
        html.push('<pre class="bg-surface1 rounded-lg p-3 my-2 overflow-x-auto"><code class="font-mono text-xs text-text">');
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(line) + "\n");
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="font-label text-sm font-semibold text-text mt-3 mb-1">${renderInline(h3[1])}</h3>`);
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 class="font-label text-base font-semibold text-text mt-3 mb-1">${renderInline(h2[1])}</h2>`);
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1 class="font-label text-lg font-bold text-text mt-3 mb-1">${renderInline(h1[1])}</h1>`);
      i++;
      continue;
    }

    // Task list item [ ] / [x]
    const taskItem = line.match(/^[\s]*[-*]\s+\[( |x|X)\]\s+(.+)/);
    if (taskItem) {
      if (!inList) { html.push('<ul class="space-y-1 my-1">'); inList = true; }
      const checked = taskItem[1].toLowerCase() === "x";
      html.push(
        `<li class="flex items-start gap-2 text-sm">` +
        `<input type="checkbox" ${checked ? "checked" : ""} disabled class="mt-0.5 shrink-0" />` +
        `<span class="${checked ? "line-through text-subtext0" : "text-text"}">${renderInline(taskItem[2])}</span>` +
        `</li>`
      );
      i++;
      continue;
    }

    // List item
    const listItem = line.match(/^[\s]*[-*]\s+(.+)/);
    if (listItem) {
      if (!inList) { html.push('<ul class="list-disc list-inside space-y-0.5 my-1 text-sm text-text">'); inList = true; }
      html.push(`<li>${renderInline(listItem[1])}</li>`);
      i++;
      continue;
    }

    // End list on non-list line
    if (inList && !line.match(/^[\s]*[-*]/)) {
      html.push("</ul>");
      inList = false;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      html.push('<div class="h-2"></div>');
      i++;
      continue;
    }

    // Paragraph
    html.push(`<p class="text-sm text-text leading-relaxed">${renderInline(line)}</p>`);
    i++;
  }

  if (inList) html.push("</ul>");
  if (inCodeBlock) html.push("</code></pre>");

  return html.join("");
}
