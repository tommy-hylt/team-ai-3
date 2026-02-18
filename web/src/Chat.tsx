import { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiEdit2, FiCopy } from "react-icons/fi";
import { MessageTime } from "./MessageTime";
import { MessageType, RequestMessage } from "./types";
import "./Chat.css";

export function Chat({ onBack }: { onBack: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members } = useContext(MemberContext);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find(m => m.id === id);

  useEffect(() => {
    if (!id) return;
    
    fetch(`/api/members/${id}/chat`)
      .then((res) => res.json())
      .then(setMessages);
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!selectedMember || !input || loading) return;

    setLoading(true);
    const text = input;
    setInput("");

    const newRequest: RequestMessage = { type: "request", text, requestTime: new Date() };
    setMessages(prev => [...prev, newRequest]);

    try {
      const res = await fetch(`/api/members/${selectedMember.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, requester: "User" }),
      });
      const response = await res.json();
      setMessages(prev => [...prev, { ...response, type: "response" }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          <button className="ActionButton" onClick={() => navigate(`/new?clone=${id}`)}>
            <FiCopy />
          </button>
          <button className="ActionButton" onClick={() => navigate(`/${id}/edit`)}>
            <FiEdit2 />
          </button>
        </div>
      </div>
      <div className="MessageList" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`Message ${m.type}`}>
            <div className="Text">{m.text}</div>
            <MessageTime date={m.type === "response" ? m.time : m.requestTime} />
          </div>
        ))}
        {loading && (
          <div className="Message response">
            <div className="TypingIndicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <MessageTime date={new Date()} live />
          </div>
        )}
      </div>
      <div className="InputArea">
        <div className="InputWrapper">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message ${selectedMember.name}...`}
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
