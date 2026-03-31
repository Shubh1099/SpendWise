import { useRef } from "react";
import { Upload } from "lucide-react";

export default function FileUpload({ label, onChange, accept, className = "" }) {
  const inputRef = useRef(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text-muted">{label}</label>
      )}
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary cursor-pointer"
      >
        <Upload size={16} />
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
