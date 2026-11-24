import Link from "next/link";
import { notFound } from "next/navigation";
import Notes from "@/components/Notes";
import Checklist from "@/components/Checklist";
import Linkify from "@/components/Linkify";
import { ConsultGuideEntry } from "@/components/consult-guide";
import { getSessionProfile } from "@/lib/supabase/server";
import { SECTIONS, TAG_CLASS, type Field, type Section } from "@/lib/library";
import { blocksToText, fmtDate, linesToText, qaToText, rowsToText, sectionsToText, type Block, type QA, type Section as Sec } from "@/lib/format";
import { deleteEntry, saveEntry } from "@/lib/actions";

type Subsite = { id: number; name: string; sort: number };



export function getSection(key: string): Section {
  const sec = (SECTIONS as Record<string, Section>)[key];
  if (!sec) notFound();
  return sec;
}

async function loadIndex(sec: Section) {
  const { supabase, isAdmin } = await getSessionProfile();
  const cols = ["id", "slug", sec.titleField, sec.groupBy.field, sec.filter?.field, "published"].filter(Boolean).join(", ");
  const [{ data: rows }, { data: subsites }] = await Promise.all([
    supabase.from(sec.table).select(cols).order(sec.titleField),
    supabase.from("subsites").select("*").order("sort"),
  ]);
  return { supabase, isAdmin, rows: (rows || []) as any[], subsites: (subsites || []) as Subsite[] };
}

function groupRows(sec: Section, rows: any[], subsites: Subsite[], filter?: string) {
  const visible = rows.filter((r) => !filter || !sec.filter || r[sec.filter.field] === filter);
  const groups = sec.groupBy.options
    ? sec.groupBy.options.map((o) => ({ key: o, name: sec.groupBy.labels?.[o] ?? o }))
    : subsites.map((s) => ({ key: s.id, name: s.name }));
  const out = groups.map((g) => ({ ...g, items: visible.filter((r) => r[sec.groupBy.field] === g.key) }));
  const loose = visible.filter((r) => !groups.some((g) => g.key === r[sec.groupBy.field]));
  if (loose.length) out.push({ key: "none" as any, name: "Not yet assigned", items: loose });
  return out;
}

function Header({ sec, isAdmin, children }: { sec: Section; isAdmin: boolean; children?: React.ReactNode }) {
  return (
    <header className="between">
      <div className="stack" style={{ gap: 6 }}>
        <div className="row">
          <span className="tag tag-shared">Shared library</span>
          <span className="small muted">{sec.lead}</span>
        </div>
        <h1 className="page-title">{sec.title}</h1>
      </div>
      <div className="row">
        {children}
        {isAdmin && sec.key === "consult-guides" && (
          <Link className="btn" href="/admin/import-guides">Import guides</Link>
        )}
        {isAdmin && (
          <Link className="btn btn-primary" href={`/${sec.key}/new`}>
            + New {sec.noun}
          </Link>
        )}
      </div>
    </header>
  );
}

function FilterChips({ sec, active, base }: { sec: Section; active?: string; base: string }) {
  if (!sec.filter) return null;
  const href = (v?: string) => (v ? `${base}?f=${encodeURIComponent(v)}` : base);
  return (
    <div className="row" role="group" aria-label={`Filter by ${sec.filter.label.toLowerCase()}`} style={{ gap: 6 }}>
      <Link className={"chip" + (!active ? " on" : "")} href={href()} aria-current={!active ? "true" : undefined}>All</Link>
      {sec.filter.options.map((o) => (
        <Link key={o} className={"chip" + (active === o ? " on" : "")} href={href(o)} aria-current={active === o ? "true" : undefined}>{o}</Link>
      ))}
    </div>
  );
}

function SideList({ sec, groups, activeSlug, filter }: { sec: Section; groups: ReturnType<typeof groupRows>; activeSlug?: string; filter?: string }) {
  const q = filter ? `?f=${encodeURIComponent(filter)}` : "";
  return (
    <nav className="list-box" aria-label={sec.groupBy.label}>
      {groups.map((g) => {
        const open = !!filter ? g.items.length > 0 : g.items.some((r) => r.slug === activeSlug) || (!activeSlug && g.items.length > 0 && groups.filter((x) => x.items.length).length <= 3);
        return (
          <details key={String(g.key)} className="site" open={open}>
            <summary style={{ opacity: g.items.length ? 1 : 0.55 }}>
              <span><span className="chev" aria-hidden="true">›</span>{g.name}</span>
              <span className="small muted" style={{ fontWeight: 500 }}>{g.items.length}</span>
            </summary>
            <div className="site-items">
              {g.items.map((r) => (
                <Link key={r.id} href={`/${sec.key}/${r.slug}${q}`} className={"item-link" + (r.slug === activeSlug ? " active" : "")}>
                  <span>{r[sec.titleField]}</span>
                  <span className="row" style={{ gap: 4 }}>
                    {!r.published && <span className="tag tag-draft" style={{ fontSize: 11, padding: "2px 6px" }}>Draft</span>}
                    {sec.filter && r[sec.filter.field] && (
                      <span className={"tag " + (TAG_CLASS[r[sec.filter.field]] || "tag-plain")} style={{ fontSize: 11, padding: "2px 6px" }}>{r[sec.filter.field]}</span>
                    )}
                  </span>
                </Link>
              ))}
              {!g.items.length && <span className="small muted" style={{ padding: "4px 10px" }}>Nothing here yet</span>}
            </div>
          </details>
        );
      })}
    </nav>
  );
}

// ---------- List page ---------------------------------------------------

export async function LibraryIndex({ sectionKey, filter }: { sectionKey: string; filter?: string }) {
  const sec = getSection(sectionKey);
  const { isAdmin, rows, subsites } = await loadIndex(sec);
  const groups = groupRows(sec, rows, subsites, filter);
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <>
      <Header sec={sec} isAdmin={isAdmin} />
      <FilterChips sec={sec} active={filter} base={`/${sec.key}`} />
      <div className="split">
        <div className="side">
          <SideList sec={sec} groups={groups} filter={filter} />
        </div>
        <div className="body">
          {count === 0 ? (
            <div className="empty">
              {rows.length === 0
                ? isAdmin
                  ? <>No {sec.noun === "entry" ? "entries" : sec.noun + "s"} yet. <Link href={`/${sec.key}/new`}>Add the first one</Link>.</>
                  : "Content is being written. Check back soon."
                : "Nothing matches this filter yet."}
            </div>
          ) : (
            <div className="card">
              <h2>{count} {count === 1 ? sec.noun : sec.noun === "entry" ? "entries" : sec.noun + "s"}{filter ? ` · ${filter}` : ""}</h2>
              <p className="muted small" style={{ margin: 0 }}>Pick one from the list to open it.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Entry page --------------------------------------------------

function Tag({ value }: { value: string }) {
  return <span className={"tag " + (TAG_CLASS[value] || "tag-plain")}>{value}</span>;
}

function renderField(f: Field, v: any) {
  const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
  if (empty) return null;
  switch (f.show) {
    case "lead":
      return <p key={f.name} className="lead">{v}</p>;
    case "danger":
      return (
        <section key={f.name} className="danger">
          <h2>{f.label}</h2>
          <ul>{(v as string[]).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      );
    case "cards":
      return (
        <div key={f.name} className="grid-auto">
          {(v as Sec[]).map((s, i) => (
            <section key={i} className="card">
              <h2>{s.title}</h2>
              <ul>{s.lines.map((l, j) => <li key={j}><Linkify text={l} /></li>)}</ul>
            </section>
          ))}
        </div>
      );
    case "card-numbered":
      if (f.type === "sections") {
        return (
          <ol key={f.name} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {(v as Sec[]).map((s, i) => (
              <li key={i} className="card" style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr)", gap: "4px 12px" }}>
                <span aria-hidden="true" style={{ gridRow: "span 2", width: 28, height: 28, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <h2>{s.title}</h2>
                <ul>{s.lines.map((l, j) => <li key={j}><Linkify text={l} /></li>)}</ul>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <ol style={{ paddingLeft: 20 }}>{(v as string[]).map((l, i) => <li key={i}>{l}</li>)}</ol>
        </section>
      );
    case "card-list":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <ul>{(v as string[]).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      );
    case "card-text":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted2)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{v}</p>
        </section>
      );
    case "checklist":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <Checklist items={v} />
        </section>
      );
    case "blocks":
      return (
        <section key={f.name} className="card" style={{ gap: 14 }}>
          <div className="row"><h2>{f.label}</h2><span className="tag sp-oto" style={{ fontSize: 11 }}>Advanced</span></div>
          {(v as Block[]).map((b, i) => (
            <div key={i} className="stack" style={{ gap: 4, fontSize: 14, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 600 }}>{b.title}</span>
              <span style={{ color: "var(--muted2)", whiteSpace: "pre-line" }}>{b.body}</span>
            </div>
          ))}
        </section>
      );
    case "qa":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          {(v as QA[]).map((x, i) => (
            <details key={i} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 500 }}>{x.q}</summary>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--muted2)", padding: "10px 12px", borderRadius: 8, background: "var(--selected)" }}>{x.a}</p>
            </details>
          ))}
        </section>
      );
    case "rows-list":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <ul>
            {(v as Record<string, string>[]).map((r, i) => (
              <li key={i}>
                <strong style={{ color: "var(--ink)" }}>{r.link ? <a href={r.link} target="_blank" rel="noreferrer">{r.name}</a> : r.name}</strong>
                {r.year ? `, ${r.year}` : ""}{r.takeaway ? ` — ${r.takeaway}` : ""}
              </li>
            ))}
          </ul>
        </section>
      );
    case "rows-table":
      return (
        <section key={f.name} className="card">
          <h2>{f.label}</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="data" style={{ minWidth: 420 }}>
              <thead><tr>{(f.rowLabels || []).map((l) => <th key={l} scope="col">{l}</th>)}</tr></thead>
              <tbody>
                {(v as Record<string, string>[]).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.pathology}</td>
                    <td style={{ color: "var(--muted2)" }}>{r.finding}</td>
                    <td>{r.pathology_slug ? <Link href={`/pathology/${r.pathology_slug}`}>Open</Link> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    default:
      return null;
  }
}

export async function LibraryEntry({ sectionKey, slug, filter, depth }: { sectionKey: string; slug: string; filter?: string; depth?: string }) {
  const sec = getSection(sectionKey);
  if (sec.key === "consult-guides") return <ConsultGuideEntry slug={slug} quick={depth === "quick"} />;
  const { supabase, isAdmin, rows, subsites } = await loadIndex(sec);
  const { data: entry } = await supabase.from(sec.table).select("*").eq("slug", slug).maybeSingle();
  if (!entry) notFound();
  const groups = groupRows(sec, rows, subsites, filter);
  const subsiteName = (id: number | null) => subsites.find((s) => s.id === id)?.name;
  const deep = depth === "deep";
  const qBase = `/${sec.key}/${slug}`;
  const tags = sec.fields.filter((f) => f.show === "tag" && entry[f.name] != null);
  const chips = sec.fields.filter((f) => f.show === "chips" && entry[f.name]);
  const body = sec.fields.filter((f) => !["title", "tag", "chips", "lead", "none"].includes(f.show) && (!f.depth || deep));
  const lead = sec.fields.find((f) => f.show === "lead");

  return (
    <>
      <FilterChips sec={sec} active={filter} base={`/${sec.key}`} />
      <div className="split entry">
        <div className="side">
          <SideList sec={sec} groups={groups} activeSlug={slug} filter={filter} />
        </div>
        <article className="body">
          <header className="stack" style={{ gap: 10 }}>
            <div className="row">
              <span className="tag tag-shared">Shared {sec.noun}</span>
              {!entry.published && <span className="tag tag-draft">Draft · only you can see this</span>}
              {tags.map((f) => <Tag key={f.name} value={f.type === "subsite" ? subsiteName(entry[f.name]) || "" : entry[f.name]} />)}
              {entry.reviewed_at && <span className="small muted">Last reviewed {fmtDate(entry.reviewed_at)}</span>}
            </div>
            <div className="between" style={{ alignItems: "flex-end" }}>
              <h1 className="page-title">{entry[sec.titleField]}</h1>
              <div className="row">
                {sec.depthToggle && (
                  <div role="tablist" aria-label="Depth" className="row" style={{ gap: 4, padding: 4, background: "var(--tabs)", borderRadius: 10 }}>
                    <Link role="tab" aria-selected={!deep} href={qBase + (filter ? `?f=${encodeURIComponent(filter)}` : "")} className="btn btn-sm" style={!deep ? {} : { background: "transparent", border: 0, color: "var(--muted2)" }}>Overview</Link>
                    <Link role="tab" aria-selected={deep} href={qBase + `?d=deep${filter ? `&f=${encodeURIComponent(filter)}` : ""}`} className="btn btn-sm" style={deep ? {} : { background: "transparent", border: 0, color: "var(--muted2)" }}>Deep dive</Link>
                  </div>
                )}
                {isAdmin && <Link className="btn btn-sm" href={`${qBase}/edit`}>Edit</Link>}
              </div>
            </div>
            {lead && renderField(lead, entry[lead.name])}
            {chips.length > 0 && (
              <div className="row">
                {chips.map((f) => <span key={f.name} className="pill">{f.label}: {entry[f.name]}</span>)}
              </div>
            )}
          </header>
          {body.map((f) => renderField(f, entry[f.name]))}
          {body.every((f) => entry[f.name] == null || (Array.isArray(entry[f.name]) && !entry[f.name].length)) && (
            <div className="empty">This {sec.noun} has no content yet.</div>
          )}
          <Notes itemType={sec.noteType} itemId={entry.id} path={qBase} />
        </article>
      </div>
    </>
  );
}

// ---------- Editor (admin) ----------------------------------------------

function toText(f: Field, v: any): string {
  if (v == null) return "";
  switch (f.type) {
    case "lines": return linesToText(v);
    case "rich": return (v as string[]).join("\n");
    case "sections": return sectionsToText(v);
    case "blocks": return blocksToText(v);
    case "qa": return qaToText(v);
    case "rows": return rowsToText(v, f.rowKeys || []);
    default: return String(v);
  }
}

export async function LibraryEditor({ sectionKey, slug, error }: { sectionKey: string; slug?: string; error?: string }) {
  const sec = getSection(sectionKey);
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) {
    return <div className="empty">Only the site admin can edit shared content.</div>;
  }
  const { data: subsites } = await supabase.from("subsites").select("*").order("sort");
  let entry: any = null;
  if (slug) {
    entry = (await supabase.from(sec.table).select("*").eq("slug", slug).maybeSingle()).data;
    if (!entry) notFound();
  }
  const save = saveEntry.bind(null, sec.key, entry?.id ?? null);
  const remove = entry ? deleteEntry.bind(null, sec.key, entry.id) : null;
  const tall = (f: Field) => (f.type === "sections" || f.type === "blocks" ? 14 : f.type === "rich" ? 8 : f.type === "qa" || f.type === "rows" ? 6 : f.type === "lines" ? 5 : 3);

  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <Link href={entry ? `/${sec.key}/${entry.slug}` : `/${sec.key}`} className="small">← Back</Link>
        <h1 className="page-title">{entry ? `Edit ${sec.noun}` : `New ${sec.noun}`} · {sec.title}</h1>
      </header>
      {error && <div className="warn">{error}</div>}
      <form action={save} className="card" style={{ gap: 16, maxWidth: 900 }}>
        <input type="hidden" name="orig_slug" value={entry?.slug ?? ""} />
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {sec.fields.filter((f) => ["text", "select", "subsite"].includes(f.type)).map((f) => (
            <label key={f.name} className="field" style={f.show === "title" ? { gridColumn: "1 / -1" } : undefined}>
              {f.label}{f.required ? " *" : ""}
              {f.type === "text" && <input name={f.name} defaultValue={entry?.[f.name] ?? ""} placeholder={f.placeholder} required={f.required} />}
              {f.type === "select" && (
                <select name={f.name} defaultValue={entry?.[f.name] ?? (f.required ? f.options?.[0] : "")} required={f.required}>
                  {!f.required && <option value="">Not set</option>}
                  {f.options!.map((o) => <option key={o} value={o}>{f.labels?.[o] ?? o}</option>)}
                </select>
              )}
              {f.type === "subsite" && (
                <select name={f.name} defaultValue={entry?.[f.name] ?? ""}>
                  <option value="">Not set</option>
                  {(subsites || []).map((s: Subsite) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </label>
          ))}
          <label className="field">
            Web name
            <input name="slug" defaultValue={entry?.slug ?? ""} placeholder="Made from the title if left blank" />
          </label>
        </div>
        {sec.fields.filter((f) => !["text", "select", "subsite", "date"].includes(f.type)).map((f) => (
          <label key={f.name} className="field">
            {f.label}
            <textarea name={f.name} rows={tall(f)} defaultValue={entry ? toText(f, entry[f.name]) : f.starter ?? ""} style={{ fontFamily: f.type === "sections" || f.type === "rows" ? "ui-monospace, Menlo, monospace" : undefined, fontSize: 14 }} />
            {f.hint && <span className="hint">{f.hint}</span>}
          </label>
        ))}
        <div className="stack" style={{ gap: 6 }}>
          <label className="check"><input type="checkbox" name="published" defaultChecked={entry?.published ?? false} /> Published (visible to all users)</label>
          <label className="check"><input type="checkbox" name="mark_reviewed" /> Mark as reviewed today</label>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-primary" type="submit">Save {sec.noun}</button>
        </div>
      </form>
      {remove && (
        <form action={remove} className="row" style={{ maxWidth: 900 }}>
          <label className="check" style={{ fontSize: 13 }}><input type="checkbox" required /> Yes, permanently delete this {sec.noun}</label>
          <button className="btn btn-danger btn-sm" type="submit">Delete</button>
        </form>
      )}
    </>
  );
}
