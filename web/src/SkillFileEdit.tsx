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

export function SkillFileEdit() {
  const { id, skillName, fileName } = useParams();
  const navigate = useNavigate();

  const [syncData, setSyncData] = useState<Record<string, SyncInfo> | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>(".claude");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !skillName || !fileName) return;
    fetch(`/api/members/${id}/skills/${skillName}/files/${fileName}/sync`)
      .then(res => res.json())
      .then((data: Record<string, SyncInfo>) => {
        setSyncData(data);
        
        let bestVendor = ".claude";
        if (!data[bestVendor]?.content) {
          if (data[".agent"]?.content) bestVendor = ".agent";
          else if (data[".gemini"]?.content) bestVendor = ".gemini";
        }
        
        setSelectedVendor(bestVendor);
        setValue(data[bestVendor]?.content || "");
      });
  }, [id, skillName, fileName]);

  async function handleSave() {
    if (!id || !skillName || !fileName || !syncData) return;
    setSaving(true);
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `.claude/skills/${skillName}/${fileName}`,
        content: value,
      }),
    });
    
    // Refresh sync data after save
    const res = await fetch(`/api/members/${id}/skills/${skillName}/files/${fileName}/sync`);
    const data = await res.json();
    setSyncData(data);
    setSaving(false);
  }

  async function handleDelete() {
    if (!id || !skillName || !fileName) return;
    if (!confirm(`Delete file "${fileName}"?`)) return;
    await fetch(`/api/members/${id}/files/.claude/skills/${skillName}/${fileName}`, { method: "DELETE" });
    navigate(`/${id}/edit/skills/${skillName}`);
  }

  if (!syncData) return <div className="SkillFileEdit">Loading...</div>;

  const entries = Object.entries(syncData);
  const existing = entries.filter(([, info]) => info.exists);
  const missing = entries.filter(([, info]) => !info.exists);

  const firstContent = existing.length > 0 ? existing[0][1].content : null;
  const allMatch = existing.every(([, info]) => info.content === firstContent);
  const isOutOfSync = missing.length > 0 || !allMatch;

  const originalContent = syncData[selectedVendor]?.content || "";
  const dirty = value !== originalContent;
  const canSave = dirty || isOutOfSync;

  let newest = existing[0];
  let longest = existing[0];

  if (existing.length > 0) {
    existing.forEach(v => {
      if ((v[1].mtime || 0) > (newest[1].mtime || 0)) newest = v;
      if ((v[1].size || 0) > (longest[1].size || 0)) longest = v;
    });
  }

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
        {isOutOfSync && (
          <div className="SyncWarning">
            <FiAlertTriangle className="WarningIcon" />
            <div className="WarningContent">
              <div className="WarningTitle">
                {missing.length > 0 ? "File missing from some vendor folders" : "File out of sync across vendor folders"}
              </div>
              <div className="WarningDetails">
                <div className="VendorList">
                  {entries.map(([v, info]) => {
                    const isSelected = v === selectedVendor;
                    return (
                      <span 
                        key={v} 
                        className={`VendorLink ${isSelected ? 'active' : ''} ${!info.exists ? 'missing' : ''}`}
                        onClick={() => {
                          setSelectedVendor(v);
                          setValue(syncData[v]?.content || "");
                        }}
                      >
                        {isSelected && <span className="CurrentIndicator">▶</span>}
                        {v} {info.exists ? `(${info.content?.length || 0} chars)` : "(missing)"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          placeholder="Write file content here..."
        />
      </div>
      <div className="SaveBar">
        <button className="SaveButton" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? "Saving..." : (isOutOfSync && !dirty ? "Sync across folders" : "Save")}
        </button>
      </div>
    </div>
  );
}
