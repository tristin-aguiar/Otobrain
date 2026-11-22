import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import Notes from "@/components/Notes";
import { getSessionProfile } from "@/lib/supabase/server";
import { fmtDate, isoToCentralLocal, linesToText } from "@/lib/format";
import { deletePost, savePost } from "@/lib/post-actions";

export const CATEGORIES = ["New research", "Guideline updates", "Weekly didactics", "Grand rounds", "Program news", "Motivation"];
export const CAT_CLASS: Record<string, string> = {
  "New research": "sp-oto", "Guideline updates": "sp-hn", "Weekly didactics": "sp-rhino",
  "Grand rounds": "sp-laryn", "Program news": "sp-sleep", Motivation: "sp-fps",
};
export const NAME = "This week in Otolaryngology";

const readMins = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 220));
const when = (p: any) => fmtDate(p.publish_at || p.updated_at);

function Meta({ p }: { p: any }) {
  return (
    <div className="row">
      <span className={"tag " + CAT_CLASS[p.category]}>{p.category}</span>
      <span className="muted" style={{ fontSize: 12 }}>{when(p)}</span>
      {p.audience === "program" && <span className="tag tag-draft" style={{ fontSize: 11 }}>{p.program} only</span>}
      {p.status === "draft" && <span className="tag tag-draft" style={{ fontSize: 11 }}>Draft</span>}
      {p.status === "published" && p.publish_at && new Date(p.publish_at) > new Date() && <span className="tag tag-draft" style={{ fontSize: 11 }}>Scheduled</span>}
    </div>
  );
}

export async function PostFeed({ cat }: { cat?: string }) {
  const { supabase, isAdmin } = await getSessionProfile();
  const { data } = await supabase.from("posts").select("*").order("publish_at", { ascending: false, nullsFirst: false }).limit(100);
  const posts = (data || []) as any[];
  const pinned = posts.find((p) => p.pinned && p.status === "published");
  const list = posts.filter((p) => p !== pinned && (!cat || p.category === cat));
  const latest = (c: string) => posts.find((p) => p.category === c && p.status === "published");
  const didactics = latest("Weekly didactics");
  const rounds = latest("Grand rounds");
  const quote = latest("Motivation");
  const excerpt = (p: any) => (p.takeaways?.[0] || p.body.replace(/[#*\[\]]/g, "").slice(0, 180)) + (p.body.length > 180 && !p.takeaways?.[0] ? "…" : "");

  return (
    <>
      <header className="between">
        <div className="stack" style={{ gap: 6 }}>
          <div className="row"><span className="tag tag-shared">Visible to all users</span></div>
          <h1 className="page-title">{NAME}</h1>
        </div>
        {isAdmin && <Link className="btn btn-primary" href="/this-week/new">+ New post</Link>}
      </header>

      <div className="row" role="group" aria-label="Filter by category" style={{ gap: 6 }}>
        <Link className={"chip" + (!cat ? " on" : "")} href="/this-week">All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} className={"chip" + (cat === c ? " on" : "")} href={`/this-week?cat=${encodeURIComponent(c)}`}>{c}</Link>
        ))}
      </div>

      <div className="split">
        <section aria-label="Posts" style={{ flex: "3 1 540px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {pinned && (!cat || pinned.category === cat) && (
            <Link href={`/this-week/${pinned.slug}`} className="card" style={{ textDecoration: "none", color: "var(--ink)", border: "2px solid var(--accent)", padding: "22px 24px" }}>
              <div className="row"><span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-ink)" }}>Pinned</span><Meta p={pinned} /></div>
              <span className="serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>{pinned.title}</span>
              <span style={{ fontSize: 15, color: "var(--muted2)" }}>{excerpt(pinned)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{pinned.author_name} · {readMins(pinned.body)} min read</span>
            </Link>
          )}
          {list.map((p) => (
            <Link key={p.id} href={`/this-week/${p.slug}`} className="card" style={{ textDecoration: "none", color: "var(--ink)" }}>
              <Meta p={p} />
              <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</span>
              <span style={{ fontSize: 14, color: "var(--muted2)" }}>{excerpt(p)}</span>
              <span className="muted" style={{ fontSize: 12 }}>{p.author_name} · {readMins(p.body)} min read</span>
            </Link>
          ))}
          {!list.length && !pinned && <div className="empty">{isAdmin ? <>No posts yet. <Link href="/this-week/new">Write the first one</Link>.</> : "No posts yet."}</div>}
        </section>

        <aside style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card">
            <h2 style={{ fontSize: 16 }}>This week&apos;s didactics</h2>
            {didactics ? (
              <>
                <Link href={`/this-week/${didactics.slug}`} style={{ fontWeight: 500 }}>{didactics.title}</Link>
                <ul>{(didactics.takeaways || []).slice(0, 5).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </>
            ) : <span className="muted small">Posted each week under Weekly didactics.</span>}
          </section>
          <section className="card">
            <h2 style={{ fontSize: 16 }}>Grand rounds</h2>
            {rounds ? <Link href={`/this-week/${rounds.slug}`} style={{ fontWeight: 500 }}>{rounds.title}</Link> : <span className="muted small">Talks are posted under Grand rounds.</span>}
          </section>
          {quote?.takeaways?.[0] && (
            <figure className="private" style={{ margin: 0, padding: 20, gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>Quote of the week</span>
              <blockquote className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.45, color: "var(--ink)" }}>“{quote.takeaways[0]}”</blockquote>
              {quote.source && <figcaption>— {quote.source}</figcaption>}
            </figure>
          )}
        </aside>
      </div>
    </>
  );
}

export async function PostView({ slug }: { slug: string }) {
  const { supabase, isAdmin } = await getSessionProfile();
  const { data: p } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="between" style={{ alignItems: "center" }}>
        <Link href="/this-week" className="small">← {NAME}</Link>
        {isAdmin && <Link className="btn btn-sm" href={`/this-week/${p.slug}/edit`}>Edit post</Link>}
      </div>
      <header className="stack" style={{ gap: 12 }}>
        <Meta p={p} />
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.2 }}>{p.title}</h1>
        <span className="muted small">{p.author_name} · {when(p)} · {readMins(p.body)} min read</span>
      </header>
      {p.takeaways?.length > 0 && p.category !== "Motivation" && (
        <section style={{ padding: "18px 20px", borderRadius: 12, background: "var(--accent-soft)" }} className="stack">
          <h2 style={{ fontSize: 15, color: "var(--accent-ink)" }}>Key takeaways</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 15 }}>{p.takeaways.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
        </section>
      )}
      {p.category === "Motivation" && p.takeaways?.[0] && (
        <blockquote className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.45 }}>“{p.takeaways[0]}”{p.source && <footer className="small muted" style={{ fontFamily: "Inter, sans-serif", marginTop: 8 }}>— {p.source}</footer>}</blockquote>
      )}
      <Markdown text={p.body} />
      {p.source && p.category !== "Motivation" && (
        <section className="card" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Source</span>
          <span style={{ fontSize: 14 }}>{p.source}</span>
        </section>
      )}
      <Notes itemType="post" itemId={p.id} path={`/this-week/${p.slug}`} label="My notes on this post" placeholder="How this applies to my patients, what to bring up at didactics…" />
    </div>
  );
}

export async function PostEditor({ slug, error }: { slug?: string; error?: string }) {
  const { supabase, isAdmin, profile } = await getSessionProfile();
  if (!isAdmin) return <div className="empty">Only the site author can post.</div>;
  let p: any = null;
  if (slug) {
    p = (await supabase.from("posts").select("*").eq("slug", slug).maybeSingle()).data;
    if (!p) notFound();
  }
  const local = p?.publish_at ? isoToCentralLocal(p.publish_at) : "";
  return (
    <div style={{ width: "100%", maxWidth: 820, display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href={p ? `/this-week/${p.slug}` : "/this-week"} className="small">← Back</Link>
      <h1 className="page-title" style={{ fontSize: 28 }}>{p ? "Edit post" : "Write a post"}</h1>
      {error && <div className="warn">{error}</div>}
      <form action={savePost.bind(null, p?.id ?? null)} className="card" style={{ gap: 16, padding: 24 }}>
        <input type="hidden" name="orig_slug" value={p?.slug ?? ""} />
        <label className="field">Title *<input name="title" required defaultValue={p?.title ?? ""} style={{ fontSize: 16, fontWeight: 600 }} /></label>
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <label className="field">Category<select name="category" defaultValue={p?.category ?? "Program news"}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field">Who can see it
            <select name="audience" defaultValue={p?.audience ?? "everyone"}>
              <option value="everyone">Everyone</option>
              <option value="program">{profile?.program ? `${profile.program} only` : "My program only (set program first)"}</option>
            </select>
          </label>
          <label className="field">Publish at (Central time)<input type="datetime-local" name="publish_at" defaultValue={local} /><span className="hint">Leave blank to publish now.</span></label>
        </div>
        <label className="check"><input type="checkbox" name="pinned" defaultChecked={p?.pinned ?? false} /> Pin to the top of {NAME}</label>
        <label className="field">Key takeaways (one per line)
          <textarea name="takeaways" rows={4} defaultValue={linesToText(p?.takeaways)} />
          <span className="hint">For Motivation posts, put the quote on the first line and the attribution in Source.</span>
        </label>
        <label className="field">Body
          <textarea name="body" rows={14} defaultValue={p?.body ?? ""} placeholder={"## A heading\nA paragraph of text.\n\n- A bullet point\n- **Bold text** and [a link](https://example.org)"} />
          <span className="hint">## for a heading, - for bullets, **bold**, [link text](https://…).</span>
        </label>
        <label className="field">Source<input name="source" defaultValue={p?.source ?? ""} placeholder="Citation or link for research and guideline posts; attribution for quotes" /></label>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="submit" name="intent" value="draft">Save draft</button>
          <button className="btn btn-primary" type="submit" name="intent" value="publish">Publish</button>
        </div>
      </form>
      {p && (
        <form action={deletePost.bind(null, p.id)} className="row">
          <label className="check" style={{ fontSize: 13 }}><input type="checkbox" required /> Yes, permanently delete this post</label>
          <button className="btn btn-danger btn-sm" type="submit">Delete</button>
        </form>
      )}
    </div>
  );
}
