import { useContext } from "react";
import { MemberContext } from "./MemberContext";

export function MemberList() {
  const { members, setSelectedMember, selectedMember } = useContext(MemberContext);

  return (
    <div className="MemberList">
      <h2>Members</h2>
      {members.map((member) => (
        <div
          key={member.id}
          className={`MemberItem ${selectedMember?.id === member.id ? "active" : ""}`}
          onClick={() => setSelectedMember(member)}
        >
          {member.name}
        </div>
      ))}
    </div>
  );
}
