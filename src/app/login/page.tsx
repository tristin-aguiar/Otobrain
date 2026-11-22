import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/this-week");
}

async function signUp(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || "";
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    options: {
      emailRedirectTo: origin + "/auth/confirm",
      data: { display_name: String(formData.get("name") || "") },
    },
  });
  if (error) redirect("/login?mode=signup&error=" + encodeURIComponent(error.message));
  redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account, then sign in."));
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const signup = sp.mode === "signup";
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 28, gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="brand-name" style={{ fontSize: 26 }}>Otobrain</span>
          <span className="muted small">{signup ? "Create your account" : "Sign in to your account"}</span>
        </div>
        {sp.error && <div className="warn">{sp.error}</div>}
        {sp.message && <div className="warn">{sp.message}</div>}
        <form action={signup ? signUp : signIn} className="stack" style={{ gap: 12 }}>
          {signup && (
            <label className="field">
              Your name
              <input name="name" type="text" autoComplete="name" required />
            </label>
          )}
          <label className="field">
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Password
            <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} required />
          </label>
          <button className="btn btn-primary" type="submit">
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
        <span className="small muted">
          {signup ? (
            <>Already have an account? <Link href="/login">Sign in</Link></>
          ) : (
            <>New here? <Link href="/login?mode=signup">Create an account</Link></>
          )}
        </span>
        <span className="small muted" style={{ fontSize: 12 }}>
          Never enter patient names, record numbers, dates of birth or other identifiers anywhere on this site.
        </span>
      </div>
    </div>
  );
}
