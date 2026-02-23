import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import { MemberProvider } from "./MemberProvider";
import { MemberList } from "./MemberList";
import { Chat } from "./Chat";
import { MemberEdit } from "./MemberEdit";
import { MemberNew } from "./MemberNew";
import { MemberDelete } from "./MemberDelete";
import { ChatClear } from "./ChatClear";
import { TextEdit } from "./TextEdit";
import { SkillList } from "./SkillList";
import { SkillEdit } from "./SkillEdit";
import { SkillFileEdit } from "./SkillFileEdit";
import { MemberFileBrowser } from "./MemberFileBrowser";
import { MemberFileEdit } from "./MemberFileEdit";
import { useContext, useEffect, useState } from "react";
import { MemberContext } from "./MemberContext";
import { subscribeToPush, checkSubscription } from "./pushManager";

function AppContent() {
  const { members, setSelectedMember } = useContext(MemberContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [subscribed, setSubscribed] = useState(true); // Default true to avoid flicker

  useEffect(() => {
    checkSubscription().then(setSubscribed);
  }, []);

  async function handleSubscribe() {
    const success = await subscribeToPush();
    if (success) setSubscribed(true);
  }

  // Sync route ID with selectedMember
  useEffect(() => {
    const parts = location.pathname.split("/");
    const id = parts[1];
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
        <MemberList 
          onSelect={(id) => navigate(`/${id}`)} 
          subscribed={subscribed}
          onSubscribe={handleSubscribe}
        />
        <Routes>
          <Route path="/" element={
            <div className="Chat Empty">
              <div className="EmptyState">
                <p>Select an agent to start chatting</p>
              </div>
            </div>
          } />
          <Route path="/new" element={<MemberNew />} />
          <Route path="/:id" element={<Chat onBack={() => navigate("/")} />} />
          <Route path="/:id/edit" element={<MemberEdit />} />
          <Route path="/:id/delete" element={<MemberDelete />} />
          <Route path="/:id/chat/clear" element={<ChatClear />} />
          <Route path="/:id/files" element={<MemberFileBrowser />} />
          <Route path="/:id/files/edit" element={<MemberFileEdit />} />
          <Route path="/:id/edit/skills" element={<SkillList />} />
          <Route path="/:id/edit/skills/:skillName" element={<SkillEdit />} />
          <Route path="/:id/edit/skills/:skillName/:fileName" element={<SkillFileEdit />} />
          <Route path="/:id/edit/:field" element={<TextEdit />} />
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
