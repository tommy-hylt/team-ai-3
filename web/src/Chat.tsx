import { useContext, useEffect, useState } from "react";
import { MemberContext } from "./MemberContext";

export function Chat() {
  const { selectedMember } = useContext(MemberContext);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMember) return;
    
    fetch(`/api/members/${selectedMember.id}/chat`)
      .then((res) => res.json())
      .then(setMessages);
  }, [selectedMember]);

  async function handleSend() {
    if (!selectedMember || !input || loading) return;

    setLoading(true);
    const text = input;
    setInput("");

    // Optimistic update
    const newRequest = { type: "request", text, requestTime: new Date() };
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
    return <div className="Chat">Select a member to start chatting</div>;
  }

  return (
    <div className="Chat">
      <h2>{selectedMember.name}</h2>
      <div className="MessageList">
        {messages.map((m, i) => (
          <div key={i} className={`Message ${m.type}`}>
            <div className="Sender">{m.type === "request" ? (m.requester || "User") : selectedMember.name}</div>
            <div className="Text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="InputArea">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
