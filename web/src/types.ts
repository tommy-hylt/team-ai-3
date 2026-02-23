export interface RequestMessage {
  id?: string;
  type: "request";
  text: string;
  requester?: string;
  requestTime: Date;
  status?: "pending" | "running" | "completed" | "aborted";
}

export interface ResponseMessage {
  type: "response";
  text: string;
  time: Date;
  requestId: string;
  agent?: string;
}

export type MessageType = RequestMessage | ResponseMessage;
