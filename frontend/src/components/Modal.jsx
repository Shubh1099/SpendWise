import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, size, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative z-10 mx-4 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-2xl ${size === "lg" ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-text-primary cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
