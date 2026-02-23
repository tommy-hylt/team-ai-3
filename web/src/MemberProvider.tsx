import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import Member from "../../server/member";
import { MemberContext } from "./MemberContext";

export function MemberProvider({ children }: PropsWithChildren) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        if (data.length > 0 && !selectedMember) {
          setSelectedMember(data[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <MemberContext.Provider
      value={useMemo(
        () => ({ members, setMembers, loading, selectedMember, setSelectedMember }),
        [members, loading, selectedMember]
      )}
    >
      {children}
    </MemberContext.Provider>
  );
}
