import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MemberContext } from "./MemberContext";
import { FiChevronLeft, FiEdit2, FiCheck, FiX } from "react-icons/fi";
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



  useEffect(() => {

    if (id) {

      fetch(`/api/members/${id}/details`)

        .then(res => res.json())

        .then(setDetails);

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

        <button className="BackButton" onClick={() => navigate(-1)}>

          <FiChevronLeft />

        </button>

        <h2>Edit Agent: {details.name}</h2>

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
          <div className={`Field ${editingField === "character" ? "editing" : ""}`}>
            <div className="FieldHeader">
              <label>Background (CHARACTER.md)</label>
              {editingField !== "character" ? (
                <button className="EditButton" onClick={() => startEditing("character", details.character)}>
                  <FiEdit2 />
                </button>
              ) : (
                <div className="EditActions">
                  <button className="SaveButton" onClick={() => handleSave("character")}><FiCheck /></button>
                  <button className="CancelButton" onClick={() => setEditingField(null)}><FiX /></button>
                </div>
              )}
            </div>
            <div className="FieldContent">
              {editingField === "character" ? (
                <textarea 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <pre>{details.character || "(Empty)"}</pre>
              )}
            </div>
          </div>

          {/* Memory */}
          <div className={`Field ${editingField === "memory" ? "editing" : ""}`}>
            <div className="FieldHeader">
              <label>Memory (MEMORY.md)</label>
              {editingField !== "memory" ? (
                <button className="EditButton" onClick={() => startEditing("memory", details.memory)}>
                  <FiEdit2 />
                </button>
              ) : (
                <div className="EditActions">
                  <button className="SaveButton" onClick={() => handleSave("memory")}><FiCheck /></button>
                  <button className="CancelButton" onClick={() => setEditingField(null)}><FiX /></button>
                </div>
              )}
            </div>
            <div className="FieldContent">
              {editingField === "memory" ? (
                <textarea 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <pre>{details.memory || "(Empty)"}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
