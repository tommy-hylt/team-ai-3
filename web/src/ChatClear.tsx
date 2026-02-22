import { useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiAlertTriangle } from "react-icons/fi";
import "./MemberEdit.css";

export function ChatClear() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members } = useContext(MemberContext);
  const [clearing, setClearing] = useState(false);

  const member = members.find(m => m.id === id);

  if (!member) return <div className="MemberEdit">Member not found</div>;

  async function handleClear() {
    if (!id) return;
    setClearing(true);
    await fetch(`/api/members/${id}/chat/clear`, { method: "POST" });
    navigate(`/${id}`);
  }

  return (
    <div className="MemberEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit`)}>
          <FiChevronLeft />
        </button>
        <h2>Clear Chat</h2>
      </div>
      <div className="ScrollArea">
        <div className="Form" style={{ textAlign: "center", paddingTop: 60 }}>
          <FiAlertTriangle style={{ fontSize: 48, color: "#f59e0b", marginBottom: 24 }} />
          <h3 style={{ color: "#ebecf0", marginBottom: 16 }}>Clear chat history for {member.name}?</h3>
          <p style={{ color: "#9ca3af", lineHeight: 1.6, marginBottom: 40 }}>
            This will permanently remove all messages from the conversation history. This action cannot be undone.
          </p>
          
          <div className="FormActions">
            <button 
              className="DeleteButton" 
              onClick={handleClear}
              disabled={clearing}
              style={{ backgroundColor: "#f59e0b", color: "#08090a", border: "none" }}
            >
              {clearing ? "Clearing..." : "Confirm Clear"}
            </button>
            <button 
              className="CloneButton" 
              onClick={() => navigate(`/${id}/edit`)}
              disabled={clearing}
              style={{ justifyContent: "center" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
