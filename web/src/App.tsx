import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import { MemberProvider } from "./MemberProvider";
import { MemberList } from "./MemberList";
import { Chat } from "./Chat";
import { MemberEdit } from "./MemberEdit";
import { MemberNew } from "./MemberNew";
import { useContext, useEffect } from "react";
import { MemberContext } from "./MemberContext";

function AppContent() {
  const { members, setSelectedMember } = useContext(MemberContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync route ID with selectedMember
  useEffect(() => {
    const parts = location.pathname.split("/");
    const id = parts[1];
    const isEdit = parts[2] === "edit";
    const isNew = id === "new";

    if (id && !isNew && members.length > 0) {
      const member = members.find(m => m.id === id);
      if (member) setSelectedMember(member);
    }
  }, [location.pathname, members, setSelectedMember]);

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
          <Route path="/new" element={<MemberNew />} />
          <Route path="/:id" element={<Chat onBack={() => navigate("/")} />} />
          <Route path="/:id/edit" element={<MemberEdit />} />
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
