/**
 * src/lib/server/gcal.js
 * Server-only Google Calendar helpers (token refresh, API calls).
 * Never import from client-side code.
 */
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/dynamic/private';

/**
 * Refresh an expired Google access token.
 * Returns the new access_token and updated expiry ISO string.
 */
export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  const expiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiry };
}

/**
 * Get a valid access token for a calendar account row.
 * Refreshes and updates Supabase if expired.
 */
export async function getValidToken(supabase, account) {
  const isExpired = account.token_expiry
    ? new Date(account.token_expiry).getTime() < Date.now() + 60_000
    : true; // treat missing expiry as expired

  if (!isExpired) return account.access_token;

  const { accessToken, expiry } = await refreshAccessToken(account.refresh_token);

  await supabase
    .from('calendar_accounts')
    .update({ access_token: accessToken, token_expiry: expiry })
    .eq('id', account.id);

  return accessToken;
}

/**
 * Fetch events from Google Calendar for the next N days.
 */
export async function fetchCalendarEvents(accessToken, calendarId, daysAhead = 14) {
  // Start from midnight today so we don't miss events that started earlier today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeMin = today.toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86400_000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '100',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

/**
 * List all calendars for an account.
 */
export async function listCalendars(accessToken) {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`CalendarList API error: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

/**
 * Create or update a Google Calendar event.
 * If eventId is provided, patches the existing event.
 */
export async function upsertCalendarEvent(accessToken, calendarId, eventBody, eventId = null) {
  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(url, {
    method:  eventId ? 'PATCH' : 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar event upsert failed: ${res.status} ${err}`);
  }
  return res.json();
}

/**
 * Map a Google Calendar event to Null Island task fields.
 * Duration drives difficulty + chunking.
 */
export function eventToTaskFields(event, accountEmail, calendarId) {
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw   = event.end?.dateTime   ?? event.end?.date;

  const start       = new Date(startRaw);
  const end         = new Date(endRaw);
  const durationMin = Math.max(1, (end - start) / 60_000);

  let difficulty, chunks, chunkMins;

  if (durationMin <= 30) {
    difficulty = 'easy'; chunks = 1; chunkMins = durationMin;
  } else if (durationMin <= 60) {
    difficulty = 'easy'; chunks = 2; chunkMins = durationMin / 2;
  } else if (durationMin <= 90) {
    difficulty = 'med';  chunks = 2; chunkMins = durationMin / 2;
  } else if (durationMin <= 150) {
    difficulty = 'med';  chunks = 3; chunkMins = Math.round(durationMin / 3);
  } else if (durationMin <= 240) {
    difficulty = 'hard'; chunks = 4; chunkMins = Math.round(durationMin / 4);
  } else {
    difficulty = 'hard';
    chunks    = Math.min(Math.ceil(durationMin / 30), 10);
    chunkMins = Math.round(durationMin / chunks);
  }

  return {
    title:              event.summary?.trim() || '(no title)',
    difficulty,
    chunks,
    chunkMins,
    calendarEventId:    event.id,
    calendarAccountEmail: accountEmail,
    calendarId,
    calendarStart:      start.getTime(),
    calendarEnd:        end.getTime(),
    calendarPinned:     false,  // true = protected from sync overwrites
  };
}
