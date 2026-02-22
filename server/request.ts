export interface Request {
  id: string;
  text: string;
  requester: string;
  requestTime: Date;

  status: "pending" | "running" | "completed" | "aborted";
  startTime?: Date;
  endTime?: Date;
}