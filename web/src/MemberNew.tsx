import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiPlus, FiX, FiCheck } from "react-icons/fi";
import "./MemberEdit.css";

export function MemberNew() {
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const navigate = useNavigate();
  const { setMembers } = useContext(MemberContext);
  
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  
  const [data, setData] = useState({
    name: "",
    description: "",
    agents: ["gemini-2.5-flash"],
    teams: ["General"],
    character: "",
    memory: ""
  });

  useEffect(() => {
    // Get available agents and optionally clone data
    const fetchInitial = async () => {
      const res = await fetch("/api/members");
      const members = await res.json();
      
      // We need availableAgents from any details call
      if (members.length > 0) {
        const dRes = await fetch(`/api/members/${members[0].id}/details`);
        const dData = await dRes.json();
        setAvailableAgents(dData.availableAgents);
      }

      if (cloneId) {
        const cRes = await fetch(`/api/members/${cloneId}/details`);
        const cData = await cRes.json();
        setData({
          name: `${cData.name} Copy`,
          description: cData.description,
          agents: cData.agents,
          teams: cData.teams || ["General"],
          character: cData.character,
          memory: cData.memory
        });

        // Fetch skills to clone
        Promise.all([
          fetch(`/api/members/${cloneId}/files?path=.claude/skills`).then(r => r.json()),
          fetch(`/api/members/${cloneId}/files?path=.gemini/skills`).then(r => r.json()),
          fetch(`/api/members/${cloneId}/files?path=.agent/skills`).then(r => r.json()),
        ]).then(([claude, gemini, agent]) => {
          const getDirs = (entries: any[]) =>
            (Array.isArray(entries) ? entries : []).filter((e: any) => e.type === "directory").map((e: any) => e.name);
          const allNames = [...new Set([...getDirs(claude), ...getDirs(gemini), ...getDirs(agent)])];
          allNames.sort();
          setAvailableSkills(allNames);
          setSelectedSkills(allNames); // Default select all
        });
      }
    };
    fetchInitial();
  }, [cloneId]);

  async function handleSave() {
    if (!data.name.trim()) return alert("Name is required");

    const payload = { ...data, cloneFrom: cloneId, includeSkills: cloneId ? selectedSkills : undefined };

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      const newMember = await res.json();
      const mRes = await fetch("/api/members");
      const mData = await mRes.json();
      setMembers(mData);
      navigate(`/${newMember.id}`);
    }
  }

  function toggleAgent(agentName: string) {
    const current = data.agents;
    if (current.includes(agentName)) {
      setData({ ...data, agents: current.filter(a => a !== agentName) });
    } else {
      setData({ ...data, agents: [...current, agentName] });
    }
  }

  function addTeam() {
    setIsAddingTeam(true);
    setNewTeamName("");
  }

  function confirmAddTeam() {
    if (newTeamName.trim()) {
      if (!data.teams.includes(newTeamName.trim())) {
        setData({ ...data, teams: [...data.teams, newTeamName.trim()] });
      }
    }
    setIsAddingTeam(false);
  }

  function removeTeam(teamName: string) {
    const updated = data.teams.filter(t => t !== teamName);
    setData({ ...data, teams: updated.length > 0 ? updated : ["General"] });
  }

  function toggleSkill(skillName: string) {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(prev => prev.filter(s => s !== skillName));
    } else {
      setSelectedSkills(prev => [...prev, skillName]);
    }
  }

  const sortedAvailable = [...availableAgents].sort((a, b) => {
    const aIdx = data.agents.indexOf(a);
    const bIdx = data.agents.indexOf(b);
    const aActive = aIdx !== -1;
    const bActive = bIdx !== -1;
    if (aActive && bActive) return aIdx - bIdx;
    if (aActive) return -1;
    if (bActive) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="MemberEdit">
      <div className="Header">
        <button className="BackButton" onClick={() => navigate("/")}>
          <FiChevronLeft />
        </button>
        <h2>{cloneId ? "Clone Agent" : "New Agent"}</h2>
      </div>
      <div className="ScrollArea">
        <div className="Form">
          <div className="Field editing">
            <div className="FieldHeader"><label>Name</label></div>
            <div className="FieldContent">
              <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} autoFocus />
            </div>
          </div>

          <div className="Field editing">
            <div className="FieldHeader"><label>Description</label></div>
            <div className="FieldContent">
              <input value={data.description} onChange={e => setData({ ...data, description: e.target.value })} />
            </div>
          </div>

          <div className="Field editing">
            <div className="FieldHeader"><label>Teams</label></div>
            <div className="FieldContent">
              <div className="AgentTags editing">
                {data.teams.map(team => (
                  <span key={team} className="AgentTag active" onClick={() => removeTeam(team)}>
                    {team} <FiX style={{ marginLeft: 4, fontSize: 10 }} />
                  </span>
                ))}
                {isAddingTeam ? (
                  <div className="InlineInput">
                    <input 
                      value={newTeamName} 
                      onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") confirmAddTeam();
                        if (e.key === "Escape") setIsAddingTeam(false);
                      }}
                      autoFocus
                      placeholder="Team name"
                    />
                    <FiCheck className="ConfirmIcon" onClick={confirmAddTeam} />
                    <FiX className="CancelIcon" onClick={() => setIsAddingTeam(false)} />
                  </div>
                ) : (
                  <button className="AddTagButton" onClick={addTeam}>
                    <FiPlus />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="Field editing">
            <div className="FieldHeader"><label>Available Agents</label></div>
            <div className="FieldContent">
              <div className="AgentTags editing">
                {sortedAvailable.map(agent => (
                  <span 
                    key={agent} 
                    className={`AgentTag toggle ${data.agents.includes(agent) ? "active" : ""}`}
                    onClick={() => toggleAgent(agent)}
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {availableSkills.length > 0 && (
            <div className="Field editing">
              <div className="FieldHeader"><label>Skills to Clone</label></div>
              <div className="FieldContent">
                <div className="AgentTags editing">
                  {availableSkills.map(skill => (
                    <span 
                      key={skill} 
                      className={`AgentTag toggle ${selectedSkills.includes(skill) ? "active" : ""}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="Field editing">
            <div className="FieldHeader"><label>Character (CHARACTER.md)</label></div>
            <div className="FieldContent">
              <textarea value={data.character} onChange={e => setData({ ...data, character: e.target.value })} />
            </div>
          </div>

          <div className="Field editing">
            <div className="FieldHeader"><label>Memory (MEMORY.md)</label></div>
            <div className="FieldContent">
              <textarea value={data.memory} onChange={e => setData({ ...data, memory: e.target.value })} />
            </div>
          </div>

          <div className="FormActions">
            <button className="SubmitButton" onClick={handleSave}>
              {cloneId ? "Clone Agent" : "Create Agent"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
