import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Request } from "./request.ts";
import { Response } from "./response.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getChatHistory(memberName: string) {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  const responses = await readJson<Response[]>(memberName, "responses.json") || [];
  
  const history = [
    ...requests.map((r) => ({ ...r, type: "request" as const })),
    ...responses.map((r) => ({ ...r, type: "response" as const })),
  ];
  
  return history.sort((a: any, b: any) => new Date(a.time || a.requestTime).getTime() - new Date(b.time || b.requestTime).getTime());
}

export async function addRequest(memberName: string, request: Request) {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  requests.push(request);
  await writeJson(memberName, "requests.json", requests);
}

export async function addResponse(memberName: string, response: Response) {
  const responses = await readJson<Response[]>(memberName, "responses.json") || [];
  responses.push(response);
  await writeJson(memberName, "responses.json", responses);
}

export async function updateRequestStatus(memberName: string, requestId: string, status: "pending" | "running" | "completed" | "aborted") {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  const request = requests.find(r => r.id === requestId);
  if (request) {
    request.status = status;
    await writeJson(memberName, "requests.json", requests);
  }
}

export async function getRequestStatus(memberName: string, requestId: string) {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  const request = requests.find(r => r.id === requestId);
  return request?.status;
}

export async function getRequest(memberName: string, requestId: string) {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  return requests.find(r => r.id === requestId);
}

export async function clearChatHistory(memberName: string) {
  await writeJson(memberName, "requests.json", []);
  await writeJson(memberName, "responses.json", []);
}

async function readJson<T>(memberName: string, fileName: string) {
  const filePath = join(__dirname, "../members", memberName, fileName);
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(memberName: string, fileName: string, data: any) {
  const filePath = join(__dirname, "../members", memberName, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
