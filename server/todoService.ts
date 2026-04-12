import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { listMembers } from "./memberService.ts";
import { addRequest } from "./chatService.ts";
import { isMemberBusy, spawnWorker } from "./agentService.ts";
import { broadcast } from "./notificationService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Todo {
  id: string;
  triggerTime: string; // "yyyy-MM-dd HH:mm" in server local time — when the request should fire
  requestText: string;
  notify: boolean;
  status: "active" | "disabled";
}

interface QueuedTodo {
  todoId: string;
  memberId: string;
  requestText: string;
  notify: boolean;
}

const todoQueue: QueuedTodo[] = [];
let lastTodoDispatchTime = 0;
let loopInterval: NodeJS.Timeout | null = null;

export async function getTodos(memberId: string): Promise<Todo[]> {
  const filePath = join(__dirname, "../members", memberId, "todos.json");
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveTodos(memberId: string, todos: Todo[]) {
  const filePath = join(__dirname, "../members", memberId, "todos.json");
  await writeFile(filePath, JSON.stringify(todos, null, 2), "utf-8");
}

export function startTodoLoop() {
  if (!loopInterval) {
    console.log("[todoService] Starting todo loop...");
    loopInterval = setInterval(() => {
      processTodos().catch(err => console.error("[todoService] Loop Error:", err));
    }, 5000);
  }
}

export function stopTodoLoop() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

async function processTodos() {
  const now = new Date();
  const members = await listMembers();

  for (const member of members) {
    if (!member) continue;

    const todos = await getTodos(member.id);

    // Remove stale queue entries for deleted todos
    const currentTodoIds = new Set(todos.map(t => t.id));
    for (let i = todoQueue.length - 1; i >= 0; i--) {
      if (todoQueue[i].memberId === member.id && !currentTodoIds.has(todoQueue[i].todoId)) {
        todoQueue.splice(i, 1);
      }
    }

    const toFire: Todo[] = [];
    const remaining: Todo[] = [];

    for (const todo of todos) {
      if (todo.status === "disabled") {
        remaining.push(todo);
        continue;
      }
      if (new Date(todo.triggerTime.replace(" ", "T")) <= now) {
        toFire.push(todo);
      } else {
        remaining.push(todo);
      }
    }

    // Enqueue fired todos
    for (const todo of toFire) {
      const alreadyQueued = todoQueue.find(q => q.memberId === member.id && q.todoId === todo.id);
      if (!alreadyQueued) {
        todoQueue.push({
          todoId: todo.id,
          memberId: member.id,
          requestText: todo.requestText,
          notify: todo.notify,
        });
      }
    }

    // Remove fired todos from file (one-shot — they don't repeat)
    if (toFire.length > 0) {
      await saveTodos(member.id, remaining);
    }
  }

  // Global throttle: max 1 dispatch per 5 seconds
  if (now.getTime() - lastTodoDispatchTime < 5000) return;

  for (let i = 0; i < todoQueue.length; i++) {
    const queued = todoQueue[i];
    if (!isMemberBusy(queued.memberId)) {
      todoQueue.splice(i, 1);
      lastTodoDispatchTime = Date.now();
      dispatchTodoRequest(queued.memberId, queued.requestText, queued.notify);
      break;
    }
  }
}

async function dispatchTodoRequest(memberId: string, text: string, notify: boolean) {
  const request = {
    id: randomUUID(),
    text,
    requester: "Todo",
    requestTime: new Date(),
    notify,
    echo: false,
    status: "running" as const,
  };

  await addRequest(memberId, request);
  broadcast(memberId, "request", request);
  spawnWorker(memberId, request.id);
  console.log(`[todoService] Spawned worker for ${memberId}, request ${request.id}`);
}
