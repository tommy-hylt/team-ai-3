import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiFolder, FiFile, FiTrash2, FiPlus } from "react-icons/fi";
import "./SkillList.css";

interface FileEntry {
  name: string;
  type: string;
}

export function MemberFileBrowser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPath = searchParams.get("path") || "";

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [id, currentPath]);

  async function loadFiles() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}/files?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleNavigate(entry: FileEntry) {
    if (entry.type === "directory") {
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      setSearchParams({ path: nextPath });
    } else {
      const filePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      navigate(`/${id}/files/edit?path=${encodeURIComponent(filePath)}`);
    }
  }

  function goUp() {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    const nextPath = parts.join("/");
    setSearchParams(nextPath ? { path: nextPath } : {});
  }

  async function handleDelete(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!id) return;
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    if (!confirm(`Delete ${fullPath}?`)) return;
    await fetch(`/api/members/${id}/files/${encodeURIComponent(fullPath)}`, { method: "DELETE" });
    loadFiles();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !id) return;
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fullPath, content: "" }),
    });
    setNewName("");
    setShowNew(false);
    navigate(`/${id}/files/edit?path=${encodeURIComponent(fullPath)}`);
  }

  return (
    <div className="SkillList">
      <div className="Header">
        <button className="BackButton" onClick={() => (currentPath ? goUp() : navigate(`/${id}`))}>
          <FiChevronLeft />
        </button>
        <h2>{currentPath || "Files"}</h2>
        <button className="AddButton" onClick={() => setShowNew(true)}>
          <FiPlus />
        </button>
      </div>
      <div className="ScrollArea">
        {showNew && (
          <div className="NewSkill">
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
        <div className="SkillItems">
          {loading ? (
            <div className="EmptyState">Loading files...</div>
          ) : (
            <>
              {entries.map(entry => (
                <div
                  key={entry.name}
                  className="SkillItem"
                  onClick={() => handleNavigate(entry)}
                >
                  {entry.type === "directory" ? <FiFolder className="FolderIcon" /> : <FiFile className="FolderIcon" />}
                  <span className="SkillName">{entry.name}</span>
                  <button
                    className="ItemDeleteBtn"
                    onClick={e => handleDelete(entry.name, e)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              {entries.length === 0 && !showNew && (
                <div className="EmptyState">Folder is empty</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
