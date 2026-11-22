import Link from "next/link";
import { getSessionProfile } from "@/lib/supabase/server";
import { saveChecklistTemplate } from "@/lib/curriculum-actions";

export const metadata = { title: "My pre-reading checklist" };

export default async function ChecklistPage() {
  const { profile } = await getSessionProfile();
  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <Link href="/curriculum" className="small">← Curriculum</Link>
        <h1 className="page-title">My pre-reading checklist</h1>
        <p className="lead">These steps appear on every chapter. One per line, up to 12.</p>
      </header>
      <form action={saveChecklistTemplate} className="card" style={{ gap: 14, maxWidth: 700 }}>
        <label className="field">Checklist
          <textarea name="items" rows={8} defaultValue={(profile?.prereading_checklist || []).join("\n")} />
        </label>
        <div><button className="btn btn-primary" type="submit">Save checklist</button></div>
      </form>
    </>
  );
}
