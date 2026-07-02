import { spawn } from "child_process";
import fs from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import multer from "multer";
import { listMembers, getMember, getMemberDetails, updateMemberDetails, createMember, deleteMember } from "./memberService.ts";
import { getChatHistory, addRequest, addResponse, updateRequestStatus, getRequestStatus, clearChatHistory, getRequest, hasMemberRunningRequest } from "./chatService.ts";
import { runAgent, cancelRequest, cancelAllRequests, getServerId, isMemberBusy, registerProcess, unregisterProcess, spawnWorker } from "./agentService.ts";
import { expireAllSessions } from "./sessionService.ts";
import { listFiles, getFile, getFileBuffer, saveFile, saveBinaryFile, deleteFile, checkFileSync, getMemberRootPath } from "./fileService.ts";
import { subscribe, broadcast } from "./notificationService.ts";
import { initPush, getPublicKey, saveSubscription, sendNotification } from "./pushService.ts";
import { getRoutines, saveRoutines, startRoutineLoop, type Routine } from "./routineService.ts";
import { getTodos, saveTodos, startTodoLoop } from "./todoService.ts";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = 8699;

initPush().then(() => console.log("[server] Push notifications initialized"));

startRoutineLoop();
startTodoLoop();

app.use(cors());
app.use(express.json());

app.get("/api/push/public-key", (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

app.post("/api/push/subscribe", async (req, res) => {
  await saveSubscription(req.body);
  res.json({ ok: true });
});

app.get("/api/server/id", (req, res) => {
  res.json({ serverId: getServerId() });
});

app.get("/api/members", async (req, res) => {
  console.log("GET /api/members");
  const members = await listMembers();
  console.log(`Found ${members.length} members`);
  res.json(members);
});

app.post("/api/members", async (req, res) => {
  try {
    const details = await createMember(req.body);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: (error as any).message });
  }
});

app.get("/api/members/:id/details", async (req, res) => {
  const details = await getMemberDetails(req.params.id);
  if (!details) return res.status(404).json({ error: "Member not found" });
  res.json(details);
});

app.get("/api/members/:id/routines", async (req, res) => {
  const routines = await getRoutines(req.params.id);
  res.json(routines);
});

app.post("/api/members/:id/routines", async (req, res) => {
  try {
    const newRoutines: Routine[] = req.body;
    const existingRoutines = await getRoutines(req.params.id);
    const existingMap = new Map(existingRoutines.map(r => [r.id, r]));
    const now = new Date().toISOString();

    for (const routine of newRoutines) {
      const existing = existingMap.get(routine.id);
      if (existing?.status === "disabled" && routine.status === "active") {
        routine.lastTime = now; // skip any missed runs during suspension
      }
    }

    await saveRoutines(req.params.id, newRoutines);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as any).message });
  }
});

app.get("/api/members/:id/todos", async (req, res) => {
  const todos = await getTodos(req.params.id);
  res.json(todos);
});

app.post("/api/members/:id/todos", async (req, res) => {
  try {
    await saveTodos(req.params.id, req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as any).message });
  }
});

app.post("/api/members/:id/details", async (req, res) => {
  if (req.body.character !== undefined || req.body.memory !== undefined) {
    await expireAllSessions(req.params.id);
  }
  const details = await updateMemberDetails(req.params.id, req.body);
  res.json(details);
});

app.get("/api/members/:id/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  subscribe(req.params.id, res);
});

app.post("/api/processes", (req, res) => {
  const entry = req.body;
  if (!entry.requestId || !entry.pid) return res.status(400).json({ error: "requestId and pid are required" });
  registerProcess(entry);
  res.json({ ok: true });
});

app.delete("/api/processes/:requestId", (req, res) => {
  unregisterProcess(req.params.requestId);
  res.json({ ok: true });
});

app.post("/api/requests/:id/cancel", async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: "memberId is required" });

  const killed = cancelRequest(req.params.id);
  
  // Always update status to aborted even if no process was found (e.g. server restarted)
  await updateRequestStatus(memberId, req.params.id, "aborted");
  broadcast(memberId, "status_update", { id: req.params.id, status: "aborted" });
  
  res.json({ 
    ok: true, 
    killed, 
    message: killed ? "Process terminated" : "Request marked as aborted (no active process found)" 
  });
});

app.delete("/api/members/:id", async (req, res) => {
  console.log(`DELETE /api/members/${req.params.id}`);
  await deleteMember(req.params.id);
  res.json({ ok: true });
});

app.post("/api/members/:id/chat/clear", async (req, res) => {
  console.log(`POST /api/members/${req.params.id}/chat/clear`);
  cancelAllRequests(req.params.id);
  await clearChatHistory(req.params.id);
  await expireAllSessions(req.params.id);
  res.json({ ok: true });
});

app.get("/api/members/running", async (req, res) => {
  const members = await listMembers();
  const states: Record<string, boolean> = {};
  await Promise.all(members.map(async member => {
    states[member.id] = await hasMemberRunningRequest(member.id);
  }));
  res.json(states);
});

app.get("/api/members/:id", async (req, res) => {
  console.log(`GET /api/members/${req.params.id}`);
  const member = await getMember(req.params.id);
  if (!member) {
    console.warn(`Member not found: ${req.params.id}`);
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(member);
});

app.get("/api/members/:id/busy", (req, res) => {
  res.json({ busy: isMemberBusy(req.params.id) });
});

app.get("/api/members/:id/chat", async (req, res) => {
  console.log(`GET /api/members/${req.params.id}/chat`);
  const history = await getChatHistory(req.params.id);
  console.log(`Returning ${history.length} messages`);
  res.json(history);
});

app.post("/api/members/:id/responses", async (req, res) => {
  try {
    const memberId = req.params.id;
    const response = req.body;
    if (!response.time) response.time = new Date();
    console.log(`POST /api/members/${memberId}/responses for request ${response.requestId || "none"}`);

    const member = await getMember(memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Always add the response to the chat history
    await addResponse(memberId, response);

    // Broadcast the response via SSE
    broadcast(memberId, "response", response);

    // If there is a requestId, we can do extra logic (status update, echo)
    if (response.requestId) {
      const request = await getRequest(memberId, response.requestId);
      if (request) {
        // Update request status
        await updateRequestStatus(memberId, response.requestId, "completed");
        broadcast(memberId, "status_update", { id: response.requestId, status: "completed" });

        // Handle echo
        if (request.echo && request.requester) {
          const targetMember = await getMember(request.requester);
          if (targetMember) {
            console.log(`Echoing response from ${member.name} to ${targetMember.name}`);
            const echoRequest = {
              id: randomUUID(),
              text: response.text,
              requester: member.name,
              requestTime: new Date(),
              notify: Boolean(response.notify),
              echo: false,
              status: "running" as const,
            };
            await addRequest(targetMember.id, echoRequest);
            broadcast(targetMember.id, "request", echoRequest);
            handleAgentRequest(targetMember.id, echoRequest);
          }
        }
      }
    }
    
    // Push Notification
    if (response.notify) {
      sendNotification(`New message from ${member.name}`, response.text.substring(0, 100), `/${memberId}`);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error processing response:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function handleAgentRequest(memberId: string, request: any) {
  console.log(`Spawning detached worker for ${memberId}, request ${request.id}...`);
  spawnWorker(memberId, request.id);
}

app.post("/api/members/:id/request", async (req, res) => {
  try {
    const memberId = req.params.id;
    const { text, requester, notify, echo } = req.body;
    console.log(`POST /api/members/${memberId}/request from ${requester}: ${text}`);
    
    const member = await getMember(memberId);
    if (!member) {
      console.warn(`Member not found for request: ${memberId}`);
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Make notify mandatory. The caller must provide it.
    const shouldNotify = Boolean(notify);
    const shouldEcho = Boolean(echo);

    const request = {
      id: randomUUID(),
      text,
      requester,
      requestTime: new Date(),
      notify: shouldNotify,
      echo: shouldEcho,
      status: "running" as const,
    };

    // Guarantee storage and broadcast before responding to client
    await addRequest(memberId, request);
    broadcast(memberId, "request", request);

    // Respond immediately so the client isn't hanging
    res.json({ ok: true, requestId: request.id });

    // Run agent in the background
    try {
      handleAgentRequest(memberId, request);
    } catch (e) {
      console.error(`Unhandled error spawning worker for ${memberId}:`, e);
    }

  } catch (error) {
    console.error("Error handling request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", details: (error as any).message });
    }
  }
});

// File APIs
app.get("/api/requests/:id/logs", async (req, res) => {
  const logDir = path.join(__dirname, "logs");
  try {
    const files = await fs.promises.readdir(logDir);
    const matchingFiles = files.filter(f => f.startsWith(req.params.id + "-") && f.endsWith(".log"));
    if (matchingFiles.length === 0) {
      return res.status(404).json({ error: "Log not found" });
    }
    
    const logs = [];
    for (const f of matchingFiles) {
      const content = await fs.promises.readFile(path.join(logDir, f), "utf-8");
      logs.push({ filename: f, content });
    }
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

app.get("/api/members/:id/rootpath", (req, res) => {
  res.json({ rootPath: getMemberRootPath(req.params.id) });
});

app.get("/api/members/:id/files", async (req, res) => {
  const path = (req.query.path as string) || "";
  const entries = await listFiles(req.params.id, path);
  res.json(entries);
});

app.get("/api/members/:id/skills/:skillName/files/:fileName/sync", async (req, res) => {
  const { id, skillName, fileName } = req.params;
  const results = await checkFileSync(id, skillName, fileName);
  res.json(results);
});

const __serverDir = path.dirname(fileURLToPath(import.meta.url));
const MEMBERS_DIR = path.resolve(__serverDir, "../members");

const FILE_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp", ico: "image/x-icon",
  txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8", jsonc: "text/plain; charset=utf-8",
  ts: "text/plain; charset=utf-8", tsx: "text/plain; charset=utf-8",
  js: "text/javascript; charset=utf-8", jsx: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8", html: "text/html; charset=utf-8",
  xml: "text/xml; charset=utf-8", yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8", csv: "text/csv; charset=utf-8",
  sh: "text/plain; charset=utf-8", py: "text/plain; charset=utf-8",
  rb: "text/plain; charset=utf-8", go: "text/plain; charset=utf-8",
  rs: "text/plain; charset=utf-8", toml: "text/plain; charset=utf-8",
  env: "text/plain; charset=utf-8", log: "text/plain; charset=utf-8",
};

app.get("/api/members/:id/files-raw/*", async (req, res) => {
  const relativePath = (req.params as any)[0];
  const data = await getFileBuffer(req.params.id, relativePath);
  if (!data) return res.status(404).json({ error: "File not found" });
  const ext = relativePath.split(".").pop()?.toLowerCase() || "";
  res.setHeader("Content-Type", FILE_MIME[ext] || "application/octet-stream");
  res.send(data);
});

// Serve absolute member file paths linked from agent messages (e.g. /C:/Users/.../members/...)
app.get(/^\/[A-Za-z]:\//, async (req, res) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: "Invalid path" });
  }
  // Strip leading slash to recover the Windows absolute path (C:/...)
  const resolved = path.resolve(decoded.slice(1));
  // Security: must be within the members directory
  if (!resolved.startsWith(MEMBERS_DIR + path.sep)) {
    return res.status(403).json({ error: "Access denied" });
  }
  let data: Buffer;
  try {
    data = await fs.promises.readFile(resolved);
  } catch {
    return res.status(404).json({ error: "File not found" });
  }
  const ext = resolved.split(".").pop()?.toLowerCase() || "";
  res.setHeader("Content-Type", FILE_MIME[ext] || "application/octet-stream");
  res.send(data);
});

app.get("/api/members/:id/files/*", async (req, res) => {
  const relativePath = (req.params as any)[0];
  const content = await getFile(req.params.id, relativePath);
  if (content === undefined) return res.status(404).json({ error: "File not found" });
  res.json({ content });
});

app.post("/api/members/:id/files", async (req, res) => {
  const { path, content } = req.body;
  if (!path) return res.status(400).json({ error: "path is required" });
  await saveFile(req.params.id, path, content || "");
  res.json({ ok: true });
});

app.post("/api/members/:id/files/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = req.body.path;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    await saveBinaryFile(req.params.id, filePath, req.file.buffer);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as any).message });
  }
});

app.delete("/api/members/:id/files/*", async (req, res) => {
  const relativePath = (req.params as any)[0];
  await deleteFile(req.params.id, relativePath);
  res.json({ ok: true });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.join(__dirname, "../web/dist");

console.log(`[server] Serving static files from: ${webDistPath}`);

app.use(express.static(webDistPath));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(webDistPath, "index.html"));
});

app.listen(port, () => {
  console.log(`[server] Team AI server started on port ${port} at ${new Date().toISOString()}`);
});
