import { useContext } from "react";
import { MemberContext } from "./MemberContext";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiBell } from "react-icons/fi";
import "./MemberList.css";

interface MemberListProps {
  onSelect: (id: string) => void;
  subscribed?: boolean;
  onSubscribe?: () => void;
}

export function MemberList({ onSelect, subscribed = true, onSubscribe }: MemberListProps) {
  const { members, selectedMember } = useContext(MemberContext);
  const navigate = useNavigate();

  return (
    <div className="MemberList">
      <div className="Header">
        <h2>Team AI</h2>
        <button className="AddButton" onClick={() => navigate("/new")}>
          <FiPlus />
        </button>
      </div>
      {!subscribed && onSubscribe && (
        <div className="NotificationBanner">
          <div className="BannerText">
            <FiBell className="BannerIcon" />
            Get notified when agents reply.
          </div>
          <button className="SubscribeButton" onClick={onSubscribe}>
            Enable Notifications
          </button>
        </div>
      )}
      <div className="Content">
        {members.map((member) => (
          <div
            key={member.id}
            className={`MemberItem ${selectedMember?.id === member.id ? "active" : ""}`}
            onClick={() => onSelect(member.id)}
          >
            <div className="Info">
              <div className="NameRow">
                <span className="Name">{member.name}</span>
                {member.agents.length > 0 && (
                  <span className="AgentTag">{member.agents[0]}</span>
                )}
              </div>
              <span className="Description">{member.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
