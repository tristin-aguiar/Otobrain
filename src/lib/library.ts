// One description per shared-library section. The list page, entry page and
// editor are generic and read everything they need from here, so changing a
// template means editing this file only.

export type FieldType =
  | "text" | "textarea" | "select" | "subsite" | "date"
  | "lines" | "sections" | "blocks" | "qa" | "rows";

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
  groupBy: { field: string; label: string; options?: string[] };  // options = fixed order; else subsites
  filter?: { field: string; label: string; options: string[] };
  depthToggle?: boolean;
  fields: Field[];
};

const SUBSPECIALTIES = ["Head & neck", "Otology", "Rhinology", "Laryngology", "Facial plastics", "Pediatric", "Sleep", "General"];
const YIELD = ["high", "medium", "low"];

export const SECTIONS: Record<Section["key"], Section> = {
  pathology: {
    key: "pathology",
    table: "pathology_entries",
    noteType: "pathology",
    title: "Pathology",
    noun: "entry",
    lead: "Disease entries by anatomical subsite: presentation, workup, staging, management and board pearls.",
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
        name: "sections", label: "Sections", type: "sections", show: "cards",
        hint: "Start each section with ## and its name. Put one point per line underneath.",
        starter: "## Epidemiology and risk factors\n- \n\n## Pathophysiology\n- \n\n## Presentation\n- Symptoms: \n- Exam findings: \n- Red flags: \n\n## Workup\n- Labs: \n- Imaging: \n\n## Staging or classification\n- \n\n## Management\n- Medical: \n- Surgical: \n- Follow-up: ",
      },
      { name: "board_pearls", label: "Board pearls", type: "lines", show: "card-numbered", hint: "One pearl per line." },
      {
        name: "key_studies", label: "Key studies and guidelines", type: "rows", show: "rows-list",
        rowKeys: ["name", "year", "takeaway", "link"], rowLabels: ["Name", "Year", "Takeaway", "Link"],
        hint: "One per line: Name | Year | One-line takeaway | Link (optional)",
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
    lead: "Step-by-step approach to common ENT consults, from the first phone call to presenting to your attending.",
    titleField: "title",
    groupBy: { field: "urgency", label: "Urgency", options: ["Emergent", "Urgent", "Routine"] },
    fields: [
      { name: "title", label: "Consult type", type: "text", show: "title", required: true },
      { name: "urgency", label: "Urgency", type: "select", options: ["Emergent", "Urgent", "Routine"], show: "tag" },
      { name: "red_flags", label: "Call your senior or attending now if", type: "lines", show: "danger", hint: "One red flag per line." },
      {
        name: "steps", label: "Steps", type: "sections", show: "card-numbered",
        hint: "Start each step with ## and its name. Put one point per line underneath.",
        starter: "## On the phone\n- Questions to ask the caller: \n- Vitals and airway status: \n- What to start before you arrive: \n\n## Bring to bedside\n- \n\n## Focused history\n- \n\n## Focused exam\n- \n\n## Workup\n- \n\n## Initial management\n- \n\n## Disposition and follow-up\n- \n\n## Presenting to the attending\n- ",
      },
      { name: "sources", label: "Sources", type: "textarea", show: "card-text" },
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
