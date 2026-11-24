import Link from "next/link";
import ImportGuides from "@/components/ImportGuides";
import { getSessionProfile } from "@/lib/supabase/server";

export const metadata = { title: "Import consult guides" };

export default async function Page() {
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) return <div className="empty">Only the site admin can import guides.</div>;
  const [{ data: existing }, { data: subsites }] = await Promise.all([
    supabase.from("consult_guides").select("slug, title, published"),
    supabase.from("subsites").select("name").order("sort"),
  ]);
  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <Link href="/consult-guides" className="small">← Consult guides</Link>
        <h1 className="page-title">Import consult guides</h1>
        <p className="lead">Paste guides written in the template. They are cleaned up to the house style, shown for review, and saved as unpublished drafts.</p>
      </header>
      <ImportGuides existing={existing || []} subsites={(subsites || []).map((s) => s.name)} />
    </>
  );
}
