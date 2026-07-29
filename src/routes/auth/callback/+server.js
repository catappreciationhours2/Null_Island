import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';

/**
 * OAuth callback handler.
 * Supabase redirects here after Google/GitHub login.
 * Exchanges the one-time code for a session and redirects home.
 */
export async function GET(event) {
  const { url, cookies } = event;
  const code  = url.searchParams.get('code');
  const next  = url.searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = createSupabaseServerClient(event);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        throw redirect(303, next);
      }
    } catch (e) {
      // Re-throw SvelteKit redirects, swallow SSL/network errors on corporate proxies
      if (e && typeof e === 'object' && 'status' in e) throw e;
    }
  }

  // Something went wrong — redirect home anyway, the modal will show signed-out state
  throw redirect(303, '/');
}
