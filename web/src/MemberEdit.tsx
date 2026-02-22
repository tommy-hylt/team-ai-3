import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiEdit2, FiCheck, FiX, FiFolder, FiCopy, FiTrash2, FiMessageSquare } from "react-icons/fi";
import "./MemberEdit.css";

interface MemberDetails {
  id: string;
  name: string;
  description: string;
  agents: string[];
  character: string;
  memory: string;
  availableAgents: string[];
}

export function MemberEdit() {

  const { id } = useParams();

  const navigate = useNavigate();

  const { setMembers } = useContext(MemberContext);

  const [details, setDetails] = useState<MemberDetails | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);

  const [editValue, setEditValue] = useState<any>("");

  const [skillNames, setSkillNames] = useState<string[]>([]);



  useEffect(() => {

    if (id) {

      fetch(`/api/members/${id}/details`)

        .then(res => res.json())

        .then(setDetails);

      Promise.all([
        fetch(`/api/members/${id}/files?path=.claude/skills`).then(r => r.json()),
        fetch(`/api/members/${id}/files?path=.gemini/skills`).then(r => r.json()),
        fetch(`/api/members/${id}/files?path=.agent/skills`).then(r => r.json()),
      ]).then(([claude, gemini, agent]) => {
        const getDirs = (entries: any[]) =>
          (Array.isArray(entries) ? entries : []).filter((e: any) => e.type === "directory").map((e: any) => e.name);
        const allNames = [...new Set([...getDirs(claude), ...getDirs(gemini), ...getDirs(agent)])];
        allNames.sort();
        setSkillNames(allNames);
      });

    }

  }, [id]);



  async function handleSave(field: keyof MemberDetails) {

    if (!details || !id) return;



    let payload: any = {};

    payload[field] = editValue;



    const res = await fetch(`/api/members/${id}/details`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payload),

    });

    

    const updated = await res.json();

    setDetails(updated);

    setEditingField(null);



    // Refresh global members list

    fetch("/api/members")

      .then(res => res.json())

      .then(setMembers);

  }



  function startEditing(field: keyof MemberDetails, value: any) {

    setEditingField(field);

    setEditValue(value);

  }



  function toggleAgent(agentName: string) {

    const current = (editValue as string[]) || [];

    if (current.includes(agentName)) {

      setEditValue(current.filter(a => a !== agentName));

    } else {

      setEditValue([...current, agentName]);

    }

  }



  if (!details) return <div className="MemberEdit">Loading...</div>;



  const sortedAvailable = [...details.availableAgents].sort((a, b) => {

    const aIdx = editValue?.indexOf(a);

    const bIdx = editValue?.indexOf(b);

    const aActive = aIdx !== -1 && aIdx !== undefined;

    const bActive = bIdx !== -1 && bIdx !== undefined;

    

    if (aActive && bActive) return aIdx! - bIdx!;

    if (aActive) return -1;

    if (bActive) return 1;

    return a.localeCompare(b);

  });



  return (

    <div className="MemberEdit">

      <div className="Header">

        <button className="BackButton" onClick={() => navigate(`/${id}`)}>

          <FiChevronLeft />

        </button>

        <h2>{details.name}</h2>

      </div>

      <div className="ScrollArea">

        <div className="Form">

          {/* Description */}

          <div className={`Field ${editingField === "description" ? "editing" : ""}`}>

            <div className="FieldHeader">

              <label>Description</label>

              {editingField !== "description" ? (

                <button className="EditButton" onClick={() => startEditing("description", details.description)}>

                  <FiEdit2 />

                </button>

              ) : (

                <div className="EditActions">

                  <button className="SaveButton" onClick={() => handleSave("description")}><FiCheck /></button>

                  <button className="CancelButton" onClick={() => setEditingField(null)}><FiX /></button>

                </div>

              )}

            </div>

            <div className="FieldContent">

              {editingField === "description" ? (

                <input 

                  type="text" 

                  value={editValue} 

                  onChange={e => setEditValue(e.target.value)}

                  autoFocus

                />

              ) : (

                <pre>{details.description || "(Empty)"}</pre>

              )}

            </div>

          </div>



          {/* Agents */}

          <div className={`Field ${editingField === "agents" ? "editing" : ""}`}>

            <div className="FieldHeader">

              <label>Available Agents</label>

              {editingField !== "agents" ? (

                <button className="EditButton" onClick={() => startEditing("agents", details.agents)}>

                  <FiEdit2 />

                </button>

              ) : (

                <div className="EditActions">

                  <button className="SaveButton" onClick={() => handleSave("agents")}><FiCheck /></button>

                  <button className="CancelButton" onClick={() => setEditingField(null)}><FiX /></button>

                </div>

              )}

            </div>

            <div className="FieldContent">

              {editingField === "agents" ? (

                <div className="AgentTags editing">

                  {sortedAvailable.map((agent) => {

                    const isActive = editValue.includes(agent);

                    return (

                      <span 

                        key={agent} 

                        className={`AgentTag toggle ${isActive ? "active" : ""}`}

                        onClick={() => toggleAgent(agent)}

                      >

                        {agent}

                      </span>

                    );

                  })}

                </div>

              ) : (

                <div className="AgentTags">

                  {details.agents.map(a => <span key={a} className="AgentTag">{a}</span>)}

                </div>

              )}

            </div>

          </div>

          {/* Character */}
          <div className="Field clickable" onClick={() => navigate(`/${id}/edit/character`)}>
            <div className="FieldHeader">
              <label>Character (CHARACTER.md)</label>
              <FiEdit2 className="EditIcon" />
            </div>
            <div className="FieldContent">
              <pre>{details.character || "(Empty)"}</pre>
            </div>
          </div>

          {/* Memory */}
          <div className="Field clickable" onClick={() => navigate(`/${id}/edit/memory`)}>
            <div className="FieldHeader">
              <label>Memory (MEMORY.md)</label>
              <FiEdit2 className="EditIcon" />
            </div>
            <div className="FieldContent">
              <pre>{details.memory || "(Empty)"}</pre>
            </div>
          </div>

          {/* Skills */}
          <div className="Field clickable" onClick={() => navigate(`/${id}/edit/skills`)}>
            <div className="FieldHeader">
              <label>Skills</label>
              <FiEdit2 className="EditIcon" />
            </div>
            <div className="FieldContent">
              {skillNames.length > 0 ? (
                <div className="AgentTags">
                  {skillNames.map(name => (
                    <span key={name} className="AgentTag">
                      <FiFolder style={{ marginRight: 6, fontSize: 12 }} />
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <pre>(No skills)</pre>
              )}
            </div>
          </div>

          <div className="FormActions">
            <button className="CloneButton" onClick={() => navigate(`/new?clone=${id}`)}>
              <FiCopy /> Clone Member
            </button>
            <button className="ClearButton" onClick={() => navigate(`/${id}/chat/clear`)}>
              <FiMessageSquare /> Clear Chat
            </button>
            <button className="DeleteButton" onClick={() => navigate(`/${id}/delete`)}>
              <FiTrash2 /> Delete Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
