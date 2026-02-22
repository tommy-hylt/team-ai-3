import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import { listMembers, getMember, getMemberDetails, updateMemberDetails, createMember, deleteMember } from "./memberService.ts";
import { getChatHistory, addRequest, addResponse, updateRequestStatus, getRequestStatus, clearChatHistory } from "./chatService.ts";
import { runAgent, cancelRequest, cancelAllRequests } from "./agentService.ts";
import { expireAllSessions } from "./sessionService.ts";
import { listFiles, getFile, saveFile, deleteFile } from "./fileService.ts";
import { subscribe, broadcast } from "./notificationService.ts";
import { initPush, getPublicKey, saveSubscription, sendNotification } from "./pushService.ts";

const app = express();
const port = 8699;

initPush().then(() => console.log("[server] Push notifications initialized"));

app.use(cors());
app.use(express.json());

app.get("/api/push/public-key", (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

app.post("/api/push/subscribe", async (req, res) => {
  await saveSubscription(req.body);
  res.json({ ok: true });
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

  const success = cancelRequest(req.params.id);
  if (success) {
    await updateRequestStatus(memberId, req.params.id, "aborted");
    broadcast(memberId, "status_update", { id: req.params.id, status: "aborted" });
  }
  res.json({ ok: success });
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

app.get("/api/members/:id/chat", async (req, res) => {
  console.log(`GET /api/members/${req.params.id}/chat`);
  const history = await getChatHistory(req.params.id);
  console.log(`Returning ${history.length} messages`);
  res.json(history);
});

app.post("/api/members/:id/request", async (req, res) => {
  try {
    const memberId = req.params.id;
    const { text, requester } = req.body;
    console.log(`POST /api/members/${memberId}/request from ${requester}: ${text}`);
    
    const member = await getMember(memberId);
    if (!member) {
      console.warn(`Member not found for request: ${memberId}`);
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const request = {
      id: randomUUID(),
      text,
      requester,
      requestTime: new Date(),
      status: "running" as const,
    };

    await addRequest(memberId, request);
    broadcast(memberId, "request", request);

    console.log(`Running agent for ${memberId}...`);
    // Trigger agent
    const responseText = await runAgent(member, request.text, request.id);
    
    // Check if aborted
    const currentStatus = await getRequestStatus(memberId, request.id);
    if (currentStatus === "aborted") {
      console.log(`Request ${request.id} was aborted, skipping response`);
      res.json({ status: "aborted" });
      return;
    }

    console.log(`Agent response for ${memberId}: ${responseText}`);
    
    const response = {
      text: responseText,
      time: new Date(),
      requestId: request.id,
    };

    await addResponse(memberId, response);
    await updateRequestStatus(memberId, request.id, "completed");
    broadcast(memberId, "response", response);
    broadcast(memberId, "status_update", { id: request.id, status: "completed" });
    
    sendNotification(`New message from ${member.name}`, responseText.substring(0, 100), `/${memberId}`);

    res.json(response);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error", details: (error as any).message });
  }
});

// File APIs
app.get("/api/members/:id/files", async (req, res) => {
  const path = (req.query.path as string) || "";
  const entries = await listFiles(req.params.id, path);
  res.json(entries);
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

app.listen(port, () => {
  console.log(`[server] Team AI server started on port ${port} at ${new Date().toISOString()}`);
});
