export interface Request {
  id: string;
  text: string;
  requester: string;
  requestTime: Date;
  notify: boolean;
  echo?: boolean;

  status: "pending" | "running" | "completed" | "aborted";
  startTime?: Date;
  endTime?: Date;
}