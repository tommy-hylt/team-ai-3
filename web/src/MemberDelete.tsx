import { useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiAlertTriangle } from "react-icons/fi";
import "./MemberEdit.css";

export function MemberDelete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, setMembers } = useContext(MemberContext);
  const [deleting, setDeleting] = useState(false);

  const member = members.find(m => m.id === id);

  if (!member) return <div className="MemberEdit">Member not found</div>;

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    
    // Refresh member list
    const res = await fetch("/api/members");
    const data = await res.json();
    setMembers(data);
    
    navigate("/");
  }

  return (
    <div className="MemberEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit`)}>
          <FiChevronLeft />
        </button>
        <h2>Delete Member</h2>
      </div>
      <div className="ScrollArea">
        <div className="Form" style={{ textAlign: "center", paddingTop: 60 }}>
          <FiAlertTriangle style={{ fontSize: 48, color: "#f87171", marginBottom: 24 }} />
          <h3 style={{ color: "#ebecf0", marginBottom: 16 }}>Delete {member.name}?</h3>
          <p style={{ color: "#9ca3af", lineHeight: 1.6, marginBottom: 40 }}>
            This will permanently delete this agent and all their data, including chat history, memory, and character files. This action cannot be undone.
          </p>
          
          <div className="FormActions">
            <button 
              className="DeleteButton" 
              onClick={handleDelete}
              disabled={deleting}
              style={{ backgroundColor: "#f87171", color: "#fff", border: "none" }}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
            <button 
              className="CloneButton" 
              onClick={() => navigate(`/${id}/edit`)}
              disabled={deleting}
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
