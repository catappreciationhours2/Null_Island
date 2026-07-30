import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID } from '$env/dynamic/private';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * Initiates Google OAuth for Calendar access.
 * Redirects user to Google's consent screen.
 * Usage: navigate to /auth/google-calendar
 */
export async function GET(event) {
  const origin      = event.url.origin;
  const redirectUri = `${origin}/auth/google-calendar/callback`;

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',   // always show consent to get refresh_token
  });

  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
