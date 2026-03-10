import { getMember } from "../memberService.ts";
import { runAgent } from "../agentService.ts";
import { addResponse, updateRequestStatus, getRequestStatus, getChatHistory } from "../chatService.ts";
import { Request } from "../request.ts";

async function main() {
  const [memberId, requestId] = process.argv.slice(2);
  if (!memberId || !requestId) {
    console.error("Usage: tsx agent-worker.ts <memberId> <requestId>");
    process.exit(1);
  }

  const member = await getMember(memberId);
  if (!member) {
    console.error(`Member not found: ${memberId}`);
    process.exit(1);
  }

  const history = await getChatHistory(memberId);
  const request = history.find(r => r.type === "request" && (r as any).id === requestId) as (Request & { type: "request" }) | undefined;

  if (!request) {
    console.error(`Request not found: ${requestId}`);
    process.exit(1);
  }

  const currentStatus = await getRequestStatus(memberId, requestId);
  if (currentStatus === "aborted") {
    console.log(`Request ${requestId} was aborted, exiting worker`);
    process.exit(0);
  }

  try {
    console.log(`[worker] Running agent for ${memberId}, request ${requestId}...`);
    const agentResult = await runAgent(member, request.text, requestId);

    // Check status again before writing
    const postStatus = await getRequestStatus(memberId, requestId);
    if (postStatus === "aborted") {
      console.log(`[worker] Request ${requestId} was aborted during execution, skipping response`);
      process.exit(0);
    }

    const response = {
      text: agentResult.text,
      time: new Date(),
      requestId: request.id,
      agent: agentResult.agentName,
      notify: request.notify,
      echo: request.echo ? request.requester : undefined,
    };

    console.log(`[worker] Triggering server response notification`);
    try {
      const res = await fetch(`http://localhost:8699/api/members/${memberId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
    } catch (e) {
      console.error(`[worker] Server notification failed. Falling back to local save.`);
      // Fallback only if server is unreachable
      await addResponse(memberId, response);
      await updateRequestStatus(memberId, requestId, "completed");
    }

  } catch (e) {
    console.error(`[worker] Agent error for ${memberId}:`, e);
    await updateRequestStatus(memberId, requestId, "aborted");
  }
}

main().catch(console.error);
