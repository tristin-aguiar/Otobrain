// Parses pasted consult guides into the guide fields and applies the house
// style. Used in the browser (for the preview) and on the server (when saving),
// so both always agree.

export type GuideField =
  | "consult_question" | "red_flags" | "focused_history" | "focused_exam" | "workup"
  | "differential" | "initial_management" | "escalation_management" | "disposition"
  | "call_attending" | "pearls_pitfalls" | "deeper_reading" | "bring" | "linked_procedures";

export const FIELD_ORDER: { key: GuideField; label: string; aliases: string[]; kind: "rich" | "text" | "list" }[] = [
  { key: "consult_question", label: "1. Consult question", aliases: ["consult question", "the consult question", "question", "the ask"], kind: "text" },
  { key: "red_flags", label: "2. Triage and red flags", aliases: ["triage and red flags", "triage & red flags", "triage", "red flags", "triage red flags"], kind: "rich" },
  { key: "focused_history", label: "3. Focused history", aliases: ["focused history", "history"], kind: "rich" },
  { key: "focused_exam", label: "4. Focused exam", aliases: ["focused exam", "focused physical exam", "exam", "physical exam", "examination"], kind: "rich" },
  { key: "workup", label: "5. Workup", aliases: ["workup", "work-up", "work up", "diagnostic workup", "diagnostics"], kind: "rich" },
  { key: "differential", label: "6. Differential diagnosis", aliases: ["differential diagnosis", "differential", "ddx"], kind: "rich" },
  { key: "initial_management", label: "7. Initial management", aliases: ["initial management"], kind: "rich" },
  { key: "escalation_management", label: "8. Definitive / escalation management", aliases: ["definitive / escalation management", "definitive/escalation management", "definitive and escalation management", "definitive management", "escalation management", "escalation"], kind: "rich" },
  { key: "disposition", label: "9. Disposition and follow-up", aliases: ["disposition and follow-up", "disposition and follow up", "disposition & follow-up", "disposition", "follow-up", "follow up"], kind: "rich" },
  { key: "call_attending", label: "10. When to call the attending", aliases: ["when to call the attending", "when to call attending", "when to call your attending", "call the attending"], kind: "rich" },
  { key: "pearls_pitfalls", label: "11. Pearls and pitfalls", aliases: ["pearls and pitfalls", "pearls & pitfalls", "pearls/pitfalls"], kind: "rich" },
  { key: "deeper_reading", label: "12. Key references", aliases: ["key references", "references", "references and citations", "citations", "sources", "deeper reading", "further reading"], kind: "rich" },
  { key: "bring", label: "Recommended equipment", aliases: ["recommended equipment", "equipment", "what to bring", "equipment checklist"], kind: "list" },
  { key: "linked_procedures", label: "Linked procedures", aliases: ["linked procedures"], kind: "list" },
];

export type ParsedGuide = {
  title: string;
  subspecialty: string | null;   // database value, e.g. "Otology"
  urgency: string | null;        // Emergent | Urgent | Routine
  subsite: string | null;        // subsite name as written
  fields: Partial<Record<GuideField, string[] | string>>;
  unsorted: string[];
  warnings: string[];
};

const SPEC_ALIASES: Record<string, string> = {
  "head and neck": "Head & neck", "head & neck": "Head & neck", "h&n": "Head & neck",
  "facial plastics": "Facial plastics", "facial plastic": "Facial plastics", "fprs": "Facial plastics",
  "otology/neurotology": "Otology", "otology": "Otology", "neurotology": "Otology", "otology / neurotology": "Otology",
  "rhinology": "Rhinology", "laryngology": "Laryngology",
  "pediatrics": "Pediatric", "pediatric": "Pediatric", "peds": "Pediatric", "pediatric otolaryngology": "Pediatric",
};
const URGENCY = ["Emergent", "Urgent", "Routine"];

// "2. Triage and Red Flags:" / "## Triage & red flags" / "**Triage and red flags**" -> "triage and red flags"
function headingKey(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*(.*)\*\*:?$/, "$1")
    .replace(/^\d+[a-z]?[.)]\s*/i, "")
    .replace(/[:\s]+$/, "")
    .replace(/\*\*/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchField(line: string): GuideField | null {
  const t = line.trim();
  // Only a short line on its own can be a section heading.
  if (!t || t.length > 60 || /^[-*•]\s/.test(t)) return null;
  const k = headingKey(t);
  for (const f of FIELD_ORDER) if (f.aliases.includes(k)) return f.key;
  return null;
}

// House style for formatted sections.
export function normalizeRich(lines: string[]): string[] {
  const out: string[] = [];
  let num = 0;
  for (const raw of lines) {
    let l = raw.replace(/\s+$/, "").replace(/\t/g, "  ");
    if (!l.trim()) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      num = 0;
      continue;
    }
    l = l.replace(/^(\s*)(?:[•●▪◦·–—]|\*(?!\*))\s+/, "$1- ");   // other bullet marks -> "- "
    l = l.replace(/^(\s*)-(?=\S)/, (m, sp) => (/^\s*-\d/.test(l) ? m : sp + "- ")); // "-item" -> "- item" (not "-5")
    l = l.replace(/^#{4,6}\s+/, "### ");                          // deepest headings -> ###
    const n = l.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (n) {
      num += 1;
      l = `${n[1]}${num}. ${n[3]}`;
    } else {
      num = 0;
    }
    out.push(l);
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function normalizeList(lines: string[]): string[] {
  return lines
    .map((l) => {
      let t = l.trim();
      // Strip any mix of bullet marks, numbers and [ ] checkboxes at the start.
      for (let i = 0; i < 3; i++) t = t.replace(/^(?:[-*•●▪◦·–—]|\d+[.)]|\[\s?[xX ]?\s?\])\s*/, "");
      return t.trim();
    })
    .filter(Boolean);
}

export function parseGuides(input: string): ParsedGuide[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const guides: ParsedGuide[] = [];
  let g: ParsedGuide | null = null;
  let field: GuideField | null = null;
  let buf: string[] = [];
  let inMeta = false;

  const flush = () => {
    if (!g) return;
    if (field) {
      const spec = FIELD_ORDER.find((f) => f.key === field)!;
      const prev = (g.fields[field] as string[] | undefined) || [];
      const merged = prev.length ? [...prev, "", ...buf] : buf;
      g.fields[field] = spec.kind === "list" ? normalizeList(merged) : normalizeRich(merged);
    } else if (buf.some((l) => l.trim())) {
      g.unsorted.push(...buf.filter((l) => l.trim()));
    }
    buf = [];
  };

  for (const line of lines) {
    const title = line.match(/^#\s+(.+?)\s*$/);
    if (title && !matchField(line)) {
      flush();
      if (g) guides.push(g);
      g = { title: title[1].replace(/\*\*/g, "").trim(), subspecialty: null, urgency: null, subsite: null, fields: {}, unsorted: [], warnings: [] };
      field = null;
      inMeta = true;
      continue;
    }
    if (!g) {
      if (line.trim()) {
        g = { title: "", subspecialty: null, urgency: null, subsite: null, fields: {}, unsorted: [], warnings: [] };
        inMeta = true;
      } else continue;
    }
    if (inMeta) {
      const m = line.match(/^\s*\**\s*(subspecialty|urgency|urgency tier|subsite|anatomical subsite)\s*\**\s*:\s*(.+?)\s*$/i);
      if (m) {
        const key = m[1].toLowerCase();
        const val = m[2].replace(/\*\*/g, "").trim();
        if (key === "subspecialty") {
          g.subspecialty = SPEC_ALIASES[val.toLowerCase()] ?? null;
          if (!g.subspecialty) g.warnings.push(`Unknown subspecialty "${val}"`);
        } else if (key.startsWith("urgency")) {
          const u = URGENCY.find((x) => x.toLowerCase() === val.toLowerCase());
          g.urgency = u ?? null;
          if (!u) g.warnings.push(`Unknown urgency "${val}"`);
        } else g.subsite = val;
        continue;
      }
      if (!line.trim()) continue;
    }
    const f = matchField(line);
    if (f && f !== field) {
      inMeta = false;
      flush();
      field = f;
      continue;
    }
    inMeta = false;
    buf.push(line);
  }
  flush();
  if (g) guides.push(g);

  for (const x of guides) {
    if (!x.title) x.warnings.push("No title. Start each guide with a line like: # Sudden sensorineural hearing loss");
    if (!x.subspecialty) x.warnings.push("Subspecialty not set");
    if (!x.urgency) x.warnings.push("Urgency not set (will default to Urgent)");
    const missing = FIELD_ORDER.filter((f) => f.key !== "linked_procedures" && !(x.fields[f.key] && (x.fields[f.key] as string[]).length)).map((f) => f.label);
    if (missing.length) x.warnings.push("Missing: " + missing.join(", "));
    if (x.unsorted.length) x.warnings.push(`${x.unsorted.length} line(s) not under a recognized section heading`);
  }
  return guides.filter((x) => x.title || Object.keys(x.fields).length);
}

export const TEMPLATE = `# Consult name
Subspecialty: Otology/Neurotology
Urgency: Urgent
Subsite: Ear & temporal bone

## Consult question

## Triage and red flags

## Focused history

## Focused exam

## Workup

## Differential diagnosis

## Initial management

## Definitive / escalation management

## Disposition and follow-up

## When to call the attending

## Pearls and pitfalls

## Key references

## Recommended equipment
`;
