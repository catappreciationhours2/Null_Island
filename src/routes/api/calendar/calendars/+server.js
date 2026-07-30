import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import { getValidToken, listCalendars } from '$lib/server/gcal.js';

/** GET /api/calendar/calendars?accountId=UUID — list all calendars for a linked account */
export async function GET(event) {
  const supabase   = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  const accountId = event.url.searchParams.get('accountId');
  if (!accountId) return json({ error: 'missing accountId' }, { status: 400 });

  const { data: account, error } = await supabase
    .from('calendar_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (error || !account) return json({ error: 'account not found' }, { status: 404 });

  try {
    const gcalEnv = event.platform?.env ?? process.env;
    const token     = await getValidToken(supabase, account, gcalEnv.GOOGLE_CLIENT_ID, gcalEnv.GOOGLE_CLIENT_SECRET);
    const calendars = await listCalendars(token);
    return json({
      calendars: calendars.map(c => ({
        id:          c.id,
        name:        c.summary,
        description: c.description,
        color:       c.backgroundColor,
        primary:     c.primary ?? false,
      }))
    });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}
