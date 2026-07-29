import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';

/** GET /api/calendar/accounts — list linked calendar accounts for the signed-in user */
export async function GET(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  const { data, error } = await supabase
    .from('calendar_accounts')
    .select('id, google_email, selected_calendars, token_expiry, updated_at')
    .eq('user_id', user.id)
    .order('created_at');

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ accounts: data ?? [] });
}

/** DELETE /api/calendar/accounts?id=UUID — unlink a calendar account */
export async function DELETE(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  const id = event.url.searchParams.get('id');
  if (!id) return json({ error: 'missing id' }, { status: 400 });

  const { error } = await supabase
    .from('calendar_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ ok: true });
}

/** PATCH /api/calendar/accounts — update selected_calendars for an account */
export async function PATCH(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  const { id, selected_calendars } = await event.request.json();
  if (!id) return json({ error: 'missing id' }, { status: 400 });

  const { error } = await supabase
    .from('calendar_accounts')
    .update({ selected_calendars })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ ok: true });
}
