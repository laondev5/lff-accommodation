"use client";

import Pusher from "pusher-js";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1";

/** Private channels are authorised by our backend through the Next proxy (admin cookie is attached server-side). */
export function createPusher(extraAuthBody: Record<string, string> = {}) {
  if (!key) return null;
  return new Pusher(key, {
    cluster,
    channelAuthorization: {
      transport: "ajax",
      endpoint: "/api/backend/pusher/auth",
      customHandler: async ({ socketId, channelName }, callback) => {
        try {
          const res = await fetch("/api/backend/pusher/auth", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ socket_id: socketId, channel_name: channelName, ...extraAuthBody }),
          });
          if (!res.ok) throw new Error("auth failed");
          callback(null, await res.json());
        } catch (e) {
          callback(e as Error, null);
        }
      },
    },
  });
}
