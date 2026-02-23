import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiTrash2, FiEdit2 } from "react-icons/fi";
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

  if (!loaded) return <div className="SkillFileEdit">Loading...</div>;

  const dirty = value !== original;

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
        <h2>{filePath.split("/").pop()} <span className="SkillPath">{filePath.split("/").slice(0, -1).join("/")}/</span></h2>
        {!isEditing && (
          <button className="ActionButton" onClick={() => setIsEditing(true)}>
            <FiEdit2 />
          </button>
        )}
        <button className="DeleteButton" onClick={handleDelete}>
          <FiTrash2 />
        </button>
      </div>
      <div className="EditorArea">
        {isEditing ? (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            placeholder="Write file content here..."
          />
        ) : (
          <div className="ReadMode">
            <pre>{value || "(Empty file)"}</pre>
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
