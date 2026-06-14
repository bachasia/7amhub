"use client";
import { useState, useEffect } from "react";

type WorkerStatus = "alive" | "offline" | "unknown";

const POLL_MS = 60_000; // re-check mỗi 1 phút

export function useWorkerStatus() {
  const [status, setStatus] = useState<WorkerStatus>("unknown");
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) { setStatus("offline"); return; }
        const data = await res.json();
        setStatus(data.workerAlive ? "alive" : "offline");
        setLastSeen(data.workerLastSeen ?? null);
      } catch {
        setStatus("offline");
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return { status, lastSeen };
}
