import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { createSupabaseServerClient } from '$lib/supabase.js';

/**
 * Google Calendar OAuth callback.
 * Exchanges code for tokens and stores in calendar_accounts table.
 * Redirects back to app with ?cal_linked=1 so the UI can show the calendar picker.
 */
export async function GET(event) {
  const { url } = event;
  const code = url.searchParams.get('code');

  if (!code) throw redirect(303, '/?cal_error=no_code');

  const supabase    = createSupabaseServerClient(event);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) throw redirect(303, '/?cal_error=not_signed_in');

  const redirectUri = `${url.origin}/auth/google-calendar/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new Error('token exchange failed');
    const tokens = await tokenRes.json();

    // Get the Google account email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const googleEmail = userInfo.email;

    if (!googleEmail) throw new Error('could not get google email');

    // Calculate token expiry
    const expiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert into calendar_accounts
    const { error } = await supabase
      .from('calendar_accounts')
      .upsert({
        user_id:       user.id,
        google_email:  googleEmail,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry:  expiry,
        // Preserve existing selected_calendars on update
      }, {
        onConflict: 'user_id,google_email',
        ignoreDuplicates: false,
      });

    if (error) throw error;

    throw redirect(303, '/?cal_linked=1');
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    console.error('Google Calendar callback error:', e);
    throw redirect(303, '/?cal_error=oauth_failed');
  }
}
