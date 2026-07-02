import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiTrash2, FiEdit2, FiMoreHorizontal, FiExternalLink } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./SkillFileEdit.css";

export function MemberFileEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get("path") || "";

  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const [rootPath, setRootPath] = useState("");

  useEffect(() => {
    if (!id || !filePath) return;
    fetch(`/api/members/${id}/files/${encodeURIComponent(filePath)}`)
      .then(res => {
        if (!res.ok) return { content: "" };
        return res.json();
      })
      .then(data => {
        setValue(data.content || "");
        setOriginal(data.content || "");
        setLoaded(true);
      });
    fetch(`/api/members/${id}/rootpath`)
      .then(res => res.json())
      .then(data => setRootPath(data.rootPath || ""));
  }, [id, filePath]);

  async function handleSave() {
    if (!id || !filePath) return;
    setSaving(true);
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: filePath,
        content: value,
      }),
    });
    setOriginal(value);
    setSaving(false);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!id || !filePath) return;
    if (!confirm(`Delete file "${filePath}"?`)) return;
    await fetch(`/api/members/${id}/files/${encodeURIComponent(filePath)}`, { method: "DELETE" });
    
    const parts = filePath.split("/");
    parts.pop();
    const dirPath = parts.join("/");
    navigate(`/${id}/files${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ""}`);
  }

  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"];
  const isImage = IMAGE_EXTS.some(ext => filePath.toLowerCase().endsWith(ext));

  if (!isImage && !loaded) return <div className="SkillFileEdit">Loading...</div>;

  const dirty = value !== original;
  const isMarkdown = filePath.endsWith(".md");

  return (
    <div className="SkillFileEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => {
          const parts = filePath.split("/");
          parts.pop();
          const dirPath = parts.join("/");
          navigate(`/${id}/files${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ""}`);
        }}>
          <FiChevronLeft />
        </button>
        {showFullPath ? (
          <h2 className="FullPathTitle">{rootPath}/{filePath}</h2>
        ) : (
          <h2>
            <span className="FileName">{filePath.split("/").pop()}</span>
            {filePath.includes("/") && <span className="SkillPath">{filePath.split("/").slice(0, -1).join("/")}/</span>}
          </h2>
        )}
        <button className="ActionButton" title="Toggle full path" onClick={() => setShowFullPath(v => !v)}>
          <FiMoreHorizontal />
        </button>
        <a
          className="ActionButton"
          title="View raw"
          href={`/api/members/${id}/files-raw/${filePath.split("/").map(encodeURIComponent).join("/")}`}
          target="_blank"
          rel="noreferrer"
        >
          <FiExternalLink />
        </a>
        {!isImage && !isEditing && (
          <button className="ActionButton" onClick={() => setIsEditing(true)}>
            <FiEdit2 />
          </button>
        )}
        <button className="DeleteButton" onClick={handleDelete}>
          <FiTrash2 />
        </button>
      </div>
      <div className="EditorArea">
        {isImage ? (
          <div className="ReadMode ImageMode">
            <img src={`/api/members/${id}/files-raw/${encodeURIComponent(filePath)}`} alt={filePath.split("/").pop()} />
          </div>
        ) : isEditing ? (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            placeholder="Write file content here..."
          />
        ) : (
          <div className={`ReadMode${isMarkdown ? " markdown-enabled" : ""}`}>
            {isMarkdown
              ? <div className="MarkdownBody"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "(Empty file)"}</ReactMarkdown></div>
              : <pre>{value || "(Empty file)"}</pre>
            }
          </div>
        )}
      </div>
      {isEditing && (
        <div className="SaveBar">
          <button className="SaveButton" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="CancelButton" onClick={() => {
            setValue(original);
            setIsEditing(false);
          }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
