import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { CronExpressionParser } from "cron-parser";
import { listMembers, getMember } from "./memberService.ts";
import { addRequest, getRequestStatus, updateRequestStatus, addResponse } from "./chatService.ts";
import { isMemberOccupied, runAgent } from "./agentService.ts";
import { broadcast } from "./notificationService.ts";
import { sendNotification } from "./pushService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Routine {
  id: string;
  cronPattern: string;
  requestText: string;
  startTime: string;
  lastTime: string;
  notify?: boolean;
}

interface QueuedRoutine {
  id: string; // The routine ID
  memberId: string;
  requestText: string;
  notify?: boolean;
}

const routineQueue: QueuedRoutine[] = [];
let lastRoutineDispatchTime = 0;
let loopInterval: NodeJS.Timeout | null = null;

export async function getRoutines(memberId: string): Promise<Routine[]> {
  const filePath = join(__dirname, "../members", memberId, "routines.json");
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveRoutines(memberId: string, routines: Routine[]) {
  const filePath = join(__dirname, "../members", memberId, "routines.json");
  await writeFile(filePath, JSON.stringify(routines, null, 2), "utf-8");
}

export function startRoutineLoop() {
  if (!loopInterval) {
    console.log("[routineService] Starting routine loop...");
    loopInterval = setInterval(() => {
      processRoutines().catch(err => console.error("[routineService] Loop Error:", err));
    }, 5000);
  }
}

export function stopRoutineLoop() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

async function processRoutines() {
  const now = new Date();

  // 1. Refresh in-memory list: read all routines.json files
  const members = await listMembers();
  
  for (const member of members) {
    if (!member) continue;
    
    let routines = await getRoutines(member.id);
    let changed = false;

    // Remove stale routines from queue
    const currentRoutineIds = new Set(routines.map((r) => r.id));
    for (let i = routineQueue.length - 1; i >= 0; i--) {
      if (routineQueue[i].memberId === member.id && !currentRoutineIds.has(routineQueue[i].id)) {
        routineQueue.splice(i, 1);
      }
    }

    // Process each routine to see if it should fire
    for (const routine of routines) {
      try {
        const currentDate = new Date(routine.lastTime || routine.startTime || now.toISOString());
        const interval = CronExpressionParser.parse(routine.cronPattern, {
          currentDate,
        });
        
        const nextTime = interval.next().toDate();

        if (nextTime <= now) {
          routine.lastTime = now.toISOString();
          changed = true;

          // Enqueue if not already in queue
          const alreadyQueued = routineQueue.find((q) => q.memberId === member.id && q.id === routine.id);
          if (!alreadyQueued) {
            routineQueue.push({
              id: routine.id,
              memberId: member.id,
              requestText: routine.requestText,
              notify: routine.notify !== undefined ? routine.notify : true, // Default to true for backward compatibility
            });
          }
        }
      } catch (err) {
        // Invalid cron pattern, ignore
        console.error(`[routineService] Invalid cron pattern for member ${member.id}: "${routine.cronPattern}". Error: ${(err as any).message}`);
      }
    }

    if (changed) {
      await saveRoutines(member.id, routines);
    }
  }

  // 2. Process the queue
  // Global throttle: Max 1 request per 5 seconds
  if (now.getTime() - lastRoutineDispatchTime < 5000) {
    return;
  }

  for (let i = 0; i < routineQueue.length; i++) {
    const queued = routineQueue[i];
    
    // Check if member is occupied by other requests
    if (!isMemberOccupied(queued.memberId)) {
      // Dequeue and dispatch
      routineQueue.splice(i, 1);
      lastRoutineDispatchTime = Date.now();
      dispatchRoutineRequest(queued.memberId, queued.requestText, queued.notify);
      break; // Only dispatch 1 request globally per 5 seconds
    }
  }
}

async function dispatchRoutineRequest(memberId: string, text: string, notify?: boolean) {
  const member = await getMember(memberId);
  if (!member) return;

  const request = {
    id: randomUUID(),
    text,
    requester: "Routine",
    requestTime: new Date(),
    notify: notify,
    status: "running" as const,
  };

  await addRequest(memberId, request);
  broadcast(memberId, "request", request);

  try {
    console.log(`[routineService] Running routine agent for ${memberId}...`);
    const agentResult = await runAgent(member, request.text, request.id);

    // Check if aborted during execution
    const currentStatus = await getRequestStatus(memberId, request.id);
    if (currentStatus === "aborted") return;

    const response = {
      text: agentResult.text,
      time: new Date(),
      requestId: request.id,
      agent: agentResult.agentName,
      notify: request.notify,
    };

    await addResponse(memberId, response);
    await updateRequestStatus(memberId, request.id, "completed");
    broadcast(memberId, "response", response);
    broadcast(memberId, "status_update", { id: request.id, status: "completed" });

    if (response.notify !== false) {
      sendNotification(`Routine message from ${member.name}`, agentResult.text.substring(0, 100), `/${memberId}`);
    }
  } catch (e) {
    console.error(`[routineService] Routine agent error for ${memberId}:`, e);
  }
}
