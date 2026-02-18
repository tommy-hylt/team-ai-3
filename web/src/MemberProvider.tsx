import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import Member from "../../server/member";
import { MemberContext } from "./MemberContext";

export function MemberProvider({ children }: PropsWithChildren) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>();

  useEffect(() => {
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        if (data.length > 0 && !selectedMember) {
          setSelectedMember(data[0]);
        }
      });
  }, []);

  return (
    <MemberContext.Provider
      value={useMemo(
        () => ({ members, setMembers, selectedMember, setSelectedMember }),
        [members, selectedMember]
      )}
    >
      {children}
    </MemberContext.Provider>
  );
}
