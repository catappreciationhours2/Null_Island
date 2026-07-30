import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Supabase session middleware.
 * Runs before every request (including API routes) to ensure the access token
 * is refreshed if needed. Without this, expired tokens cause silent 401s.
 */
async function supabaseMiddleware({ event, resolve }) {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' });
          });
        },
      },
    }
  );

  /**
   * safeGetSession validates the session server-side and refreshes the access
   * token if it's about to expire. We store both on event.locals so route
   * handlers can use them without re-fetching.
   */
  event.locals.safeGetSession = async () => {
    const { data: { session }, error } = await event.locals.supabase.auth.getSession();
    if (!session || error) return { session: null, user: null };

    const { data: { user }, error: userError } = await event.locals.supabase.auth.getUser();
    if (userError) return { session: null, user: null };
    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      // Allow Supabase response headers to pass through to the client
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
}

export const handle = sequence(supabaseMiddleware);
