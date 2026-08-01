import { useEffect, useState } from "react";

type Status = "online" | "parcial" | "offline" | "checking";
type CheckedStatus = Exclude<Status, "checking">;

function isCheckedStatus(status: unknown): status is CheckedStatus {
  return status === "online" || status === "parcial" || status === "offline";
}

export function useCefetStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/v1/cefet-status", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setStatus("offline");
          return;
        }

        const data = await res.json();
        const nextStatus = isCheckedStatus(data?.status)
          ? data.status
          : "offline";

        if (!cancelled) setStatus(nextStatus);
      } catch (err) {
        console.error("Erro ao verificar status:", err);
        if (!cancelled) setStatus("offline");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
