import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/server";

async function save(formData: FormData) {
  "use server";
  const { supabase, user } = await getSessionProfile();
  if (!user) return;
  const pgy = Number(formData.get("pgy")) || null;
  const update: Record<string, unknown> = { display_name: String(formData.get("display_name") || ""), pgy };
  const program = String(formData.get("program") || "").trim();
  if (program) update.program = program;
  await supabase.from("profiles").update(update).eq("id", user.id);
  revalidatePath("/", "layout");
}

export default async function AccountPage() {
  const { user, profile } = await getSessionProfile();
  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">{user?.email}</span>
        <h1 className="page-title">Account</h1>
      </header>
      <form action={save} className="card" style={{ maxWidth: 560, gap: 14 }}>
        <label className="field">
          Name
          <input name="display_name" defaultValue={profile?.display_name ?? ""} />
        </label>
        <label className="field">
          Program
          <input name="program" defaultValue={profile?.program ?? ""} placeholder="e.g. MCW Otolaryngology" disabled={!!profile?.program && profile.role !== "admin"} />
          <span className="hint">Program-only posts are shown based on this. Once set, ask the site admin to change it.</span>
        </label>
        <label className="field">
          PGY level
          <select name="pgy" defaultValue={profile?.pgy ?? ""}>
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>PGY-{n}</option>
            ))}
          </select>
        </label>
        <div>
          <button className="btn btn-primary" type="submit">Save</button>
        </div>
      </form>
    </>
  );
}
