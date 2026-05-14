/**
 * send-push-notification Edge Function.
 *
 * Called by Postgres triggers (via pg_net.http_post in the
 * `dispatch_push_notification` helper) when a notification-eligible
 * event fires server-side. Triggers run as SECURITY DEFINER and
 * inject the service-role JWT into the Authorization header — we
 * validate that here before touching any data.
 *
 * Payload shape (POST body):
 *   {
 *     recipient_id: uuid,
 *     kind:         'challenges' | 'friend_requests' | 'acceptances'
 *                  | 'duel_invites' | 'score_beats',
 *     title:        string,
 *     body:         string,
 *     data?:        Record<string, unknown>  // routed via the app's
 *                                              notificationRouter
 *   }
 *
 * Flow:
 *   1. Auth: header `Authorization: Bearer <service-role-jwt>` must
 *      match SERVICE_ROLE_KEY (Supabase auto-injects this env).
 *   2. Lookup: SELECT expo_push_token FROM push_tokens WHERE user_id = recipient_id.
 *   3. Send: batch the tokens into one POST to https://exp.host/--/api/v2/push/send.
 *   4. Cleanup: when Expo's response says DeviceNotRegistered for a
 *      token, delete the row so we don't keep paying for ghost tokens.
 *
 * Returns 200 with { sent, removed, errors } so the trigger's
 * pg_net response (visible in net._http_response) is useful for
 * debugging.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PushPayload {
  recipient_id: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoResponse {
  data?: ExpoPushTicket[];
  errors?: Array<{ code: string; message: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let payload: PushPayload;
  try {
    payload = (await req.json()) as PushPayload;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!payload.recipient_id || !payload.kind || !payload.title || !payload.body) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Auth — Postgres triggers post a shared secret stored in
  // notification_config. The same row is the canonical source for
  // both the trigger (sender) and this function (receiver), so the
  // two never drift. The service-role key is used here only to
  // read the row (the table has RLS but no policy for `authenticated`,
  // so this row is only readable with the service role).
  const auth = req.headers.get('Authorization') ?? '';
  const presented = auth.replace(/^Bearer\s+/i, '');
  const { data: cfg, error: cfgError } = await admin
    .from('notification_config')
    .select('service_role_jwt')
    .eq('id', 1)
    .single();
  if (cfgError || !cfg) {
    console.error('[send-push] notification_config missing:', cfgError?.message);
    return json({ error: 'Server misconfigured' }, 500);
  }
  if (!presented || presented !== cfg.service_role_jwt) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // 1. Lookup recipient tokens.
  const { data: tokens, error: tokensError } = await admin
    .from('push_tokens')
    .select('id, expo_push_token, platform')
    .eq('user_id', payload.recipient_id);

  if (tokensError) {
    console.error('[send-push] tokens lookup failed:', tokensError.message);
    return json({ error: 'Token lookup failed', details: tokensError.message }, 500);
  }
  if (!tokens || tokens.length === 0) {
    return json({ sent: 0, removed: 0, reason: 'no_tokens' }, 200);
  }

  // 2. Build the Expo Push payloads. One per token.
  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: 'high' as const,
    // iOS uses thread-id for grouping; group by kind for now so e.g.
    // multiple challenges from different friends collapse together.
    // (Future: group by friend instead.)
    _displayInForeground: false,
  }));

  // 3. Send. Expo's API accepts a single message or a batch (up to 100).
  let expoResp: ExpoResponse = {};
  try {
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    expoResp = (await r.json()) as ExpoResponse;
  } catch (e) {
    console.error('[send-push] Expo fetch threw:', e);
    return json({ error: 'Expo push failed', details: String(e) }, 502);
  }

  // 4. Walk tickets — delete tokens Expo says are bad.
  const tickets = expoResp.data ?? [];
  const removedIds: string[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = tokens[i];
    if (!ticket || !token) continue;
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      removedIds.push(token.id);
    }
  }
  if (removedIds.length > 0) {
    await admin.from('push_tokens').delete().in('id', removedIds);
  }

  const okCount = tickets.filter((t) => t?.status === 'ok').length;
  const errCount = tickets.filter((t) => t?.status === 'error').length;
  return json({
    sent: okCount,
    errors: errCount,
    removed: removedIds.length,
    expo_response: expoResp,
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
    },
  });
}
