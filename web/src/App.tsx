import { Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import "./App.css";
import { MemberProvider } from "./MemberProvider";
import { MemberList } from "./MemberList";
import { Chat } from "./Chat";
import { useContext, useEffect } from "react";
import { MemberContext } from "./MemberContext";

function AppContent() {
  const { members, selectedMember, setSelectedMember } = useContext(MemberContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Sync route ID with selectedMember
  useEffect(() => {
    if (id && members.length > 0) {
      const member = members.find(m => m.id === id);
      if (member) setSelectedMember(member);
    }
  }, [id, members, setSelectedMember]);

  // Redirect to first member on desktop if no ID
  useEffect(() => {
    if (location.pathname === "/" && window.innerWidth > 768 && members.length > 0) {
      navigate(`/${members[0].id}`, { replace: true });
    }
  }, [location.pathname, members, navigate]);

  const isChatView = location.pathname !== "/";

  return (
    <div className="App">
      <div className={`Layout ${isChatView ? "view-chat" : "view-menu"}`}>
        <MemberList onSelect={(id) => navigate(`/${id}`)} />
        <Routes>
          <Route path="/" element={<div className="Chat Empty"><div className="EmptyState">Select an agent to start chatting</div></div>} />
          <Route path="/:id" element={<Chat onBack={() => navigate("/")} />} />
        </Routes>
      </div>
    </div>
  );
}

export function App() {
  return (
    <MemberProvider>
      <AppContent />
    </MemberProvider>
  );
}
