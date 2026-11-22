import Link from "next/link";
import { getSessionProfile } from "@/lib/supabase/server";
import { importChapters } from "@/lib/curriculum-actions";

export const metadata = { title: "Import chapters" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const sp = await searchParams;
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) return <div className="empty">Only the site admin can import chapters.</div>;
  const { data: books } = await supabase.from("textbooks").select("*").order("sort");
  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <Link href="/curriculum" className="small">← Curriculum</Link>
        <h1 className="page-title">Import chapters</h1>
        <p className="lead">Paste a book&apos;s table of contents, one chapter per line. Re-importing a chapter number updates it rather than adding a duplicate.</p>
      </header>
      {sp.error && <div className="warn">{sp.error}</div>}
      {sp.message && <div className="warn" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>{sp.message}</div>}
      <form action={importChapters} className="card" style={{ gap: 16, maxWidth: 900 }}>
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label className="field">Textbook
            <select name="textbook_id">{(books || []).map((b: any) => <option key={b.id} value={b.id}>{b.short_name}</option>)}</select>
          </label>
          <label className="field">Edition (optional)<input name="edition" placeholder="e.g. 7th" /></label>
        </div>
        <label className="field">Chapters
          <textarea name="chapters" rows={16} required style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} placeholder={"1 | Chapter title | Otology | Ear & temporal bone\n2 | Chapter title | Rhinology\n3 | Chapter title"} />
          <span className="hint">Format: number | title | subspecialty | subsite. Subspecialty and subsite are optional. Columns copied from a spreadsheet (tabs) or separated by commas also work.</span>
        </label>
        <div><button className="btn btn-primary" type="submit">Import</button></div>
      </form>
    </>
  );
}
