import { useCallback, useEffect, useRef, useState } from "react";

type Status = "online" | "parcial" | "offline" | "checking";
type CheckedStatus = Exclude<Status, "checking">;

type StatusChecks = {
  main: boolean | null;
  alunos: boolean | null;
};

type CefetStatusState = {
  status: Status;
  checks: StatusChecks;
  underCpa: boolean;
  checkedAt: string | null;
  isChecking: boolean;
};

type CefetStatusPayload = {
  status?: unknown;
  checks?: {
    main?: unknown;
    alunos?: unknown;
  };
  checkedAt?: unknown;
  underCpa?: unknown;
};

const DEFAULT_CHECKS: StatusChecks = {
  main: null,
  alunos: null,
};

function isCheckedStatus(status: unknown): status is CheckedStatus {
  return status === "online" || status === "parcial" || status === "offline";
}

function normalizeChecks(checks: CefetStatusPayload["checks"]): StatusChecks {
  return {
    main: typeof checks?.main === "boolean" ? checks.main : null,
    alunos: typeof checks?.alunos === "boolean" ? checks.alunos : null,
  };
}

export function useCefetStatus() {
  const mountedRef = useRef(false);
  const [state, setState] = useState<CefetStatusState>({
    status: "checking",
    checks: DEFAULT_CHECKS,
    underCpa: false,
    checkedAt: null,
    isChecking: true,
  });

  const checkStatus = useCallback(async (showChecking = true) => {
    if (mountedRef.current) {
      setState((current) => ({
        ...current,
        status: showChecking ? "checking" : current.status,
        isChecking: true,
      }));
    }

    try {
      const res = await fetch("/api/v1/cefet-status", {
        cache: "no-store",
      });

      if (!res.ok) {
        if (mountedRef.current) {
          setState({
            status: "offline",
            checks: { main: false, alunos: false },
            underCpa: false,
            checkedAt: null,
            isChecking: false,
          });
        }
        return;
      }

      const data = (await res.json()) as CefetStatusPayload;
      const nextStatus = isCheckedStatus(data?.status)
        ? data.status
        : "offline";
      const checkedAt =
        typeof data?.checkedAt === "string" ? data.checkedAt : null;

      if (mountedRef.current) {
        setState({
          status: nextStatus,
          checks: normalizeChecks(data?.checks),
          underCpa: data?.underCpa === true,
          checkedAt,
          isChecking: false,
        });
      }
    } catch (err) {
      console.error("Erro ao verificar status:", err);
      if (mountedRef.current) {
        setState({
          status: "offline",
          checks: { main: false, alunos: false },
          underCpa: false,
          checkedAt: null,
          isChecking: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkStatus(true);
    const interval = setInterval(() => checkStatus(false), 60000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkStatus]);

  return {
    ...state,
    refresh: () => checkStatus(true),
  };
}
