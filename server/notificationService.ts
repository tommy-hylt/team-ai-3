import { Response } from "express";

const clients = new Map<string, Response[]>();

// Send a heartbeat every 30 seconds to keep SSE connections alive
setInterval(() => {
  for (const [memberId, list] of clients.entries()) {
    for (const client of list) {
      // Sending a comment in SSE keeps the connection open without triggering a named event listener
      client.write(":\n\n");
      if (typeof (client as any).flush === 'function') {
        (client as any).flush();
      }
    }
  }
}, 30000);

export function subscribe(memberId: string, res: Response) {
  const list = clients.get(memberId) || [];
  list.push(res);
  clients.set(memberId, list);

  res.on("close", () => {
    const current = clients.get(memberId) || [];
    clients.set(memberId, current.filter(c => c !== res));
  });
}

export function broadcast(memberId: string, event: string, data: any) {
  const list = clients.get(memberId);
  if (!list) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of list) {
    client.write(message);
    if (typeof (client as any).flush === 'function') {
      (client as any).flush();
    }
  }
}
