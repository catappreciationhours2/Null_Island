import { createSupabaseServerClient } from '$lib/supabase.js';

/**
 * Root layout server load.
 * Runs on every navigation server-side. Passes session + user to the layout.
 */
export async function load(event) {
  const supabase = createSupabaseServerClient(event);

  // getUser() validates the JWT with Supabase servers.
  // Wrapped in try/catch so corporate SSL proxies don't crash the app on local dev.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { user };
  } catch {
    return { user: null };
  }
}
