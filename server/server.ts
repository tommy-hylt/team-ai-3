import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import { listMembers, getMember } from "./memberService.ts";
import { getChatHistory, addRequest, addResponse } from "./chatService.ts";
import { runAgent } from "./agentService.ts";

const app = express();
const port = 8698;

app.use(cors());
app.use(express.json());

app.get("/api/members", async (req, res) => {
  console.log("GET /api/members");
  const members = await listMembers();
  console.log(`Found ${members.length} members`);
  res.json(members);
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
      status: "pending" as const,
    };

    await addRequest(memberId, request);

    console.log(`Running agent for ${memberId}...`);
    // Trigger agent
    const responseText = await runAgent(member, request.text);
    console.log(`Agent response for ${memberId}: ${responseText}`);
    
    const response = {
      text: responseText,
      time: new Date(),
      requestId: request.id,
    };

    await addResponse(memberId, response);

    res.json(response);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: "Internal server error", details: (error as any).message });
  }
});

app.listen(port, () => {
  // Server started
});
