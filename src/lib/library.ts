// One description per shared-library section. The list page, entry page and
// editor are generic and read everything they need from here, so changing a
// template means editing this file only.

export type FieldType =
  | "text" | "textarea" | "select" | "subsite" | "date"
  | "lines" | "rich" | "sections" | "blocks" | "qa" | "rows";

// How a field appears on the entry page.
export type Show =
  | "title" | "tag" | "lead" | "chips" | "danger" | "cards" | "card-list"
  | "card-numbered" | "card-text" | "blocks" | "qa" | "rows-table" | "rows-list" | "checklist" | "none";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  show: Show;
  options?: string[];
  labels?: Record<string, string>;   // display names for option values
  rowKeys?: string[];      // for "rows"
  rowLabels?: string[];
  hint?: string;
  placeholder?: string;
  required?: boolean;
  starter?: string;        // pre-filled text for new entries (the template)
  depth?: "deep";          // shown only in Deep dive view
};

export type Section = {
  key: "pathology" | "consult-guides" | "radiology" | "basic-science";
  table: string;
  noteType: string;
  title: string;
  noun: string;
  lead: string;
  titleField: string;
  groupBy: { field: string; label: string; options?: string[]; labels?: Record<string, string> };  // options = fixed order; else subsites
  filter?: { field: string; label: string; options: string[] };
  depthToggle?: boolean;
  fields: Field[];
};

const SUBSPECIALTIES = ["Head & neck", "Otology", "Rhinology", "Laryngology", "Facial plastics", "Pediatric", "Sleep", "General"];
const YIELD = ["high", "medium", "low"];

// Subspecialties used to organize consult guides, in display order.
const GUIDE_SPECS = ["Head & neck", "Facial plastics", "Otology", "Rhinology", "Laryngology", "Pediatric"];
export const GUIDE_SPEC_LABELS: Record<string, string> = {
  "Head & neck": "Head and neck", "Facial plastics": "Facial plastics", Otology: "Otology/Neurotology",
  Rhinology: "Rhinology", Laryngology: "Laryngology", Pediatric: "Pediatrics",
};

export const SECTIONS: Record<Section["key"], Section> = {
  pathology: {
    key: "pathology",
    table: "pathology_entries",
    noteType: "pathology",
    title: "Pathology",
    noun: "entry",
    lead: "Disease entries by anatomical subsite, from epidemiology through treatment, research and references.",
    titleField: "name",
    groupBy: { field: "subsite_id", label: "Subsite" },
    filter: { field: "subspecialty", label: "Subspecialty", options: SUBSPECIALTIES },
    fields: [
      { name: "name", label: "Entity name", type: "text", show: "title", required: true },
      { name: "subsite_id", label: "Anatomical subsite", type: "subsite", show: "tag" },
      { name: "subspecialty", label: "Subspecialty", type: "select", options: SUBSPECIALTIES, show: "tag" },
      { name: "icd10", label: "ICD-10", type: "text", show: "chips" },
      { name: "board_yield", label: "Board yield", type: "select", options: YIELD, show: "chips" },
      { name: "definition", label: "One-sentence definition", type: "textarea", show: "lead", hint: "What it is, who gets it, why it matters." },
      {
        name: "sections", label: "Entry", type: "sections", show: "card-numbered",
        hint: "Keep the ## headings in this order. Put one point per line underneath. Paste links (https://…) in References and they become clickable.",
        starter: "## Epidemiology\n- \n\n## Pathophysiology\n- \n\n## Presenting findings\n- \n\n## Differential diagnosis\n- \n\n## Complete workup\n- \n\n## Treatment\n- \n\n## Consultations and multidisciplinary care\n- \n\n## Current research and recent advances\n- \n\n## References and citations\n- ",
      },
      { name: "reviewed_at", label: "Last reviewed", type: "date", show: "none" },
    ],
  },

  "consult-guides": {
    key: "consult-guides",
    table: "consult_guides",
    noteType: "consult_guide",
    title: "Consult guides",
    noun: "guide",
    lead: "Organized by subspecialty. Every guide has the same 12 sections, with triage and management up front.",
    titleField: "title",
    groupBy: { field: "subspecialty", label: "Subspecialty", options: GUIDE_SPECS, labels: GUIDE_SPEC_LABELS },
    filter: { field: "urgency", label: "Urgency", options: ["Emergent", "Urgent", "Routine"] },
    fields: [
      { name: "title", label: "Consult type", type: "text", show: "none", required: true, placeholder: "e.g. Epistaxis" },
      { name: "subspecialty", label: "Subspecialty", type: "select", options: GUIDE_SPECS, labels: GUIDE_SPEC_LABELS, show: "none", required: true },
      { name: "urgency", label: "Urgency tier", type: "select", options: ["Emergent", "Urgent", "Routine"], show: "none", required: true },
      { name: "subsite_id", label: "Anatomical subsite", type: "subsite", show: "none" },
      { name: "consult_question", label: "1. Consult question", type: "textarea", show: "none", hint: "The question the calling team is asking. Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "red_flags", label: "2. Triage and red flags", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "focused_history", label: "3. Focused history", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "focused_exam", label: "4. Focused exam", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "workup", label: "5. Workup", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "differential", label: "6. Differential diagnosis", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "initial_management", label: "7. Initial management", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "escalation_management", label: "8. Definitive / escalation management", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "linked_procedures", label: "Linked procedures (optional)", type: "lines", show: "none", hint: "Procedure names used in management, one per line. These connect to the procedure log in version 2." },
      { name: "disposition", label: "9. Disposition and follow-up", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "call_attending", label: "10. When to call the attending", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "pearls_pitfalls", label: "11. Pearls and pitfalls", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "deeper_reading", label: "12. Key references", type: "rich", show: "none", hint: "Start a line with - for a bullet, 1. for a numbered step, ## for a heading. Leave blank lines for space. **bold** works." },
      { name: "bring", label: "Recommended equipment", type: "lines", show: "none", hint: "One item per line. Shown as a tick-off checklist at the bottom of the guide." },
      { name: "reviewed_at", label: "Last reviewed", type: "date", show: "none" },
    ],
  },

  radiology: {
    key: "radiology",
    table: "radiology_studies",
    noteType: "radiology",
    title: "Radiology",
    noun: "study",
    lead: "How each study works, when to order it, and how to read it, organized by anatomical subsite.",
    titleField: "name",
    groupBy: { field: "subsite_id", label: "Subsite" },
    filter: { field: "modality", label: "Modality", options: ["CT", "MRI", "Ultrasound", "X-ray & fluoro", "Nuclear medicine", "Angiography"] },
    fields: [
      { name: "name", label: "Study name", type: "text", show: "title", required: true, placeholder: "e.g. CT temporal bone" },
      { name: "modality", label: "Modality", type: "select", options: ["CT", "MRI", "Ultrasound", "X-ray & fluoro", "Nuclear medicine", "Angiography"], show: "tag", required: true },
      { name: "subsite_id", label: "Anatomical subsite", type: "subsite", show: "tag" },
      { name: "contrast", label: "Contrast", type: "text", show: "chips", placeholder: "with, without, or both" },
      { name: "radiation", label: "Radiation", type: "select", options: ["none", "low", "moderate", "high"], show: "chips" },
      {
        name: "sections", label: "Sections", type: "sections", show: "cards",
        hint: "Start each section with ## and its name. Put one point per line underneath.",
        starter: "## When to order it\n- \n\n## How it works\n- \n\n## Protocol basics\n- \n\n## Normal anatomy to identify\n- ",
      },
      { name: "search_pattern", label: "How to read it: search pattern", type: "lines", show: "checklist", hint: "One step per line, in the order you read." },
      {
        name: "findings", label: "Key findings by pathology", type: "rows", show: "rows-table",
        rowKeys: ["pathology", "finding", "pathology_slug"], rowLabels: ["Pathology", "What you see", "Entry"],
        hint: "One per line: Pathology | What you see | pathology entry web name (optional)",
      },
      { name: "pitfalls", label: "Pitfalls and can't-miss findings", type: "lines", show: "danger", hint: "One per line." },
      { name: "reviewed_at", label: "Last reviewed", type: "date", show: "none" },
    ],
  },

  "basic-science": {
    key: "basic-science",
    table: "basic_science_topics",
    noteType: "basic_science",
    title: "Basic science",
    noun: "topic",
    lead: "Basic science relevant to ENT, organized by anatomical subsite. Switch to Deep dive for more detail.",
    titleField: "name",
    groupBy: { field: "subsite_id", label: "Subsite" },
    filter: { field: "discipline", label: "Discipline", options: ["Anatomy", "Embryology", "Physiology", "Immunology", "Microbiology", "Pharmacology", "Genetics", "Oncology", "Acoustics"] },
    depthToggle: true,
    fields: [
      { name: "name", label: "Topic", type: "text", show: "title", required: true },
      { name: "subsite_id", label: "Anatomical subsite", type: "subsite", show: "tag" },
      { name: "discipline", label: "Discipline", type: "select", options: ["Anatomy", "Embryology", "Physiology", "Immunology", "Microbiology", "Pharmacology", "Genetics", "Oncology", "Acoustics"], show: "tag", required: true },
      { name: "board_yield", label: "Board yield", type: "select", options: YIELD, show: "chips" },
      { name: "why_it_matters", label: "Why it matters clinically", type: "textarea", show: "lead" },
      { name: "core_concept", label: "Core concept", type: "textarea", show: "card-text" },
      { name: "mechanisms", label: "Key mechanisms", type: "lines", show: "card-numbered", hint: "One step per line." },
      { name: "clinical", label: "Clinical correlation", type: "lines", show: "card-list" },
      { name: "deep_dive", label: "Deep dive", type: "blocks", show: "blocks", depth: "deep", hint: "Start each part with ## and its name, then write paragraphs.", starter: "## Molecular and cellular detail\n\n## Key experiments and landmark papers\n\n## Current research and open questions\n" },
      { name: "high_yield", label: "High-yield facts", type: "lines", show: "card-list" },
      { name: "questions", label: "Self-check questions", type: "qa", show: "qa", hint: "Write Q: then the question, and A: then the answer on the next line." },
      { name: "reviewed_at", label: "Last reviewed", type: "date", show: "none" },
    ],
  },
};

export const SUBSPECIALTY_CLASS: Record<string, string> = {
  "Head & neck": "sp-hn", Otology: "sp-oto", Rhinology: "sp-rhino", Laryngology: "sp-laryn",
  "Facial plastics": "sp-fps", Pediatric: "sp-peds", Sleep: "sp-sleep", General: "sp-gen",
};
export const TAG_CLASS: Record<string, string> = {
  ...SUBSPECIALTY_CLASS,
  Emergent: "sp-hn", Urgent: "sp-peds", Routine: "sp-gen",
  CT: "sp-oto", MRI: "sp-laryn", Ultrasound: "sp-rhino", "X-ray & fluoro": "sp-gen", "Nuclear medicine": "sp-peds", Angiography: "sp-hn",
  Anatomy: "sp-rhino", Embryology: "sp-fps", Physiology: "sp-oto", Immunology: "sp-peds", Microbiology: "sp-hn",
  Pharmacology: "sp-laryn", Genetics: "sp-sleep", Oncology: "sp-hn", Acoustics: "sp-gen",
};
