import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link in the sign-up confirmation email lands here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (token_hash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash })).error;
  return NextResponse.redirect(ok ? origin + "/this-week" : origin + "/login?error=" + encodeURIComponent("That link has expired. Please sign in."));
}
