"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";

const SUBSPECIALTIES = ["Head & neck", "Otology", "Rhinology", "Laryngology", "Facial plastics", "Pediatric", "Sleep", "General"];

async function upsertProgress(chapterId: number, patch: Record<string, unknown>) {
  const { supabase, user } = await getSessionProfile();
  if (!user) return;
  const { data: existing } = await supabase
    .from("chapter_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle();
  await supabase.from("chapter_progress").upsert({ ...(existing || {}), user_id: user.id, chapter_id: chapterId, ...patch });
  revalidatePath("/curriculum");
}

export async function saveProgress(chapterId: number, formData: FormData) {
  const status = String(formData.get("status") || "Not started");
  const scheduled = String(formData.get("scheduled_for") || "") || null;
  await upsertProgress(chapterId, {
    status: scheduled && status === "Not started" ? "Scheduled" : status,
    scheduled_for: scheduled,
    completed_at: status === "Done" ? new Date().toISOString().slice(0, 10) : null,
  });
}

export async function saveChecklist(chapterId: number, done: number[]) {
  await upsertProgress(chapterId, { checklist_done: done });
}

export async function setChapterFile(chapterId: number, path: string | null) {
  const { supabase, user } = await getSessionProfile();
  if (!user) return;
  if (path === null) {
    const { data } = await supabase.from("chapter_progress").select("file_path").eq("user_id", user.id).eq("chapter_id", chapterId).maybeSingle();
    if (data?.file_path) await supabase.storage.from("chapter-files").remove([data.file_path]);
  } else if (!path.startsWith(user.id + "/")) {
    return;
  }
  await upsertProgress(chapterId, { file_path: path });
}

export async function saveChecklistTemplate(formData: FormData) {
  const { supabase, user } = await getSessionProfile();
  if (!user) return;
  const items = String(formData.get("items") || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
  await supabase.from("profiles").update({ prereading_checklist: items }).eq("id", user.id);
  revalidatePath("/curriculum");
  redirect("/curriculum");
}

// Admin: paste a table of contents, one chapter per line:
//   number | title | subspecialty | subsite (subspecialty and subsite optional)
export async function importChapters(formData: FormData) {
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) throw new Error("Only the site admin can import chapters.");
  const textbookId = Number(formData.get("textbook_id"));
  const edition = String(formData.get("edition") || "").trim();
  if (edition) await supabase.from("textbooks").update({ edition }).eq("id", textbookId);

  const { data: subsites } = await supabase.from("subsites").select("id, name");
  const findSubsite = (name: string) => subsites?.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id ?? null;
  const findSpec = (name: string) => SUBSPECIALTIES.find((s) => s.toLowerCase() === name.toLowerCase()) ?? "General";

  const rows: Record<string, unknown>[] = [];
  const problems: string[] = [];
  String(formData.get("chapters") || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = (line.includes("|") ? line.split("|") : line.includes("\t") ? line.split("\t") : line.split(",")).map((p) => p.trim());
      const number = parseInt(parts[0], 10);
      if (!number || !parts[1]) {
        problems.push(`Line ${i + 1}: needs a chapter number and a title`);
        return;
      }
      rows.push({ textbook_id: textbookId, number, title: parts[1], subspecialty: findSpec(parts[2] || ""), subsite_id: parts[3] ? findSubsite(parts[3]) : null });
    });

  if (problems.length) redirect("/curriculum/import?error=" + encodeURIComponent(problems.slice(0, 5).join("; ")));
  const { error } = await supabase.from("chapters").upsert(rows, { onConflict: "textbook_id,number" });
  if (error) redirect("/curriculum/import?error=" + encodeURIComponent(error.message));
  revalidatePath("/curriculum");
  redirect("/curriculum/import?message=" + encodeURIComponent(`Imported ${rows.length} chapters.`));
}

export async function updateChapter(chapterId: number, formData: FormData) {
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) return;
  const sub = String(formData.get("subsite_id") || "");
  await supabase
    .from("chapters")
    .update({
      title: String(formData.get("title") || ""),
      subspecialty: String(formData.get("subspecialty") || "General"),
      subsite_id: sub ? Number(sub) : null,
    })
    .eq("id", chapterId);
  revalidatePath("/curriculum");
}
