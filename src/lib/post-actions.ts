"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { centralToISO, parseLines, slugify } from "@/lib/format";

export async function savePost(id: number | null, formData: FormData) {
  const { supabase, user, profile, isAdmin } = await getSessionProfile();
  if (!user || !isAdmin) throw new Error("Only the site author can post.");
  const title = String(formData.get("title") || "").trim();
  const audience = String(formData.get("audience") || "everyone");
  const publishAt = String(formData.get("publish_at") || "");
  const intent = String(formData.get("intent") || "publish");
  const row: Record<string, unknown> = {
    title,
    category: String(formData.get("category")),
    audience,
    program: audience === "program" ? profile?.program || null : null,
    pinned: formData.get("pinned") === "on",
    takeaways: parseLines(String(formData.get("takeaways") || "")),
    body: String(formData.get("body") || ""),
    source: String(formData.get("source") || "").trim() || null,
    status: intent === "draft" ? "draft" : "published",
    publish_at: publishAt ? centralToISO(publishAt) : id ? undefined : new Date().toISOString(),
    author_id: user.id,
    author_name: profile?.display_name || "Site author",
  };
  if (row.publish_at === undefined) delete row.publish_at;
  if (audience === "program" && !row.program) {
    redirect(`/this-week/${id ? formData.get("orig_slug") + "/edit" : "new"}?error=` + encodeURIComponent("Set your program on the Account page before posting to a program only."));
  }
  if (!id) row.slug = slugify(title) + "-" + Date.now().toString(36).slice(-4);
  if (row.pinned) await supabase.from("posts").update({ pinned: false }).neq("id", id ?? -1);
  const { data, error } = id
    ? await supabase.from("posts").update(row).eq("id", id).select("slug").single()
    : await supabase.from("posts").insert(row).select("slug").single();
  if (error) redirect(`/this-week/${id ? formData.get("orig_slug") + "/edit" : "new"}?error=` + encodeURIComponent(error.message));
  revalidatePath("/this-week", "layout");
  redirect(`/this-week/${data!.slug}`);
}

export async function deletePost(id: number) {
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) return;
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/this-week", "layout");
  redirect("/this-week");
}
