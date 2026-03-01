import { useContext, useState, useEffect, useMemo } from "react";
import { MemberContext } from "./MemberContext";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiBell, FiChevronDown, FiChevronRight, FiArrowUp, FiArrowDown } from "react-icons/fi";
import "./MemberList.css";

interface MemberListProps {
  onSelect: (id: string) => void;
  subscribed?: boolean;
  onSubscribe?: () => void;
}

export function MemberList({ onSelect, subscribed = true, onSubscribe }: MemberListProps) {
  const { members, selectedMember } = useContext(MemberContext);
  const navigate = useNavigate();
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("expandedTeams");
    return saved ? JSON.parse(saved) : { "General": true };
  });

  // Group members by team
  const teamsMap = useMemo(() => {
    const map: Record<string, typeof members> = {};
    members.forEach(member => {
      const teams = member.teams || ["General"];
      teams.forEach(team => {
        if (!map[team]) map[team] = [];
        map[team].push(member);
      });
    });
    return map;
  }, [members]);

  const [teamOrder, setTeamOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("teamOrder");
    const initialTeams = Object.keys(teamsMap).sort((a, b) => {
      if (a === "General") return -1;
      if (b === "General") return 1;
      return a.localeCompare(b);
    });
    if (!saved) return initialTeams;
    
    const savedOrder = JSON.parse(saved) as string[];
    // Filter out teams that no longer exist and add new teams
    const existingTeams = savedOrder.filter(t => teamsMap[t]);
    const newTeams = Object.keys(teamsMap).filter(t => !savedOrder.includes(t));
    return [...existingTeams, ...newTeams];
  });

  useEffect(() => {
    localStorage.setItem("expandedTeams", JSON.stringify(expandedTeams));
  }, [expandedTeams]);

  useEffect(() => {
    localStorage.setItem("teamOrder", JSON.stringify(teamOrder));
  }, [teamOrder]);

  // Update team order when teamsMap changes (new teams added)
  useEffect(() => {
    const currentTeams = Object.keys(teamsMap);
    const newTeams = currentTeams.filter(t => !teamOrder.includes(t));
    if (newTeams.length > 0) {
      setTeamOrder(prev => [...prev, ...newTeams]);
    }
    // Also remove teams that no longer exist
    const removedTeams = teamOrder.filter(t => !teamsMap[t]);
    if (removedTeams.length > 0) {
      setTeamOrder(prev => prev.filter(t => teamsMap[t]));
    }
  }, [teamsMap]);

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [team]: !prev[team]
    }));
  };

  const moveTeam = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newOrder = [...teamOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setTeamOrder(newOrder);
    }
  };

  return (
    <div className="MemberList">
      <div className="Header">
        <h2>Team AI</h2>
        <button className="AddButton" onClick={() => navigate("/new")}>
          <FiPlus />
        </button>
      </div>
      {!subscribed && onSubscribe && (
        <div className="NotificationBanner">
          <div className="BannerText">
            <FiBell className="BannerIcon" />
            Get notified when agents reply.
          </div>
          <button className="SubscribeButton" onClick={onSubscribe}>
            Enable Notifications
          </button>
        </div>
      )}
      <div className="Content">
        {teamOrder.map((team, index) => (
          <div key={team} className="TeamSection">
            <div className="TeamHeader" onClick={() => toggleTeam(team)}>
              <div className="TeamExpander">
                {expandedTeams[team] ? <FiChevronDown /> : <FiChevronRight />}
                <span className="TeamName">{team}</span>
              </div>
              <div className="TeamActions">
                <button 
                  className="OrderButton" 
                  disabled={index === 0}
                  onClick={(e) => moveTeam(index, 'up', e)}
                >
                  <FiArrowUp />
                </button>
                <button 
                  className="OrderButton" 
                  disabled={index === teamOrder.length - 1}
                  onClick={(e) => moveTeam(index, 'down', e)}
                >
                  <FiArrowDown />
                </button>
                <span className="TeamCount">{teamsMap[team]?.length || 0}</span>
              </div>
            </div>
            {expandedTeams[team] && teamsMap[team] && (
              <div className="TeamMembers">
                {teamsMap[team].map((member) => (
                  <div
                    key={`${team}-${member.id}`}
                    className={`MemberItem ${selectedMember?.id === member.id ? "active" : ""}`}
                    onClick={() => onSelect(member.id)}
                  >
                    <div className="Info">
                      <div className="NameRow">
                        <span className="Name">{member.name}</span>
                        {member.agents.length > 0 && (
                          <span className="AgentTag">{member.agents[0]}</span>
                        )}
                      </div>
                      <span className="Description">{member.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
