import "./App.css";
import { MemberProvider } from "./MemberProvider";
import { MemberList } from "./MemberList";
import { Chat } from "./Chat";

export function App() {
  return (
    <div className="App">
      <MemberProvider>
        <div className="Layout">
          <MemberList />
          <Chat />
        </div>
      </MemberProvider>
    </div>
  );
}
