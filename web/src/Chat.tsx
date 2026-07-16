import { useContext, useEffect, useState, useRef, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiSettings, FiSend, FiFolder, FiTerminal, FiX, FiCopy, FiCheck, FiZap } from "react-icons/fi";
import { TbMarkdown, TbMarkdownOff } from "react-icons/tb";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
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

interface LogEntry {
  filename: string;
  content: string;
}

// Extracted so keystrokes only re-render this small component, not the message list
const ChatInput = memo(function ChatInput({
  memberId,
  memberName,
  initialValue,
  onSend,
}: {
  memberId: string;
  memberName: string;
  initialValue: string;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState(initialValue);
  const [showSkills, setShowSkills] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when initialValue arrives after async draft check
  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

  // Fetch skills for this member
  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${memberId}/files?path=.claude/skills`).then(r => r.json()),
      fetch(`/api/members/${memberId}/files?path=.gemini/skills`).then(r => r.json()),
    ]).then(([claude, gemini]) => {
      const getDirs = (entries: any[]) =>
        Array.isArray(entries) ? entries.filter(e => e.type === "directory").map(e => e.name) : [];
      const allNames = [...new Set([...getDirs(claude), ...getDirs(gemini)])].sort();
      setSkills(allNames);
    }).catch(() => {});
  }, [memberId]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current);
    saveDraftTimer.current = setTimeout(() => saveDraft(memberId, val), 500);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current);
    onSend(text);
  }

  function handleSkillClick(skillName: string) {
    const newValue = `/${skillName} `;
    setInput(newValue);
    setShowSkills(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newValue.length, newValue.length);
    }, 0);
  }

  const hasText = input.trim().length > 0;

  return (
    <div className="InputArea">
      <div className="InputWrapper">
        {showSkills ? (
          <div className="SkillPicker">
            {skills.length === 0
              ? <span className="SkillEmpty">No skills available</span>
              : skills.map(skill => (
                  <button key={skill} className="SkillChip" onClick={() => handleSkillClick(skill)}>
                    /{skill}
                  </button>
                ))
            }
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${memberName}...`}
          />
        )}
        {showSkills ? (
          <button className="CloseBtn" onClick={() => setShowSkills(false)}>
            <FiX />
          </button>
        ) : hasText ? (
          <button onClick={send}>
            <FiSend />
          </button>
        ) : (
          <button onClick={() => setShowSkills(true)}>
            <FiZap />
          </button>
        )}
      </div>
    </div>
  );
});

// Decides whether a markdown link href points at a file inside this member's
// folder, and if so, what path to pass to the file viewer. Returns null when
// the link should be left as a plain external/unrelated-path anchor:
// - absolute Windows paths outside this member's own root
// - anything with a URI scheme (http:, https:, mailto:, ...) — a single
//   drive letter ("C:") is excluded since it isn't a real scheme here
function resolveMemberFileHref(rawHref: string, rootPath: string): string | null {
  if (!rawHref || rawHref.startsWith("#")) return null;

  // react-markdown's mdast->hast conversion percent-encodes the URL (spaces
  // become %20, etc.) before it ever reaches urlTransform/components, so
  // decode it back before comparing against the filesystem rootPath.
  let href = rawHref;
  try { href = decodeURIComponent(rawHref); } catch { /* leave as-is if malformed */ }

  // Absolute Windows path, with or without a leading slash: "/C:/..." or "C:/..."
  const winMatch = href.match(/^\/?([A-Za-z]:[\\/].*)$/);
  if (winMatch) {
    if (!rootPath) return null;
    const abs = winMatch[1].replace(/\\/g, "/");
    const root = rootPath.replace(/\\/g, "/");
    if (abs.toLowerCase() === root.toLowerCase()) return "";
    if (abs.toLowerCase().startsWith(root.toLowerCase() + "/")) {
      return abs.slice(root.length + 1);
    }
    return null; // outside this member's folder
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return null; // external scheme

  // Relative path — chat has no "current file", so resolve against the member root
  return href.replace(/^\.\//, "").replace(/^\//, "");
}

// react-markdown's default URL sanitizer treats "C:" as an unrecognized
// protocol and strips it, so Windows absolute paths never reach the `a`
// component's href. Let those through unchanged; defer everything else
// (including any genuinely dangerous protocol) to the default sanitizer.
function urlTransform(url: string): string {
  if (/^\/?[A-Za-z]:[\\/]/.test(url)) return url;
  return defaultUrlTransform(url);
}

export function Chat({ onBack }: { onBack: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, loading } = useContext(MemberContext);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [initialDraft, setInitialDraft] = useState("");
  const [renderMd, setRenderMd] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [showLog, setShowLog] = useState<Record<string, boolean>>({});
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  const [rootPath, setRootPath] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isSending = useRef(false);
  const clientId = useRef(Math.random().toString(36).substring(7));

  const selectedMember = members.find(m => m.id === id);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/members/${id}/rootpath`)
      .then(res => res.json())
      .then(data => setRootPath(data.rootPath || ""))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Reset state for new ID
    setMessages([]);
    setInitialDraft("");

    // Load initial history
    fetch(`/api/members/${id}/chat`)
      .then((res) => res.json())
      .then((data: MessageType[]) => {
        setMessages(prev => {
          // Merge fetched history with any SSE events that arrived while fetching
          const merged = [...data];
          for (const msg of prev) {
            if (msg.type === "request" && !merged.some(m => m.type === "request" && m.id === msg.id)) {
              merged.push(msg);
            } else if (msg.type === "response" && !merged.some(m => m.type === "response" && m.requestId === msg.requestId && m.time === msg.time)) {
              merged.push(msg);
            }
          }
          return merged.sort((a, b) =>
            new Date(a.type === "request" ? a.requestTime : a.time).getTime() -
            new Date(b.type === "request" ? b.requestTime : b.time).getTime()
          );
        });

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
            setInitialDraft(draftText);
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
          // Remove matching optimistic bubble (SSE may arrive before POST response returns)
          const filtered = prev.filter(m =>
            !(m.type === "request" && m.id?.startsWith("__optimistic_") && m.text === req.text)
          );
          return [...filtered, { ...req, type: "request" }].sort((a, b) =>
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

  async function handleSend(text: string) {
    if (!selectedMember || isSending.current) return;

    console.log(`[Chat ${clientId.current}] handleSend triggered for "${text.substring(0, 20)}..."`);

    isSending.current = true;
    if (id) saveDraft(id, "");

    // Optimistically show the message immediately, before the server round-trip
    const tempId = `__optimistic_${Date.now()}`;
    setMessages(prev => [...prev, {
      type: "request",
      id: tempId,
      text,
      requester: "User",
      requestTime: new Date(),
      notify: true,
      echo: false,
      status: "running",
    }]);

    try {
      const res = await fetch(`/api/members/${selectedMember.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, requester: "User", notify: true, echo: false }),
      });

      if (res.ok) {
        const data = await res.json();
        // Swap temp ID for the real one so the SSE dedup check matches and skips the duplicate
        setMessages(prev => prev.map(m =>
          m.type === "request" && m.id === tempId ? { ...m, id: data.requestId } : m
        ));
      } else {
        console.error(`[Chat ${clientId.current}] POST failed with status ${res.status}`);
        setMessages(prev => prev.filter(m => !(m.type === "request" && m.id === tempId)));
      }
    } catch (e) {
      console.error(`[Chat ${clientId.current}] handleSend error:`, e);
      setMessages(prev => prev.filter(m => !(m.type === "request" && m.id === tempId)));
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

  async function toggleLog(logKey: string, requestId: string) {
    if (showLog[logKey]) {
      setShowLog(prev => ({ ...prev, [logKey]: false }));
      return;
    }
    setShowLog(prev => ({ ...prev, [logKey]: true }));
    try {
      const res = await fetch(`/api/requests/${requestId}/logs`);
      if (!res.ok) {
        setLogs(prev => ({ ...prev, [logKey]: [{ filename: "Error", content: "No logs found." }] }));
        return;
      }
      const data = await res.json();
      setLogs(prev => ({ ...prev, [logKey]: data.logs || [] }));
    } catch {
      setLogs(prev => ({ ...prev, [logKey]: [{ filename: "Error", content: "Error fetching logs." }] }));
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
        {messages.map((m, i) => {
          const reqId = m.type === "request" ? m.id : m.requestId;
          const logKey = `${m.type}-${reqId}`;
          return (
          <div key={i} className={`MessageWrapper ${m.type}`}>
            <div className={`Message ${m.type} ${m.type === "request" && m.status === "aborted" ? "aborted" : ""}`}>
              {m.type === "request" && m.requester && (
                <div className="RequesterName">{m.requester}</div>
              )}
              <div className={`Text ${renderMd[i] !== false ? "markdown-enabled" : ""}`}>
                {renderMd[i] !== false ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={urlTransform}
                    components={{
                      img: ({ src, alt }) => {
                        const resolved = src?.startsWith("http")
                          ? src
                          : `/api/members/${id}/files-raw/${src}`;
                        const imgKey = `${i}-${src}`;
                        const filename = src?.split("/").pop() || "image";
                        if (i >= messages.length - 5 || expandedImages.has(imgKey)) {
                          return <img src={resolved} alt={alt || ""} className="InlineImage" />;
                        }
                        return (
                          <button
                            className="ShowImageBtn"
                            onClick={() => setExpandedImages(prev => new Set([...prev, imgKey]))}
                          >
                            Show {filename}
                          </button>
                        );
                      },
                      a: ({ href, children }) => {
                        const relPath = href ? resolveMemberFileHref(href, rootPath) : null;
                        if (relPath === null) {
                          return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                        }
                        const target = `/${id}/files/edit?path=${encodeURIComponent(relPath)}`;
                        return (
                          <a href={target} onClick={(e) => { e.preventDefault(); navigate(target); }}>
                            {children}
                          </a>
                        );
                      }
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                ) : m.text}
              </div>
              <div className="MetaRow">
                <MessageTime date={m.type === "response" ? m.time : m.requestTime} />
                {m.type === "response" && m.agent && <span className="AgentLabel">{m.agent}</span>}
                {m.type === "request" && m.status === "aborted" && <span className="AbortedLabel">Aborted</span>}
                <div className="ToggleGroup">
                  {reqId && (
                    <button
                      className={`LogToggle ${showLog[logKey] ? "active" : ""}`}
                      onClick={() => toggleLog(logKey, reqId)}
                      title="View Execution Log"
                    >
                      <FiTerminal />
                    </button>
                  )}
                  <button
                    className={`CopyToggle ${copied[i] ? "active" : ""}`}
                    onClick={() => {
                      navigator.clipboard.writeText(m.text);
                      setCopied(prev => ({ ...prev, [i]: true }));
                      setTimeout(() => setCopied(prev => ({ ...prev, [i]: false })), 1500);
                    }}
                    title="Copy message"
                  >
                    {copied[i] ? <FiCheck /> : <FiCopy />}
                  </button>
                  <button
                    className={`MarkdownToggle ${renderMd[i] !== false ? "active" : ""}`}
                    onClick={() => setRenderMd(prev => ({ ...prev, [i]: prev[i] === false ? true : false }))}
                    title="Toggle Markdown"
                  >
                    {renderMd[i] !== false ? <TbMarkdown /> : <TbMarkdownOff />}
                  </button>
                </div>
              </div>
              {reqId && showLog[logKey] && (
                <div className="LogArea">
                  {(logs[logKey] || []).map((log, idx) => (
                    <div key={idx} className="LogEntry">
                      <div className="LogHeader">{log.filename}</div>
                      <pre>{log.content}</pre>
                    </div>
                  ))}
                  {(!logs[logKey] || logs[logKey].length === 0) && <pre>Loading...</pre>}
                </div>
              )}
            </div>
            {m.type === "request" && m.status === "running" && (
              <div className="Message response loading-message">
                <div className="Text">
                  <div className="TypingContainer">
                    <div className="TypingIndicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <button className="CancelButton" onClick={() => m.id && handleCancel(m.id)}>
                      <FiX /> Cancel
                    </button>
                  </div>
                </div>
                <div className="MetaRow">
                  <MessageTime date={m.requestTime} live={true} />
                  <span className="AgentLabel">{selectedMember.agents[0]}</span>
                  <div className="ToggleGroup">
                    {m.id && (
                      <button
                        className={`LogToggle ${showLog[`loading-${m.id}`] ? "active" : ""}`}
                        onClick={() => toggleLog(`loading-${m.id}`, m.id!)}
                        title="View Execution Log"
                      >
                        <FiTerminal />
                      </button>
                    )}
                  </div>
                </div>
                {m.id && showLog[`loading-${m.id}`] && (
                  <div className="LogArea">
                    {(logs[`loading-${m.id}`] || []).map((log, idx) => (
                      <div key={idx} className="LogEntry">
                        <div className="LogHeader">{log.filename}</div>
                        <pre>{log.content}</pre>
                      </div>
                    ))}
                    {(!logs[`loading-${m.id}`] || logs[`loading-${m.id}`].length === 0) && <pre>Loading...</pre>}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        key={id}
        memberId={id!}
        memberName={selectedMember.name}
        initialValue={initialDraft}
        onSend={handleSend}
      />
    </div>
  );
}
