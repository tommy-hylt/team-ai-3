import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiTrash2 } from "react-icons/fi";
import "./SkillFileEdit.css";

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
