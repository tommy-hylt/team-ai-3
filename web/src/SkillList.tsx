import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiAlertTriangle, FiPlus, FiFolder, FiTrash2 } from "react-icons/fi";
import "./SkillList.css";

interface SkillEntry {
  name: string;
  type: string;
}

interface SyncStatus {
  [vendor: string]: boolean;
}

export function SkillList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [syncMap, setSyncMap] = useState<Record<string, SyncStatus>>({});
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadSkills();
  }, [id]);

  async function loadSkills() {
    if (!id) return;
    // List skill folders from all 3 vendors and compare
    Promise.all([
      fetch(`/api/members/${id}/files?path=.claude/skills`).then(r => r.json()),
      fetch(`/api/members/${id}/files?path=.gemini/skills`).then(r => r.json()),
      fetch(`/api/members/${id}/files?path=.agent/skills`).then(r => r.json()),
    ]).then(([claude, gemini, agent]) => {
      const getDirs = (entries: SkillEntry[]) =>
        (Array.isArray(entries) ? entries : []).filter(e => e.type === "directory").map(e => e.name);

      const claudeDirs = getDirs(claude);
      const geminiDirs = getDirs(gemini);
      const agentDirs = getDirs(agent);

      // Union of all skill names
      const allNames = [...new Set([...claudeDirs, ...geminiDirs, ...agentDirs])];
      allNames.sort();

      setSkills(allNames.map(name => ({ name, type: "directory" })));

      const sync: Record<string, SyncStatus> = {};
      for (const name of allNames) {
        sync[name] = {
          ".claude": claudeDirs.includes(name),
          ".gemini": geminiDirs.includes(name),
          ".agent": agentDirs.includes(name),
        };
      }
      setSyncMap(sync);
    });
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !id) return;
    // Create a default SKILL.md in the new skill folder
    await fetch(`/api/members/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `.claude/skills/${name}/SKILL.md`, content: `# ${name}\n` }),
    });
    setNewName("");
    setShowNew(false);
    navigate(`/${id}/edit/skills/${name}`);
  }

  async function handleDelete(skillName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!id) return;
    if (!confirm(`Delete skill "${skillName}" and all its files from all vendor folders?`)) return;
    await fetch(`/api/members/${id}/files/.claude/skills/${skillName}`, { method: "DELETE" });
    loadSkills();
  }

  function getMissing(skillName: string): string[] {
    const sync = syncMap[skillName];
    if (!sync) return [];
    return Object.entries(sync).filter(([, exists]) => !exists).map(([vendor]) => vendor);
  }

  return (
    <div className="SkillList">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate(`/${id}/edit`)}>
          <FiChevronLeft />
        </button>
        <h2>Skills</h2>
        <button className="AddButton" onClick={() => setShowNew(true)}>
          <FiPlus />
        </button>
      </div>
      <div className="ScrollArea">
        {showNew && (
          <div className="NewSkill">
            <input
              autoFocus
              placeholder="Skill name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <button onClick={handleCreate} disabled={!newName.trim()}>Create</button>
            <button className="CancelBtn" onClick={() => { setShowNew(false); setNewName(""); }}>Cancel</button>
          </div>
        )}
        <div className="SkillItems">
          {skills.map(skill => (
            <div
              key={skill.name}
              className="SkillItem"
              onClick={() => navigate(`/${id}/edit/skills/${skill.name}`)}
            >
              <FiFolder className="FolderIcon" />
              <span className="SkillName">{skill.name}</span>
              {getMissing(skill.name).length > 0 && (
                <FiAlertTriangle className="WarnIcon" title={`Missing from: ${getMissing(skill.name).join(", ")}`} />
              )}
              <button
                className="ItemDeleteBtn"
                onClick={e => handleDelete(skill.name, e)}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          {skills.length === 0 && !showNew && (
            <div className="EmptyState">No skills yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
