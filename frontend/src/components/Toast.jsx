import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { ToastContext } from "../hooks/useToast";

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "success") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-xl animate-[slideIn_0.25s_ease-out]"
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-primary" />
            ) : (
              <XCircle size={18} className="shrink-0 text-danger" />
            )}
            <span className="text-sm text-text-primary">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 shrink-0 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

