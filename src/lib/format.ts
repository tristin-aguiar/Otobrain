// Converts between the plain-text formats used in the editor forms and the
// structured values stored in the database. Kept deliberately simple so
// content can be typed or pasted without learning any special tools.

export type Section = { title: string; lines: string[] };
export type Block = { title: string; body: string };
export type QA = { q: string; a: string };

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// One item per line; blank lines and leading "- " or "1. " are dropped.
export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}
export const linesToText = (v: string[] | null | undefined) => (v || []).join("\n");

// "## Heading" starts a section; the lines under it are its bullet points.
export function parseSections(text: string): Section[] {
  const out: Section[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) out.push({ title: h[1].trim(), lines: [] });
    else {
      const text = line.replace(/^(?:[-*•]|\d+[.)])\s*/, "").trim();
      // Skip empty template prompts such as "- " or "- Imaging: ".
      if (!text || /:$/.test(text)) continue;
      if (!out.length) out.push({ title: "Notes", lines: [] });
      out[out.length - 1].lines.push(text);
    }
  }
  return out;
}
export const sectionsToText = (v: Section[] | null | undefined) =>
  (v || []).map((s) => `## ${s.title}\n${s.lines.map((l) => `- ${l}`).join("\n")}`).join("\n\n");

// "## Heading" then free text paragraphs.
export function parseBlocks(text: string): Block[] {
  return parseSections(text).map((s) => ({ title: s.title, body: s.lines.join("\n") }));
}
export const blocksToText = (v: Block[] | null | undefined) => (v || []).map((b) => `## ${b.title}\n${b.body}`).join("\n\n");

// Lines starting "Q:" and "A:".
export function parseQA(text: string): QA[] {
  const out: QA[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const q = line.match(/^Q[:.)]\s*(.*)$/i);
    const a = line.match(/^A[:.)]\s*(.*)$/i);
    if (q) out.push({ q: q[1], a: "" });
    else if (a && out.length) out[out.length - 1].a = (out[out.length - 1].a + " " + a[1]).trim();
    else if (line && out.length) {
      const last = out[out.length - 1];
      if (last.a) last.a += " " + line;
      else last.q += " " + line;
    }
  }
  return out.filter((x) => x.q);
}
export const qaToText = (v: QA[] | null | undefined) => (v || []).map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n");

// Pipe-separated rows, e.g. "Name | 2019 | Takeaway | https://…".
export function parseRows(text: string, keys: string[]): Record<string, string>[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("|").map((p) => p.trim());
      const row: Record<string, string> = {};
      keys.forEach((k, i) => (row[k] = parts[i] || ""));
      return row;
    });
}
export const rowsToText = (v: Record<string, string>[] | null | undefined, keys: string[]) =>
  (v || []).map((r) => keys.map((k) => r[k] || "").join(" | ").replace(/(\s\|\s)+$/, "")).join("\n");

// Minimal, safe Markdown for posts: ## headings, - bullets, paragraphs,
// **bold** and [links](https://…). Returns plain data; React renders it.
export type MdNode =
  | { t: "h2" | "h3" | "p"; text: string }
  | { t: "ul"; items: string[] };
export function parseMarkdown(md: string): MdNode[] {
  const out: MdNode[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("### ")) { flush(); out.push({ t: "h3", text: line.slice(4) }); continue; }
    if (line.startsWith("## ") || line.startsWith("# ")) { flush(); out.push({ t: "h2", text: line.replace(/^#+\s/, "") }); continue; }
    const b = line.match(/^[-*]\s+(.*)$/);
    if (b) {
      flush();
      const last = out[out.length - 1];
      if (last && last.t === "ul") last.items.push(b[1]);
      else out.push({ t: "ul", items: [b[1]] });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}

export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!d) return "";
  const date = d.length === 10 ? new Date(d + "T00:00:00Z") : new Date(d);
  return date.toLocaleDateString("en-US", { ...opts, timeZone: d.length === 10 ? "UTC" : "America/Chicago" });
}

// The post author schedules in US Central time; these handle daylight saving.
function centralOffsetMinutes(d: Date) {
  const s = d.toLocaleString("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" });
  const m = s.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] || 0) : -360;
}
export function centralToISO(local: string) {
  const asUtc = new Date(local + ":00Z");
  return new Date(asUtc.getTime() - centralOffsetMinutes(asUtc) * 60000).toISOString();
}
export function isoToCentralLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() + centralOffsetMinutes(d) * 60000).toISOString().slice(0, 16);
}
