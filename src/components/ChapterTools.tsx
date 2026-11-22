"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveChecklist, setChapterFile } from "@/lib/curriculum-actions";

export function PreReadingChecklist({ chapterId, items, initial }: { chapterId: number; items: string[]; initial: number[] }) {
  const [done, setDone] = useState<number[]>(initial);
  const [, start] = useTransition();
  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    start(() => saveChecklist(chapterId, next));
  }
  return (
    <fieldset style={{ margin: 0, padding: 0, border: 0 }} className="stack">
      <legend style={{ fontSize: 13, fontWeight: 600, paddingBottom: 8 }}>
        Pre-reading checklist <span className="muted" style={{ fontWeight: 500 }}>· {done.filter((i) => i < items.length).length} of {items.length}</span>
      </legend>
      {items.map((label, i) => (
        <label key={i} className="check">
          <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} />
          <span className={done.includes(i) ? "done-text" : ""}>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

// Uploads the user's own copy of a chapter to their private folder.
export function ChapterFile({ chapterId, userId, fileName, url }: { chapterId: number; userId: string; fileName: string | null; url: string | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") return setErr("Please choose a PDF file.");
    if (file.size > 50 * 1024 * 1024) return setErr("That file is over 50 MB.");
    setBusy(true);
    setErr("");
    const path = `${userId}/chapter-${chapterId}.pdf`;
    const { error } = await createClient().storage.from("chapter-files").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (error) setErr(error.message);
    else await setChapterFile(chapterId, path);
    setBusy(false);
  }
  if (fileName) {
    return (
      <div className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Your PDF is attached</span>
          <span className="muted" style={{ fontSize: 12 }}>Private · never shared with other users</span>
        </div>
        {url && <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">Open</a>}
        <button type="button" className="btn btn-sm" onClick={async () => { setBusy(true); await setChapterFile(chapterId, null); setBusy(false); }} disabled={busy}>Remove</button>
      </div>
    );
  }
  return (
    <label style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "18px 12px", border: "1px dashed var(--input)", borderRadius: 8, textAlign: "center", cursor: "pointer" }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-ink)" }}>{busy ? "Uploading…" : "Upload your copy of this chapter"}</span>
      <span className="muted" style={{ fontSize: 12 }}>PDF · stored privately · never shared with other users</span>
      {err && <span style={{ fontSize: 12, color: "var(--danger)" }}>{err}</span>}
      <input type="file" accept="application/pdf" onChange={onFile} disabled={busy} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
    </label>
  );
}
