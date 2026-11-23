import Link from "next/link";
import { notFound } from "next/navigation";
import Notes from "@/components/Notes";
import RichText from "@/components/RichText";
import { getSessionProfile } from "@/lib/supabase/server";
import { TAG_CLASS } from "@/lib/library";
import { fmtDate } from "@/lib/format";

// Consult guide page, built for a phone in the ED: one column, red flags and
// the algorithm open, everything else collapsed, and a Quick view.

const box: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };

function Section({ title, open, children, empty }: { title: string; open?: boolean; children: React.ReactNode; empty: boolean }) {
  if (empty) return null;
  return (
    <details open={open} style={box} className="guide-section">
      <summary style={{ listStyle: "none", cursor: "pointer", minHeight: 56, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 17, fontWeight: 600 }}>
        {title}
        <span aria-hidden="true" className="chev" style={{ fontSize: 20, color: "var(--muted)", transition: "transform .15s" }}>›</span>
      </summary>
      {children}
    </details>
  );
}

const Body = ({ lines }: { lines: string[] | string | null }) => (
  <div style={{ padding: "0 20px 18px" }}><RichText lines={lines} /></div>
);

export async function ConsultGuideEntry({ slug, quick }: { slug: string; quick: boolean }) {
  const { supabase, isAdmin } = await getSessionProfile();
  const { data: g } = await supabase.from("consult_guides").select("*").eq("slug", slug).maybeSingle();
  if (!g) notFound();
  const subsite = g.subsite_id ? (await supabase.from("subsites").select("name").eq("id", g.subsite_id).maybeSingle()).data?.name : null;
  const base = `/consult-guides/${g.slug}`;
  const has = (v: any) => (Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim()));

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`.guide-section[open] > summary .chev{transform:rotate(90deg)} .guide-section > summary::-webkit-details-marker{display:none}`}</style>
      <div className="between" style={{ alignItems: "center" }}>
        <Link href="/consult-guides" className="small" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>← All consult guides</Link>
        {isAdmin && <Link className="btn btn-sm" href={`${base}/edit`}>Edit</Link>}
      </div>

      <header className="stack" style={{ gap: 8 }}>
        <div className="row">
          <span className={"tag " + (TAG_CLASS[g.urgency] || "tag-plain")}>{g.urgency}</span>
          {subsite && <span className="tag tag-plain">{subsite}</span>}
          {!g.published && <span className="tag tag-draft">Draft · only you can see this</span>}
          {g.reviewed_at && <span className="small muted">Reviewed {fmtDate(g.reviewed_at)}</span>}
        </div>
        <h1 className="page-title" style={{ fontSize: 30 }}>{g.title}</h1>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, background: "var(--tabs)", borderRadius: 12 }} role="tablist" aria-label="View">
        <Link role="tab" aria-selected={!quick} href={base} className="btn" style={!quick ? { minHeight: 48 } : { minHeight: 48, background: "transparent", border: 0, color: "var(--muted2)" }}>Full guide</Link>
        <Link role="tab" aria-selected={quick} href={`${base}?d=quick`} className="btn" style={quick ? { minHeight: 48 } : { minHeight: 48, background: "transparent", border: 0, color: "var(--muted2)" }}>Quick view</Link>
      </div>

      <span className="btn" aria-disabled="true" title="The consult log arrives in version 2" style={{ minHeight: 52, opacity: 0.6, cursor: "not-allowed" }}>
        Log this consult <span className="small muted" style={{ fontWeight: 500 }}>· version 2</span>
      </span>

      {has(g.consult_question) && (
        <section style={{ ...box, padding: "14px 20px" }} aria-label="Consult question">
          <span className="small muted" style={{ fontWeight: 600 }}>1. Consult question</span>
          <div style={{ marginTop: 6 }}><RichText lines={g.consult_question} size={17} /></div>
        </section>
      )}

      {has(g.red_flags) && (
        <section className="danger" aria-label="Triage and red flags" style={{ padding: "16px 20px" }}>
          <h2 style={{ fontSize: 17 }}>2. Triage and red flags</h2>
          <div style={{ color: "var(--danger-ink)" }}><RichText lines={g.red_flags} /></div>
        </section>
      )}

      {!quick && (
        <>
          <Section title="3. Focused history" empty={!has(g.focused_history)}><Body lines={g.focused_history} /></Section>
          <Section title="4. Focused exam" empty={!has(g.focused_exam)}><Body lines={g.focused_exam} /></Section>
          <Section title="5. Workup" empty={!has(g.workup)}><Body lines={g.workup} /></Section>
          <Section title="6. Differential diagnosis" empty={!has(g.differential)}><Body lines={g.differential} /></Section>
        </>
      )}

      <Section title="7. Initial management" open empty={!has(g.initial_management)}>
        <Body lines={g.initial_management} />
      </Section>
      <Section title="8. Definitive / escalation management" open={quick} empty={!has(g.escalation_management) && !has(g.linked_procedures)}>
        <Body lines={g.escalation_management} />
        {has(g.linked_procedures) && (
          <div className="row" style={{ padding: "0 20px 16px" }}>
            <span className="small muted">Procedures:</span>
            {g.linked_procedures.map((p: string) => <span key={p} className="pill" style={{ minHeight: 34 }}>{p}</span>)}
          </div>
        )}
      </Section>
      <Section title="9. Disposition and follow-up" open={quick} empty={!has(g.disposition)}><Body lines={g.disposition} /></Section>
      <Section title="10. When to call the attending" open={quick} empty={!has(g.call_attending)}><Body lines={g.call_attending} /></Section>

      {!quick && (
        <>
          <Section title="11. Pearls and pitfalls" empty={!has(g.pearls_pitfalls)}><Body lines={g.pearls_pitfalls} /></Section>
          <Section title="12. Key references" empty={!has(g.deeper_reading)}><Body lines={g.deeper_reading} /></Section>
          <Notes itemType="consult_guide" itemId={g.id} path={base} label="My notes" placeholder="How my attendings handle this, what I learned the hard way…" />
        </>
      )}
    </div>
  );
}
