import webpush from 'web-push';
import { getPushSubscriptions, removePushSubscription } from './db';
import { TASK_MAP } from './tasks';

// VAPID keys — generate once via: npx web-push generate-vapid-keys
// Store in Vercel env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = 'mailto:wgates50@gmail.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

function getMessagePreview(blocks: unknown[]): string {
  for (const block of blocks as Array<{ type: string; data: Record<string, unknown> }>) {
    if (block.type === 'text') return String(block.data.text).split('\n')[0].slice(0, 100);
    if (block.type === 'header') return String(block.data.text).slice(0, 100);
    if (block.type === 'weather_card') return `${block.data.conditions}, ${block.data.temp}\u00B0C`;
    if (block.type === 'event_card') return String(block.data.title);
    if (block.type === 'article_card') return String(block.data.title);
    if (block.type === 'finance_card') return `\u00A3${Number(block.data.totalSpend).toFixed(0)} spent this week`;
  }
  return 'New message';
}

export async function sendPushNotification(taskId: string, blocks: unknown[]): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const task = TASK_MAP[taskId];
  if (!task) return;

  const subscriptions = await getPushSubscriptions();
  const payload = JSON.stringify({
    title: `${task.icon} ${task.name}`,
    body: getMessagePreview(blocks),
    data: { taskId, url: `/?thread=${taskId}` },
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub as webpush.PushSubscription, payload);
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription expired — remove it
        await removePushSubscription((sub as { endpoint: string }).endpoint);
      }
    }
  }
}
