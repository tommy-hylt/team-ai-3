import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiAlertTriangle, FiPlus, FiFile, FiTrash2 } from "react-icons/fi";
import "./SkillEdit.css";

interface FileEntry {
  name: string;
  type: string;
}

export function SkillEdit() {
  const { id, skillName } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [syncMap, setSyncMap] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [id, skillName]);

  async function loadFiles() {
    if (!id || !skillName) return;
    const res = await fetch(`/api/members/${id}/files?path=.claude/skills/${skillName}`);
    const entries: FileEntry[] = await res.json();
    const fileEntries = entries.filter(e => e.type === "file");
    setFiles(fileEntries);

    // Check sync per file
    for (const file of fileEntries) {
      const [gemini, agent] = await Promise.all([
        fetch(`/api/members/${id}/files/.gemini/skills/${skillName}/${file.name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/members/${id}/files/.agent/skills/${skillName}/${file.name}`).then(r => r.ok ? r.json() : null),
      ]);
      const claudeRes = await fetch(`/api/members/${id}/files/.claude/skills/${skillName}/${file.name}`);
      const claude = claudeRes.ok ? await claudeRes.json() : null;

      const allMatch = claude && gemini && agent &&
        claude.content === gemini.content && claude.content === agent.content;

      setSyncMap(prev => ({ ...prev, [file.name]: !!allMatch }));
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !id || !skillName) return;
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `.claude/skills/${skillName}/${name}`, content: "" }),
    });
    setNewName("");
    setShowNew(false);
    navigate(`/${id}/edit/skills/${skillName}/${name}`);
  }

  async function handleDeleteFile(fileName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!id || !skillName) return;
    if (!confirm(`Delete file "${fileName}" from skill "${skillName}"?`)) return;
    await fetch(`/api/members/${id}/files/.claude/skills/${skillName}/${fileName}`, { method: "DELETE" });
    loadFiles();
  }

  return (
    <div className="SkillEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit/skills`)}>
          <FiChevronLeft />
        </button>
        <h2>{skillName}</h2>
        <button className="AddButton" onClick={() => setShowNew(true)}>
          <FiPlus />
        </button>
      </div>

      <div className="ScrollArea">
        {showNew && (
          <div className="NewFile">
            <input
              autoFocus
              placeholder="File name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <button onClick={handleCreate} disabled={!newName.trim()}>Create</button>
            <button className="CancelBtn" onClick={() => { setShowNew(false); setNewName(""); }}>Cancel</button>
          </div>
        )}
        <div className="FileItems">
          {files.map(file => (
            <div
              key={file.name}
              className="FileItem"
              onClick={() => navigate(`/${id}/edit/skills/${skillName}/${file.name}`)}
            >
              <FiFile className="FileIcon" />
              <span className="FileName">{file.name}</span>
              {syncMap[file.name] === false && (
                <FiAlertTriangle className="WarnIcon" title="Out of sync across vendor folders" />
              )}
              <button
                className="ItemDeleteBtn"
                onClick={e => handleDeleteFile(file.name, e)}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          {files.length === 0 && !showNew && (
            <div className="EmptyState">No files in this skill</div>
          )}
        </div>
      </div>
    </div>
  );
}
