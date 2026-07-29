import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import { getValidToken, upsertCalendarEvent } from '$lib/server/gcal.js';

/**
 * POST /api/calendar/events
 * Push a task to Google Calendar (create or update event).
 * Called from the terminal `cal add` and `cal update` commands.
 *
 * Body:
 * {
 *   accountEmail: string,
 *   calendarId:   string,
 *   title:        string,
 *   date:         'YYYY-MM-DD',
 *   time:         'HH:MM',          // 24h
 *   durationMins: number,
 *   recur?:       'daily'|'weekly'|'monthly'|'none',
 *   invitees?:    string[],         // email addresses
 *   eventId?:     string,           // if updating existing event
 * }
 */
export async function POST(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  let body;
  try { body = await event.request.json(); }
  catch { return json({ error: 'invalid JSON' }, { status: 400 }); }

  const { accountEmail, calendarId, title, date, time, durationMins = 60, recur, invitees = [], eventId } = body;

  if (!accountEmail || !calendarId || !title || !date || !time) {
    return json({ error: 'missing required fields: accountEmail, calendarId, title, date, time' }, { status: 400 });
  }

  // Fetch account row
  const { data: account } = await supabase
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('google_email', accountEmail)
    .single();

  if (!account) return json({ error: `No linked account for ${accountEmail}` }, { status: 404 });

  let token;
  try {
    token = await getValidToken(supabase, account);
  } catch (e) {
    return json({ error: `Token refresh failed: ${e.message}` }, { status: 500 });
  }

  // Build event body
  const startDt = new Date(`${date}T${time}:00`);
  const endDt   = new Date(startDt.getTime() + durationMins * 60_000);

  const eventBody = {
    summary: title,
    start: { dateTime: startDt.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:   { dateTime: endDt.toISOString(),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };

  // Recurrence
  if (recur && recur !== 'none') {
    const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' };
    const freq = freqMap[recur];
    if (freq) eventBody.recurrence = [`RRULE:FREQ=${freq}`];
  }

  // Invitees
  if (invitees.length) {
    eventBody.attendees = invitees.map(email => ({ email }));
  }

  try {
    const created = await upsertCalendarEvent(token, calendarId, eventBody, eventId ?? null);
    return json({ ok: true, eventId: created.id, htmlLink: created.htmlLink });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
