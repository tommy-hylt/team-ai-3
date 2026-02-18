export default interface Member {
  id: string;
  name: string;
  description: string;
  agents: string[];
  status?: "active" | "deleted";
}