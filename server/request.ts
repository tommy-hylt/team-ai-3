export interface Request {
  text: string;
  requester: string;
  requestTime: Date;

  status: "pending" | "running" | "completed";
  startTime?: Date;
  endTime?: Date;
}