import { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiSettings, FiX, FiSend } from "react-icons/fi";
import { MessageTime } from "./MessageTime";
import { MessageType } from "./types";
import "./Chat.css";

interface Drafts {
  [memberId: string]: { text: string; timestamp: number };
}

function getDrafts(): Drafts {
  try {
    return JSON.parse(localStorage.getItem("chat_drafts") || "{}");
  } catch {
    return {};
  }
}

function saveDraft(memberId: string, text: string) {
  const drafts = getDrafts();
  if (!text) {
    delete drafts[memberId];
  } else {
    drafts[memberId] = { text, timestamp: Date.now() };
  }

  // Prune to last 5
  const sortedKeys = Object.keys(drafts).sort((a, b) => drafts[b].timestamp - drafts[a].timestamp);
  if (sortedKeys.length > 5) {
    sortedKeys.slice(5).forEach(k => delete drafts[k]);
  }

  localStorage.setItem("chat_drafts", JSON.stringify(drafts));
}

export function Chat({ onBack }: { onBack: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members } = useContext(MemberContext);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSending = useRef(false);

  const selectedMember = members.find(m => m.id === id);

  useEffect(() => {
    if (!id) return;
    
    // Load draft
    const drafts = getDrafts();
    setInput(drafts[id]?.text || "");

    // Load initial history
    fetch(`/api/members/${id}/chat`)
      .then((res) => res.json())
      .then(setMessages);

    // Subscribe to events
    const evtSource = new EventSource(`/api/members/${id}/events`);
    
    evtSource.addEventListener("request", (e) => {
      try {
        const req = JSON.parse(e.data);
        setMessages(prev => {
          if (prev.some(m => m.type === "request" && m.id === req.id)) return prev;
          return [...prev, { ...req, type: "request" }].sort((a, b) => 
            new Date(a.type === "request" ? a.requestTime : a.time).getTime() - 
            new Date(b.type === "request" ? b.requestTime : b.time).getTime()
          );
        });
      } catch (err) { console.error("SSE Request Error", err); }
    });

    evtSource.addEventListener("response", (e) => {
      try {
        const res = JSON.parse(e.data);
        setMessages(prev => [...prev, { ...res, type: "response" }].sort((a, b) => 
          new Date(a.type === "request" ? a.requestTime : a.time).getTime() - 
          new Date(b.type === "request" ? b.requestTime : b.time).getTime()
        ));
      } catch (err) { console.error("SSE Response Error", err); }
    });

    evtSource.addEventListener("status_update", (e) => {
      try {
        const { id, status } = JSON.parse(e.data);
        setMessages(prev => prev.map(m => 
          (m.type === "request" && m.id === id) ? { ...m, status } : m
        ));
      } catch (err) { console.error("SSE Status Error", err); }
    });

    return () => {
      evtSource.close();
    };
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (id) saveDraft(id, val);
  };

  async function handleSend() {
    if (!selectedMember || !input || isSending.current) return;
    isSending.current = true;
    try {
      const text = input;
      setInput("");
      if (id) saveDraft(id, "");

      await fetch(`/api/members/${selectedMember.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, requester: "User" }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      isSending.current = false;
    }
  }

  async function handleCancel(requestId: string) {
    if (!id) return;
    await fetch(`/api/requests/${requestId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id }),
    });
  }

  if (!selectedMember) {
    return (
      <div className="Chat">
        <div className="EmptyState">Agent not found</div>
      </div>
    );
  }

  return (
    <div className="Chat">
      <div className="Header">
        <div className="HeaderLeft">
          <button className="BackButton" onClick={onBack}>
            <FiChevronLeft />
          </button>
          <h2>{selectedMember.name}</h2>
        </div>
        <div className="HeaderActions">
          <button className="ActionButton" onClick={() => navigate(`/${id}/edit`)}>
            <FiSettings />
          </button>
        </div>
      </div>
      <div className="MessageList" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`MessageWrapper ${m.type}`}>
            <div className={`Message ${m.type} ${m.type === "request" && m.status === "aborted" ? "aborted" : ""}`}>
              <div className="Text">
                {m.text}
              </div>
              <div className="MetaRow">
                <MessageTime date={m.type === "response" ? m.time : m.requestTime} />
                {m.type === "request" && m.status === "aborted" && <span className="AbortedLabel">Aborted</span>}
              </div>
            </div>
            {m.type === "request" && m.status === "running" && (
              <div className="LoadingContainer">
                <div className="TypingIndicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <button className="CancelButton" onClick={() => m.id && handleCancel(m.id)}>
                  <FiX /> Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="InputArea">
        <div className="InputWrapper">
          <textarea 
            value={input} 
            rows={3}
            onChange={handleInputChange} 
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${selectedMember.name}...`}
          />
          <button onClick={handleSend} disabled={!input.trim()}>
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}
