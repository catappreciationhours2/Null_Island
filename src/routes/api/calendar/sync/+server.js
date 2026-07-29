import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import { getValidToken, fetchCalendarEvents, eventToTaskFields } from '$lib/server/gcal.js';

/**
 * POST /api/calendar/sync
 * Fetches events from all linked + enabled calendars.
 * Returns arrays of tasks to create, update, or flag as deleted.
 * The client applies changes to appState — the server just provides the diff.
 */
export async function POST(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return json({ error: 'not_signed_in' }, { status: 401 });

  // Optionally accept existing task list from client to compute diff
  let existingTasks = [];
  try {
    const body = await event.request.json().catch(() => ({}));
    existingTasks = body.tasks ?? [];
  } catch { /* ignore */ }

  // Build a lookup: calendarEventId → existing task
  const taskByEventId = {};
  for (const t of existingTasks) {
    if (t.calendarEventId) taskByEventId[t.calendarEventId] = t;
  }

  const { data: accounts } = await supabase
    .from('calendar_accounts')
    .select('*')
    .eq('user_id', user.id);

  if (!accounts?.length) return json({ toCreate: [], toUpdate: [], toDelete: [] });

  const toCreate = [];
  const toUpdate = [];
  const seenEventIds = new Set();

  for (const account of accounts) {
    const enabledCals = (account.selected_calendars ?? []).filter(c => c.enabled);
    if (!enabledCals.length) continue;

    let token;
    try {
      token = await getValidToken(supabase, account);
    } catch (e) {
      console.error(`Token refresh failed for ${account.google_email}:`, e);
      continue;
    }

    for (const cal of enabledCals) {
      let events;
      try {
        events = await fetchCalendarEvents(token, cal.id);
      } catch (e) {
        console.error(`Failed to fetch ${cal.id} for ${account.google_email}:`, e);
        continue;
      }

      for (const ev of events) {
        seenEventIds.add(ev.id);
        const fields = eventToTaskFields(ev, account.google_email, cal.id);
        const existing = taskByEventId[ev.id];

        if (!existing) {
          toCreate.push(fields);
        } else if (!existing.calendarPinned) {
          // Only update if not pinned (pinned = manually modified via terminal)
          // Check if anything meaningful changed
          const changed =
            existing.title     !== fields.title     ||
            existing.chunks    !== fields.chunks     ||
            existing.chunkMins !== fields.chunkMins  ||
            existing.calendarStart !== fields.calendarStart;

          if (changed) toUpdate.push({ id: existing.id, ...fields });
        }
      }
    }
  }

  // Find calendar tasks that no longer exist in Google Calendar (event deleted)
  const toDelete = existingTasks
    .filter(t => t.calendarEventId && !seenEventIds.has(t.calendarEventId))
    .map(t => t.id);

  return json({ toCreate, toUpdate, toDelete });
}
