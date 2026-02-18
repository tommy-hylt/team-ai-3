export interface RequestMessage {
  type: "request";
  text: string;
  requestTime: Date;
}

export interface ResponseMessage {
  type: "response";
  text: string;
  time: Date;
  requestId: string;
}

export type MessageType = RequestMessage | ResponseMessage;
