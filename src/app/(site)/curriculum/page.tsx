import Link from "next/link";
import Notes from "@/components/Notes";
import { ChapterFile, PreReadingChecklist } from "@/components/ChapterTools";
import { getSessionProfile } from "@/lib/supabase/server";
import { saveProgress, updateChapter } from "@/lib/curriculum-actions";
import { SUBSPECIALTY_CLASS } from "@/lib/library";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Curriculum" };

const SPECS = ["Head & neck", "Otology", "Rhinology", "Laryngology", "Facial plastics", "Pediatric", "Sleep", "General"];
const STATUS = ["Not started", "Scheduled", "Reading", "Done"];
const STATUS_CLASS: Record<string, string> = { Done: "sp-rhino", Reading: "sp-oto", Scheduled: "sp-peds", "Not started": "tag-plain" };

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ book?: string; spec?: string; ch?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile, isAdmin } = await getSessionProfile();
  const [{ data: books }, { data: chapters }, { data: progress }, { data: subsites }] = await Promise.all([
    supabase.from("textbooks").select("*").order("sort"),
    supabase.from("chapters").select("*").order("number"),
    supabase.from("chapter_progress").select("*").eq("user_id", user!.id),
    supabase.from("subsites").select("*").order("sort"),
  ]);
  const prog = new Map((progress || []).map((p: any) => [p.chapter_id, p]));
  const bookId = Number(sp.book) || books?.[0]?.id;
  const book = books?.find((b: any) => b.id === bookId);
  const all = (chapters || []).filter((c: any) => c.textbook_id === bookId);
  const list = all.filter((c: any) => !sp.spec || c.subspecialty === sp.spec);
  const sel = list.find((c: any) => String(c.id) === sp.ch) || list[0];
  const selProg: any = sel ? prog.get(sel.id) : null;
  const status = (c: any) => (prog.get(c.id) as any)?.status || "Not started";
  const checklist = profile?.prereading_checklist || [];

  let fileUrl: string | null = null;
  if (selProg?.file_path) {
    fileUrl = (await supabase.storage.from("chapter-files").createSignedUrl(selProg.file_path, 3600)).data?.signedUrl ?? null;
  }
  const q = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const m = { book: bookId, spec: sp.spec, ...o };
    Object.entries(m).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
    return "/curriculum?" + p.toString();
  };

  return (
    <>
      <header className="between">
        <div className="stack" style={{ gap: 6 }}>
          <div className="row">
            <span className="tag tag-shared">Shared chapter outline</span>
            <span className="tag tag-private">Your progress, files and notes are private</span>
          </div>
          <h1 className="page-title">Curriculum</h1>
        </div>
        <div className="row">
          <Link className="btn btn-sm" href="/curriculum/checklist">Edit my checklist</Link>
          {isAdmin && <Link className="btn btn-sm btn-primary" href="/curriculum/import">Import chapters</Link>}
        </div>
      </header>

      <section aria-label="Progress by textbook" className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {(books || []).map((b: any) => {
          const chs = (chapters || []).filter((c: any) => c.textbook_id === b.id);
          const n = (s: string) => chs.filter((c: any) => status(c) === s).length;
          const pct = (x: number) => (chs.length ? (x / chs.length) * 100 : 0) + "%";
          const on = b.id === bookId;
          return (
            <Link key={b.id} href={`/curriculum?book=${b.id}`} className="card" aria-current={on ? "true" : undefined} style={{ textDecoration: "none", color: "var(--ink)", border: on ? "2px solid var(--accent)" : undefined }}>
              <div className="between" style={{ alignItems: "baseline" }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{b.short_name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{b.edition ? `${b.edition} ed.` : "Edition not set"}</span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{b.full_title}</span>
              <div className="bar">
                <span style={{ width: pct(n("Done")), background: "var(--accent)" }} />
                <span style={{ width: pct(n("Reading")), background: "var(--info)" }} />
                <span style={{ width: pct(n("Scheduled")), background: "var(--underline)" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                <strong style={{ color: "var(--ink)" }}>{n("Done")}</strong> done · {n("Reading")} reading · {n("Scheduled")} scheduled · of {chs.length} chapters
              </span>
            </Link>
          );
        })}
      </section>

      <div className="row" role="group" aria-label="Filter by subspecialty" style={{ gap: 6 }}>
        <Link className={"chip" + (!sp.spec ? " on" : "")} href={q({ spec: "", ch: undefined })}>All</Link>
        {SPECS.map((s) => (
          <Link key={s} className={"chip" + (sp.spec === s ? " on" : "")} href={q({ spec: s, ch: undefined })}>{s}</Link>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="empty">
          No chapters loaded for {book?.short_name || "this book"} yet.{isAdmin && <> <Link href="/curriculum/import">Import the table of contents</Link>.</>}
        </div>
      ) : (
        <div className="split">
          <section aria-label="Chapters" className="table-box" style={{ flex: "3 1 520px", minWidth: 0 }}>
            <table className="data">
              <thead>
                <tr><th scope="col" style={{ width: 52 }}>Ch.</th><th scope="col">Title</th><th scope="col" className="hide-sm">Subspecialty</th><th scope="col">Status</th><th scope="col" className="hide-sm">Scheduled</th><th scope="col" className="hide-sm">Pre-read</th><th scope="col" className="hide-sm">File</th></tr>
              </thead>
              <tbody>
                {list.map((c: any) => {
                  const p: any = prog.get(c.id);
                  const active = sel?.id === c.id;
                  return (
                    <tr key={c.id} style={active ? { background: "var(--selected)" } : undefined}>
                      <td className="muted">{c.number}</td>
                      <td><Link href={q({ ch: c.id }) + "#chapter"} style={{ fontWeight: 500, color: "var(--accent-ink)" }}>{c.title}</Link></td>
                      <td className="hide-sm"><span className={"tag " + SUBSPECIALTY_CLASS[c.subspecialty]}>{c.subspecialty}</span></td>
                      <td><span className={"tag " + STATUS_CLASS[status(c)]}>{status(c)}</span></td>
                      <td className="muted hide-sm" style={{ whiteSpace: "nowrap" }}>{p?.scheduled_for ? fmtDate(p.scheduled_for, { month: "short", day: "numeric" }) : "—"}</td>
                      <td className="muted hide-sm">{(p?.checklist_done || []).filter((i: number) => i < checklist.length).length}/{checklist.length}</td>
                      <td className="hide-sm" style={{ fontSize: 12, color: p?.file_path ? "var(--ok)" : "var(--muted)" }}>{p?.file_path ? "PDF attached" : "Add file"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {sel && (
            <aside id="chapter" aria-label="Selected chapter" className="card" style={{ flex: "2 1 340px", minWidth: 0, gap: 18, padding: 20 }}>
              <div className="stack" style={{ gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>{book?.short_name} · Chapter {sel.number}</span>
                <h2 style={{ fontSize: 20 }}>{sel.title}</h2>
                <div className="row">
                  <span className={"tag " + SUBSPECIALTY_CLASS[sel.subspecialty]}>{sel.subspecialty}</span>
                  {sel.subsite_id && <span className="tag tag-plain">{subsites?.find((s: any) => s.id === sel.subsite_id)?.name}</span>}
                </div>
              </div>

              <form action={saveProgress.bind(null, sel.id)} className="stack" style={{ gap: 12 }}>
                <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  <label className="field">Scheduled for<input type="date" name="scheduled_for" defaultValue={selProg?.scheduled_for ?? ""} /></label>
                  <label className="field">Status
                    <select name="status" defaultValue={selProg?.status ?? "Not started"}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
                  </label>
                </div>
                <div><button className="btn btn-sm" type="submit">Save status</button></div>
              </form>

              <div className="stack" style={{ gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Chapter file</span>
                <ChapterFile chapterId={sel.id} userId={user!.id} fileName={selProg?.file_path ?? null} url={fileUrl} />
              </div>

              <PreReadingChecklist key={sel.id} chapterId={sel.id} items={checklist} initial={selProg?.checklist_done || []} />

              <Notes itemType="chapter" itemId={sel.id} path="/curriculum" label="My reading notes" placeholder="Answers to my pre-reading questions, pearls, things to look up…" />

              {isAdmin && (
                <details>
                  <summary className="small" style={{ cursor: "pointer" }}>Admin: edit chapter details</summary>
                  <form action={updateChapter.bind(null, sel.id)} className="stack" style={{ gap: 10, marginTop: 10 }}>
                    <label className="field">Title<input name="title" defaultValue={sel.title} /></label>
                    <label className="field">Subspecialty<select name="subspecialty" defaultValue={sel.subspecialty}>{SPECS.map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="field">Subsite
                      <select name="subsite_id" defaultValue={sel.subsite_id ?? ""}><option value="">Not set</option>{(subsites || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    </label>
                    <div><button className="btn btn-sm" type="submit">Save chapter</button></div>
                  </form>
                </details>
              )}
            </aside>
          )}
        </div>
      )}
    </>
  );
}
