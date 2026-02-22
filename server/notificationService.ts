import { Response } from "express";

const clients = new Map<string, Response[]>();

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

  const message = `event: ${event}
data: ${JSON.stringify(data)}

`;
  for (const client of list) {
    client.write(message);
  }
}
