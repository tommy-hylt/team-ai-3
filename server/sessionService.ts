import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Session {
  agent: string;
  status: "active" | "expired";
  sessionId: string;
  startTime: string;
  lastTime: string;
}

function sessionsPath(memberName: string): string {
  return join(__dirname, "../members", memberName, "sessions.json");
}

export async function loadSessions(memberName: string): Promise<Session[]> {
  try {
    const content = await readFile(sessionsPath(memberName), "utf-8");
    return JSON.parse(content) as Session[];
  } catch {
    return [];
  }
}

async function saveSessions(memberName: string, sessions: Session[]): Promise<void> {
  await writeFile(sessionsPath(memberName), JSON.stringify(sessions, null, 2), "utf-8");
}

export async function getSessionId(memberName: string, agentName: string): Promise<string | undefined> {
  const sessions = await loadSessions(memberName);
  const active = sessions.find(s => s.agent === agentName && s.status === "active");
  return active?.sessionId;
}

export async function saveSessionId(memberName: string, agentName: string, sessionId: string): Promise<void> {
  const sessions = await loadSessions(memberName);
  const now = new Date().toISOString();
  const existing = sessions.find(s => s.agent === agentName && s.status === "active");

  if (existing) {
    existing.sessionId = sessionId;
    existing.lastTime = now;
  } else {
    sessions.push({
      agent: agentName,
      status: "active",
      sessionId,
      startTime: now,
      lastTime: now,
    });
  }

  await saveSessions(memberName, sessions);
}

export async function expireSession(memberName: string, agentName: string): Promise<void> {
  const sessions = await loadSessions(memberName);
  const active = sessions.find(s => s.agent === agentName && s.status === "active");
  if (active) {
    active.status = "expired";
    active.lastTime = new Date().toISOString();
    await saveSessions(memberName, sessions);
  }
}

export async function expireAllSessions(memberName: string): Promise<void> {
  const sessions = await loadSessions(memberName);
  const now = new Date().toISOString();
  let changed = false;
  for (const session of sessions) {
    if (session.status === "active") {
      session.status = "expired";
      session.lastTime = now;
      changed = true;
    }
  }
  if (changed) {
    await saveSessions(memberName, sessions);
  }
}
