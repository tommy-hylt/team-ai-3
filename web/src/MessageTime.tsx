import { useEffect, useState, useRef } from "react";
import "./MessageTime.css";

type TimeMode = "short" | "long";

let globalMode: TimeMode = "short";
const listeners: ((mode: TimeMode) => void)[] = [];

function toggleGlobalMode() {
  globalMode = globalMode === "short" ? "long" : "short";
  listeners.forEach((l) => l(globalMode));
}

function formatPrecise(diffInSeconds: number): string {
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ${diffInSeconds % 60}s`;
  const h = Math.floor(diffInSeconds / 3600);
  const m = Math.floor((diffInSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatShort(diffInSeconds: number): string {
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

export function MessageTime({ date, live }: { date: Date | string; live?: boolean }) {
  const [mode, setMode] = useState<TimeMode>(globalMode);
  const [display, setDisplay] = useState("");
  const startRef = useRef(live ? new Date() : null);

  useEffect(() => {
    const listener = (newMode: TimeMode) => setMode(newMode);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  useEffect(() => {
    const targetDate = live ? startRef.current! : new Date(date);

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
      setDisplay(live ? formatPrecise(diffInSeconds) : formatShort(diffInSeconds));
    }

    update();
    const interval = setInterval(update, live ? 1000 : 10000);
    return () => clearInterval(interval);
  }, [mode, date, live]);

  return (
    <div className="MessageTime" onClick={(e) => {
      e.stopPropagation();
      toggleGlobalMode();
    }}>
      {display}
    </div>
  );
}
