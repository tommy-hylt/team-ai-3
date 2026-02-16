import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { Request } from "./request.ts";
import { Response } from "./response.ts";

export async function getChatHistory(memberName: string) {
  const requests = await readJson<Request[]>(memberName, "requests.json") || [];
  const responses = await readJson<Response[]>(memberName, "responses.json") || [];
  
  const history = [
    ...requests.map((r) => ({ ...r, type: "request" as const })),
    ...responses.map((r) => ({ ...r, type: "response" as const })),
  ];
  
  return history.sort((a, b) => new Date(a.time || (a as any).requestTime).getTime() - new Date(b.time || (b as any).requestTime).getTime());
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

async function readJson<T>(memberName: string, fileName: string) {
  const filePath = join(process.cwd(), "../members", memberName, fileName);
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(memberName: string, fileName: string, data: any) {
  const filePath = join(process.cwd(), "../members", memberName, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
