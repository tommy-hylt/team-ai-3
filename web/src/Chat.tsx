import { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiSettings, FiX, FiSend, FiFolder } from "react-icons/fi";
import { TbMarkdown, TbMarkdownOff } from "react-icons/tb";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const { members, loading } = useContext(MemberContext);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [renderMd, setRenderMd] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isSending = useRef(false);
  const clientId = useRef(Math.random().toString(36).substring(7));

  const selectedMember = members.find(m => m.id === id);

  useEffect(() => {
    if (!id) return;
    
    // Reset state for new ID
    setMessages([]);
    setInput("");

    // Load initial history
    fetch(`/api/members/${id}/chat`)
      .then((res) => res.json())
      .then((data: MessageType[]) => {
        setMessages(data);
        
        // After history is loaded, check for drafts
        const drafts = getDrafts();
        const draftText = drafts[id]?.text || "";
        
        if (draftText) {
          // Avoid restoring draft if it matches the very last request (prevents re-sending on refresh/resume)
          const lastRequest = [...data].reverse().find(m => m.type === "request");
          if (lastRequest && lastRequest.text === draftText) {
            console.log(`[Chat ${clientId.current}] Draft matches last request, clearing redundant draft.`);
            saveDraft(id, "");
          } else {
            console.log(`[Chat ${clientId.current}] Restoring draft for ${id}`);
            setInput(draftText);
          }
        }
      });

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
    // Slight delay to allow React to render the new messages to the DOM
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: isFirstLoad.current ? "auto" : "smooth" 
      });
      isFirstLoad.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (id) saveDraft(id, val);
  };

  async function handleSend() {
    if (!selectedMember || !input.trim() || isSending.current) return;
    
    const text = input.trim();
    console.log(`[Chat ${clientId.current}] handleSend triggered for "${text.substring(0, 20)}..."`);
    
    isSending.current = true;
    try {
      setInput("");
      if (id) saveDraft(id, "");

      const res = await fetch(`/api/members/${selectedMember.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, requester: "User", notify: true }),
      });
      
      if (!res.ok) {
        console.error(`[Chat ${clientId.current}] POST failed with status ${res.status}`);
      }
    } catch (e) {
      console.error(`[Chat ${clientId.current}] handleSend error:`, e);
    } finally {
      isSending.current = false;
    }
  }

  async function handleCancel(requestId: string) {
    if (!id) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id }),
      });
      const data = await res.json();
      if (data.ok && !data.killed) {
        alert("Request marked as aborted, but no active process was found to kill (it may have already finished or the server was restarted).");
      }
    } catch (err) {
      console.error("Failed to cancel request:", err);
    }
  }

  if (loading) {
    return (
      <div className="Chat">
        <div className="EmptyState">Loading chat...</div>
      </div>
    );
  }

  if (!selectedMember) {
    return (
      <div className="Chat">
        <div className="EmptyState">Member not found</div>
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
          <button className="ActionButton" onClick={() => navigate(`/${id}/files`)}>
            <FiFolder />
          </button>
          <button className="ActionButton" onClick={() => navigate(`/${id}/edit`)}>
            <FiSettings />
          </button>
        </div>
      </div>
      <div className="MessageList" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`MessageWrapper ${m.type}`}>
            <div className={`Message ${m.type} ${m.type === "request" && m.status === "aborted" ? "aborted" : ""}`}>
              {m.type === "request" && m.requester && (
                <div className="RequesterName">{m.requester}</div>
              )}
              <div className={`Text ${renderMd[i] !== false ? "markdown-enabled" : ""}`}>
                {renderMd[i] !== false ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown> : m.text}
              </div>
              <div className="MetaRow">
                <MessageTime date={m.type === "response" ? m.time : m.requestTime} />
                {m.type === "response" && m.agent && <span className="AgentLabel">{m.agent}</span>}
                {m.type === "request" && m.status === "aborted" && <span className="AbortedLabel">Aborted</span>}
                <button 
                  className={`MarkdownToggle ${renderMd[i] !== false ? "active" : ""}`} 
                  onClick={() => setRenderMd(prev => ({ ...prev, [i]: prev[i] === false ? true : false }))}
                  title="Toggle Markdown"
                >
                  {renderMd[i] !== false ? <TbMarkdown /> : <TbMarkdownOff />}
                </button>
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
        <div ref={messagesEndRef} />
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
