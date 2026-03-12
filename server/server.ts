import { spawn } from "child_process";
import fs from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { listMembers, getMember, getMemberDetails, updateMemberDetails, createMember, deleteMember } from "./memberService.ts";
import { getChatHistory, addRequest, addResponse, updateRequestStatus, getRequestStatus, clearChatHistory, getRequest } from "./chatService.ts";
import { runAgent, cancelRequest, cancelAllRequests, getServerId, isMemberBusy } from "./agentService.ts";
import { expireAllSessions } from "./sessionService.ts";
import { listFiles, getFile, saveFile, deleteFile, checkFileSync } from "./fileService.ts";
import { subscribe, broadcast } from "./notificationService.ts";
import { initPush, getPublicKey, saveSubscription, sendNotification } from "./pushService.ts";
import { getRoutines, saveRoutines, startRoutineLoop } from "./routineService.ts";

const app = express();
const port = 8699;

initPush().then(() => console.log("[server] Push notifications initialized"));
startRoutineLoop();

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
    await saveRoutines(req.params.id, req.body);
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
  
  const workerPath = path.join(__dirname, "scripts", "agent-worker.ts");
  const tsxBin = path.join(__dirname, "node_modules", "tsx", "dist", "cli.mjs");

  const outFd = fs.openSync(path.join(__dirname, "out.log"), "a");
  const errFd = fs.openSync(path.join(__dirname, "err.log"), "a");

  // Call node.exe directly with the tsx CLI to bypass all Windows shell escaping issues
  const child = spawn(process.execPath, [tsxBin, workerPath, memberId, request.id], {
    detached: true,
    stdio: ["ignore", outFd, errFd],
    windowsHide: true,
    cwd: __dirname
  });

  child.on("error", (err) => {
    console.error(`Failed to spawn worker for ${memberId}:`, err);
  });

  // Unreference the child so the server can exit independently
  child.unref();
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
