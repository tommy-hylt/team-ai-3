import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft } from "react-icons/fi";
import "./TextEdit.css";

const FIELD_CONFIG: Record<string, { label: string; file: string; key: string }> = {
  character: { label: "Character", file: "CHARACTER.md", key: "character" },
  memory: { label: "Memory", file: "MEMORY.md", key: "memory" },
};

export function TextEdit() {
  const { id, field } = useParams();
  const navigate = useNavigate();
  const { setMembers } = useContext(MemberContext);
  const config = FIELD_CONFIG[field || ""];

  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !config) return;
    fetch(`/api/members/${id}/details`)
      .then(res => res.json())
      .then(data => {
        const v = data[config.key] || "";
        setValue(v);
        setOriginal(v);
      });
  }, [id, config]);

  async function handleSave() {
    if (!id || !config) return;
    setSaving(true);
    await fetch(`/api/members/${id}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [config.key]: value }),
    });
    fetch("/api/members").then(res => res.json()).then(setMembers);
    setSaving(false);
    navigate(`/${id}/edit`);
  }

  if (!config) return <div className="TextEdit">Unknown field</div>;

  const dirty = value !== original;

  return (
    <div className="TextEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit`)}>
          <FiChevronLeft />
        </button>
        <h2>{config.label} <span className="FileName">{config.file}</span></h2>
      </div>
      <div className="EditorArea">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          placeholder={`Write ${config.label.toLowerCase()} here...`}
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
