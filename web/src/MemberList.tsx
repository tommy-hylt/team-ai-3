import { useContext } from "react";
import { MemberContext } from "./MemberContext";
import "./MemberList.css";

export function MemberList({ onSelect }: { onSelect: (id: string) => void }) {
  const { members, selectedMember } = useContext(MemberContext);

  return (
    <div className="MemberList">
      <div className="Header">
        <h2>Agents</h2>
      </div>
      <div className="Content">
        {members.map((member) => (
          <div
            key={member.id}
            className={`MemberItem ${selectedMember?.id === member.id ? "active" : ""}`}
            onClick={() => onSelect(member.id)}
          >
            <span className="Name">{member.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
