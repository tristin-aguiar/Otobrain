import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { getSessionProfile, createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin } = await getSessionProfile();
  if (!user) redirect("/login");
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <div className="shell">
      <Sidebar
        name={profile?.display_name || user.email || "Account"}
        program={profile?.program ?? null}
        isAdmin={isAdmin}
        theme={theme}
        signOut={signOut}
      />
      <main className="main">{children}</main>
    </div>
  );
}
