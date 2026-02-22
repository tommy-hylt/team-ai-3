import webpush from "web-push";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAPID_FILE = join(__dirname, "vapid.json");
const SUBS_FILE = join(__dirname, "subscriptions.json");

let vapidKeys: { publicKey: string; privateKey: string };

export async function initPush() {
  try {
    const data = await readFile(VAPID_FILE, "utf-8");
    vapidKeys = JSON.parse(data);
  } catch {
    vapidKeys = webpush.generateVAPIDKeys();
    await writeFile(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
  }

  webpush.setVapidDetails(
    "mailto:example@yourdomain.org",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export function getPublicKey() {
  return vapidKeys.publicKey;
}

export async function saveSubscription(subscription: any) {
  let subs: any[] = [];
  try {
    const data = await readFile(SUBS_FILE, "utf-8");
    subs = JSON.parse(data);
  } catch {}

  // Deduplicate
  if (!subs.find(s => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    await writeFile(SUBS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  }
}

export async function sendNotification(title: string, body: string, url: string = "/") {
  let subs: any[] = [];
  try {
    const data = await readFile(SUBS_FILE, "utf-8");
    subs = JSON.parse(data);
  } catch { return; }

  const payload = JSON.stringify({ title, body, url });

  const promises = subs.map(sub => 
    webpush.sendNotification(sub, payload).catch(err => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Remove expired subscription
        return sub.endpoint; 
      }
      console.error("Push error", err);
      return null;
    })
  );

  const results = await Promise.all(promises);
  const expiredEndpoints = results.filter(r => typeof r === "string");

  if (expiredEndpoints.length > 0) {
    subs = subs.filter(s => !expiredEndpoints.includes(s.endpoint));
    await writeFile(SUBS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  }
}
