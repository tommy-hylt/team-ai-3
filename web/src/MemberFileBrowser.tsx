import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiFolder, FiFile, FiTrash2, FiPlus, FiUpload, FiStar, FiExternalLink } from "react-icons/fi";
import "./SkillList.css";
import "./MemberFileBrowser.css";

interface FileEntry {
  name: string;
  type: string;
}

function rawFileUrl(id: string, fullPath: string): string {
  return `/api/members/${id}/files-raw/${fullPath.split("/").map(encodeURIComponent).join("/")}`;
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
  const [shortcuts, setShortcuts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [id, currentPath]);

  useEffect(() => {
    if (!id) return;
    loadShortcuts();
  }, [id]);

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

  async function loadShortcuts() {
    if (!id) return;
    try {
      const res = await fetch(`/api/members/${id}/shortcuts`);
      const data = await res.json();
      setShortcuts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleShortcut(fullPath: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!id) return;
    const isShortcut = shortcuts.includes(fullPath);
    const res = await fetch(
      `/api/members/${id}/shortcuts${isShortcut ? `/${fullPath.split("/").map(encodeURIComponent).join("/")}` : ""}`,
      isShortcut
        ? { method: "DELETE" }
        : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: fullPath }) }
    );
    const data = await res.json();
    if (Array.isArray(data.shortcuts)) setShortcuts(data.shortcuts);
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", fullPath);
    await fetch(`/api/members/${id}/files/upload`, { method: "POST", body: formData });
    e.target.value = "";
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
    <div className="SkillList FileBrowser">
      <div className="Header">
        <button className="BackButton" onClick={() => (currentPath ? goUp() : navigate(`/${id}`))}>
          <FiChevronLeft />
        </button>
        <h2>{currentPath || "Files"}</h2>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button className="AddButton" title="Upload file" onClick={() => fileInputRef.current?.click()}>
          <FiUpload />
        </button>
        <button className="AddButton" title="New file" onClick={() => setShowNew(true)}>
          <FiPlus />
        </button>
      </div>
      <div className="ScrollArea">
        {!currentPath && shortcuts.length > 0 && (
          <div className="ShortcutsSection">
            <div className="ShortcutsLabel">Shortcuts</div>
            <div className="SkillItems">
              {shortcuts.map(shortcutPath => {
                const parts = shortcutPath.split("/");
                const name = parts.pop() || shortcutPath;
                const dir = parts.join("/");
                return (
                  <div
                    key={shortcutPath}
                    className="SkillItem"
                    onClick={() => navigate(`/${id}/files/edit?path=${encodeURIComponent(shortcutPath)}`)}
                  >
                    <FiFile className="FolderIcon" />
                    <span className="SkillName">
                      {name}
                      {dir && <span className="ShortcutDir">{dir}/</span>}
                    </span>
                    <a
                      className="ItemActionBtn"
                      title="View raw"
                      href={rawFileUrl(id!, shortcutPath)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                    >
                      <FiExternalLink />
                    </a>
                    <button
                      className="ItemActionBtn active"
                      title="Remove shortcut"
                      onClick={e => toggleShortcut(shortcutPath, e)}
                    >
                      <FiStar />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
              {entries.map(entry => {
                const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                const isFile = entry.type !== "directory";
                return (
                  <div
                    key={entry.name}
                    className="SkillItem"
                    onClick={() => handleNavigate(entry)}
                  >
                    {entry.type === "directory" ? <FiFolder className="FolderIcon" /> : <FiFile className="FolderIcon" />}
                    <span className="SkillName">{entry.name}</span>
                    {isFile && (
                      <a
                        className="ItemActionBtn"
                        title="View raw"
                        href={rawFileUrl(id!, fullPath)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                      >
                        <FiExternalLink />
                      </a>
                    )}
                    {isFile && (
                      <button
                        className={`ItemActionBtn ${shortcuts.includes(fullPath) ? "active" : ""}`}
                        title={shortcuts.includes(fullPath) ? "Remove shortcut" : "Add to shortcuts"}
                        onClick={e => toggleShortcut(fullPath, e)}
                      >
                        <FiStar />
                      </button>
                    )}
                    <button
                      className="ItemDeleteBtn"
                      onClick={e => handleDelete(entry.name, e)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              })}
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
