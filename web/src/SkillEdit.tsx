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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [id, skillName]);

  async function loadFiles() {
    if (!id || !skillName) return;
    setLoading(true);
    try {
      // Fetch entries from all 3 vendor folders to ensure we don't miss files that only exist in one
      const [claudeRes, geminiRes, agentRes] = await Promise.all([
        fetch(`/api/members/${id}/files?path=.claude/skills/${skillName}`),
        fetch(`/api/members/${id}/files?path=.gemini/skills/${skillName}`),
        fetch(`/api/members/${id}/files?path=.agent/skills/${skillName}`)
      ]);

      const claudeEntries: FileEntry[] = claudeRes.ok ? await claudeRes.json() : [];
      const geminiEntries: FileEntry[] = geminiRes.ok ? await geminiRes.json() : [];
      const agentEntries: FileEntry[] = agentRes.ok ? await agentRes.json() : [];

      // Merge unique file names
      const allFilesMap = new Map<string, FileEntry>();
      [...claudeEntries, ...geminiEntries, ...agentEntries].forEach(e => {
        if (e.type === "file") {
          allFilesMap.set(e.name, e);
        }
      });
      
      const fileEntries = Array.from(allFilesMap.values());
      setFiles(fileEntries);

      // Check sync per file using the dedicated sync endpoint
      for (const file of fileEntries) {
        try {
          const syncRes = await fetch(`/api/members/${id}/skills/${skillName}/files/${file.name}/sync`);
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            const entries = Object.values(syncData) as any[];
            const existing = entries.filter(info => info.exists);
            const firstContent = existing.length > 0 ? existing[0].content : null;
            const allMatch = existing.every(info => info.content === firstContent);
            
            // It's in sync if it exists in all 3 folders AND all contents match exactly
            const isFullySynced = entries.length === 3 && existing.length === 3 && allMatch;
            setSyncMap(prev => ({ ...prev, [file.name]: isFullySynced }));
          }
        } catch {
          setSyncMap(prev => ({ ...prev, [file.name]: false }));
        }
      }
    } finally {
      setLoading(false);
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
          {loading ? (
            <div className="EmptyState">Loading files...</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
