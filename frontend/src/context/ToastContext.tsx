import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; tone: "ok" | "warn" | "err" };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => undefined);

function durationFor(tone: Toast["tone"]) {
  if (tone === "err" || tone === "warn") return 12_000;
  return 6_000;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  const push = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => dismiss(id), durationFor(tone));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed right-4 top-4 z-[2000] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm text-white shadow-card ${
              t.tone === "err" ? "bg-sos" : t.tone === "warn" ? "bg-amber-600" : "bg-header"
            }`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1">{t.message}</p>
              <button
                type="button"
                className="shrink-0 text-white/80 hover:text-white"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
