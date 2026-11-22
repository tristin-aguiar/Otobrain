import { saveNote } from "@/lib/actions";
import { getSessionProfile } from "@/lib/supabase/server";

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

// A private note box. Each user sees and edits only their own.
export default async function Notes({
  itemType,
  itemId,
  path,
  label = "My notes",
  placeholder = "Write your notes…",
}: {
  itemType: string;
  itemId: number;
  path: string;
  label?: string;
  placeholder?: string;
}) {
  const { supabase, user } = await getSessionProfile();
  const { data } = await supabase
    .from("notes")
    .select("body, updated_at")
    .eq("user_id", user!.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  return (
    <form action={saveNote.bind(null, itemType, itemId, path)} className="private">
      <span className="row" style={{ gap: 6, fontWeight: 600 }}>
        <LockIcon /> {label} · only you can see this
      </span>
      <textarea name="body" rows={4} defaultValue={data?.body ?? ""} placeholder={placeholder} className="input" style={{ resize: "vertical", lineHeight: 1.5 }} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 12 }}>{data?.updated_at ? "Saved " + new Date(data.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
        <button className="btn btn-sm" type="submit">Save notes</button>
      </div>
    </form>
  );
}
