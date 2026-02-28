export interface RequestMessage {
  id?: string;
  type: "request";
  text: string;
  requester?: string;
  requestTime: Date;
  notify: boolean;
  echo?: boolean;
  status?: "pending" | "running" | "completed" | "aborted";
}

export interface ResponseMessage {
  type: "response";
  text: string;
  time: Date;
  requestId: string;
  agent?: string;
  notify: boolean;
  echo?: string;
}

export type MessageType = RequestMessage | ResponseMessage;

export interface Routine {
  id: string;
  cronPattern: string;
  requestText: string;
  startTime: string;
  lastTime: string;
  notify: boolean;
}
