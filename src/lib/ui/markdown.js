/** Markdown + HTML — delega en ISAFront.mdToHtml cuando existe (misma convención que isa-patyia). */

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTableRow(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.startsWith("|")) return null;
  let inner = trimmed;
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  inner = inner.slice(1);
  return inner.split("|").map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return Array.isArray(cells) && cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function preprocessGfmTables(src) {
  const lines = String(src ?? "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i])) {
      const block = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        block.push(lines[i]);
        i += 1;
      }
      const sep = parseTableRow(block[1]);
      if (block.length >= 2 && isSeparatorRow(sep)) {
        const header = parseTableRow(block[0]);
        const aligns = sep.map((c) => {
          const left = c.startsWith(":");
          const right = c.endsWith(":");
          if (left && right) return "center";
          if (right) return "right";
          return "left";
        });
        let html = "<table><thead><tr>";
        header.forEach((cell, idx) => {
          html += `<th style="text-align:${aligns[idx] || "left"}">${escHtml(cell)}</th>`;
        });
        html += "</tr></thead><tbody>";
        for (let r = 2; r < block.length; r += 1) {
          const row = parseTableRow(block[r]);
          if (!row) break;
          html += "<tr>";
          row.forEach((cell, idx) => {
            html += `<td style="text-align:${aligns[idx] || "left"}">${escHtml(cell)}</td>`;
          });
          html += "</tr>";
        }
        html += "</tbody></table>";
        out.push(html);
      } else {
        out.push(...block);
      }
      continue;
    }
    out.push(lines[i]);
    i += 1;
  }
  return out.join("\n");
}

function wrapTables(html) {
  return String(html)
    .replace(/<table(\s|>)/g, '<div class="md-table-wrap"><table$1')
    .replace(/<\/table>/g, "</table></div>");
}

export function renderMarkdown(md) {
  if (!md) return "";
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  if (typeof g?.ISAFront?.mdToHtml === "function") {
    return g.ISAFront.mdToHtml(md);
  }
  try {
    if (typeof marked !== "undefined" && marked.parse) {
      const prepared = preprocessGfmTables(md);
      const html = marked.parse(String(prepared), { gfm: true, breaks: false });
      return wrapTables(html);
    }
  } catch {
    /* fallback */
  }
  return (
    '<pre class="isa-sw-doc-fallback">' +
    escHtml(md) +
    "</pre>"
  );
}
