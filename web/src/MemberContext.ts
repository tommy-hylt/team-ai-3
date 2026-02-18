import { createContext, Dispatch, SetStateAction } from "react";
import Member from "../../server/member";

export const MemberContext = createContext<{
  members: Member[];
  setMembers: Dispatch<SetStateAction<Member[]>>;
  
  selectedMember: Member | undefined;
  setSelectedMember: (member: Member | undefined) => void;
}>({
  members: [],
  setMembers: () => {},
  
  selectedMember: undefined,
  setSelectedMember: () => {},
});
