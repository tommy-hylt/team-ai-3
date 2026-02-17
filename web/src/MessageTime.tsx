import { useEffect, useState } from "react";
import "./MessageTime.css";

type TimeMode = "short" | "long";

let globalMode: TimeMode = "short";
const listeners: ((mode: TimeMode) => void)[] = [];

function toggleGlobalMode() {
  globalMode = globalMode === "short" ? "long" : "short";
  listeners.forEach((l) => l(globalMode));
}

export function MessageTime({ date }: { date: Date | string }) {
  const [mode, setMode] = useState<TimeMode>(globalMode);
  const [display, setDisplay] = useState("");
  const targetDate = new Date(date);

  useEffect(() => {
    const listener = (newMode: TimeMode) => setMode(newMode);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  useEffect(() => {
    function update() {
      if (mode === "long") {
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, "0");
        const d = String(targetDate.getDate()).padStart(2, "0");
        const h = String(targetDate.getHours()).padStart(2, "0");
        const min = String(targetDate.getMinutes()).padStart(2, "0");
        const s = String(targetDate.getSeconds()).padStart(2, "0");
        setDisplay(`${y}-${m}-${d} ${h}:${min}:${s}`);
        return;
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setDisplay("just now");
      } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        setDisplay(`${mins} minute${mins > 1 ? "s" : ""} ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setDisplay(`${hours} hour${hours > 1 ? "s" : ""} ago`);
      } else if (diffInSeconds < 172800) {
        setDisplay("yesterday");
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setDisplay(`${days} days ago`);
      }
    }

    update();
    const interval = setInterval(update, mode === "short" ? 10000 : 1000);
    return () => clearInterval(interval);
  }, [mode, targetDate]);

  return (
    <div className="MessageTime" onClick={(e) => {
      e.stopPropagation();
      toggleGlobalMode();
    }}>
      {display}
    </div>
  );
}
