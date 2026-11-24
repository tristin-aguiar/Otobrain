"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import RichText from "@/components/RichText";
import { FIELD_ORDER, TEMPLATE, parseGuides } from "@/lib/guide-import";
import { importGuides, type ImportResult } from "@/lib/guide-import-actions";
import { GUIDE_SPEC_LABELS } from "@/lib/library";
import { slugify } from "@/lib/format";

type Existing = { slug: string; title: string; published: boolean };

export default function ImportGuides({ existing, subsites }: { existing: Existing[]; subsites: string[] }) {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<Record<number, "update" | "skip">>({});
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [pending, start] = useTransition();

  const guides = useMemo(() => parseGuides(text), [text]);
  const findExisting = (title: string) => existing.find((e) => e.slug === slugify(title) || e.title.toLowerCase() === title.toLowerCase());

  function save() {
    const decisions = guides.map((g, i) => (findExisting(g.title) ? choice[i] ?? "skip" : g.title ? "create" : "skip"));
    start(async () => setResults(await importGuides(text, decisions)));
  }

  if (results) {
    return (
      <div className="stack" style={{ gap: 12, maxWidth: 820 }}>
        <div className="card">
          <h2>Import finished</h2>
          <ul>
            {results.map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong>: {r.status}
                {r.slug && r.status !== "skipped" && <> · <Link href={`/consult-guides/${r.slug}`}>open</Link></>}
                {r.message && <> · {r.message}</>}
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>New guides are unpublished drafts. Review each one, then tick Published in its editor.</p>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => { setResults(null); setText(""); setChoice({}); }}>Import more</button>
          <Link className="btn btn-primary" href="/consult-guides">Back to consult guides</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 900 }}>
      <div className="card" style={{ gap: 12 }}>
        <label className="field">
          Paste one or more guides
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder={"# Sudden sensorineural hearing loss\nSubspecialty: Otology/Neurotology\nUrgency: Urgent\nSubsite: Ear & temporal bone\n\n## Consult question\n…\n## Triage and red flags\n…"}
            style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
          />
          <span className="hint">
            Start each guide with <code># Title</code>, then optional Subspecialty, Urgency and Subsite lines, then the section headings. Numbered or bold headings work too.
          </span>
        </label>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setText(text ? text + "\n\n" + TEMPLATE : TEMPLATE)}>Insert blank template</button>
          <span className="small muted">Subsites: {subsites.join(" · ")}</span>
        </div>
      </div>

      {guides.length > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Preview · {guides.length} guide{guides.length === 1 ? "" : "s"}</h2>
          {guides.map((g, i) => {
            const ex = findExisting(g.title);
            return (
              <section key={i} className="card" style={{ gap: 12 }}>
                <div className="between" style={{ alignItems: "center" }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{g.title || "(no title)"}</span>
                    <div className="row">
                      {g.subspecialty && <span className="tag tag-plain">{GUIDE_SPEC_LABELS[g.subspecialty] ?? g.subspecialty}</span>}
                      <span className="tag tag-plain">{g.urgency ?? "Urgent"}</span>
                      {g.subsite && <span className="tag tag-plain">{g.subsite}</span>}
                      {!ex && g.title && <span className="tag tag-shared">New · saves as draft</span>}
                    </div>
                  </div>
                  {ex && (
                    <label className="field" style={{ minWidth: 220 }}>
                      Already exists{ex.published ? " (published)" : " (draft)"}
                      <select value={choice[i] ?? "skip"} onChange={(e) => setChoice({ ...choice, [i]: e.target.value as "update" | "skip" })}>
                        <option value="skip">Skip, keep existing</option>
                        <option value="update">Update existing with this text</option>
                      </select>
                    </label>
                  )}
                </div>
                {g.warnings.length > 0 && (
                  <ul className="warn" style={{ margin: 0, paddingLeft: 30 }}>
                    {g.warnings.map((w, j) => <li key={j}>{w}</li>)}
                  </ul>
                )}
                {g.unsorted.length > 0 && (
                  <details>
                    <summary className="small" style={{ cursor: "pointer" }}>Text not under a section ({g.unsorted.length} lines, will not be saved)</summary>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, margin: "8px 0 0" }}>{g.unsorted.join("\n")}</pre>
                  </details>
                )}
                {FIELD_ORDER.filter((f) => g.fields[f.key] && (g.fields[f.key] as string[]).length).map((f) => (
                  <details key={f.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600, minHeight: 36 }}>{f.label}</summary>
                    <div style={{ padding: "6px 0 4px" }}>
                      {f.kind === "list" ? (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>{(g.fields[f.key] as string[]).map((x, j) => <li key={j}>{x}</li>)}</ul>
                      ) : (
                        <RichText lines={g.fields[f.key] as string[]} size={15} />
                      )}
                    </div>
                  </details>
                ))}
              </section>
            );
          })}
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save as drafts"}
            </button>
            <span className="small muted">New guides save unpublished. Existing guides change only where you chose Update.</span>
          </div>
        </>
      )}
    </div>
  );
}
