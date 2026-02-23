import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiTrash2, FiAlertTriangle } from "react-icons/fi";
import "./SkillFileEdit.css";

interface SyncInfo {
  exists: boolean;
  content?: string;
  mtime?: number;
  size?: number;
}

function SyncWarning({ id, skillName, fileName }: { id: string; skillName: string; fileName: string }) {
  const [syncData, setSyncInfo] = useState<Record<string, SyncInfo> | null>(null);

  useEffect(() => {
    fetch(`/api/members/${id}/skills/${skillName}/files/${fileName}/sync`)
      .then(res => res.json())
      .then(setSyncInfo);
  }, [id, skillName, fileName]);

  if (!syncData) return null;

  const entries = Object.entries(syncData);
  const existing = entries.filter(([, info]) => info.exists);
  const missing = entries.filter(([, info]) => !info.exists);

  // Check if all existing contents are identical
  const firstContent = existing.length > 0 ? existing[0][1].content : null;
  const allMatch = existing.every(([, info]) => info.content === firstContent);

  if (missing.length === 0 && allMatch) return null;

  // Find newest and longest among existing
  let newest = existing[0];
  let longest = existing[0];

  existing.forEach(v => {
    if ((v[1].mtime || 0) > (newest[1].mtime || 0)) newest = v;
    if ((v[1].size || 0) > (longest[1].size || 0)) longest = v;
  });

  return (
    <div className="SyncWarning">
      <FiAlertTriangle className="WarningIcon" />
      <div className="WarningContent">
        <div className="WarningTitle">
          {missing.length > 0 ? "File missing from some vendor folders" : "File out of sync across vendor folders"}
        </div>
        <div className="WarningDetails">
          {missing.length > 0 && (
            <span>Missing: <strong>{missing.map(([v]) => v).join(", ")}</strong></span>
          )}
          {!allMatch && (
            <>
              <span>Newest: <strong>{newest[0]}</strong></span>
              <span>Longest: <strong>{longest[0]}</strong> ({longest[1].size} bytes)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SkillFileEdit() {
  const { id, skillName, fileName } = useParams();
  const navigate = useNavigate();

  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id || !skillName || !fileName) return;
    fetch(`/api/members/${id}/files/.claude/skills/${skillName}/${fileName}`)
      .then(res => {
        if (!res.ok) return { content: "" };
        return res.json();
      })
      .then(data => {
        setValue(data.content || "");
        setOriginal(data.content || "");
        setLoaded(true);
      });
  }, [id, skillName, fileName]);

  async function handleSave() {
    if (!id || !skillName || !fileName) return;
    setSaving(true);
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `.claude/skills/${skillName}/${fileName}`,
        content: value,
      }),
    });
    setOriginal(value);
    setSaving(false);
  }

  async function handleDelete() {
    if (!id || !skillName || !fileName) return;
    if (!confirm(`Delete file "${fileName}"?`)) return;
    await fetch(`/api/members/${id}/files/.claude/skills/${skillName}/${fileName}`, { method: "DELETE" });
    navigate(`/${id}/edit/skills/${skillName}`);
  }

  if (!loaded) return <div className="SkillFileEdit">Loading...</div>;

  const dirty = value !== original;

  return (
    <div className="SkillFileEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit/skills/${skillName}`)}>
          <FiChevronLeft />
        </button>
        <h2>{fileName} <span className="SkillPath">{skillName}/</span></h2>
        <button className="DeleteButton" onClick={handleDelete}>
          <FiTrash2 />
        </button>
      </div>
      <div className="EditorArea">
        {id && skillName && fileName && (
          <SyncWarning id={id} skillName={skillName} fileName={fileName} />
        )}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          placeholder="Write file content here..."
        />
      </div>
      <div className="SaveBar">
        <button className="SaveButton" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
