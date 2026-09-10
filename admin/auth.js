// admin/auth.js — shared session guard for admin pages.
// Client-side gate for UX only; real access control is Supabase RLS.
import { getClient } from "./config.js";

// Redirect to the login page unless a session exists. `loginHref` is
// resolved against the CALLING PAGE's URL, so subpages pass "../login/".
export async function requireAuth(loginHref = "../login/") {
  const sb = getClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.replace(new URL(loginHref, location.href));
    // Halt the caller's module while the redirect happens.
    await new Promise(() => {});
  }
  return session;
}

export async function signOut(loginHref = "../login/") {
  await getClient().auth.signOut();
  location.replace(new URL(loginHref, location.href));
}
