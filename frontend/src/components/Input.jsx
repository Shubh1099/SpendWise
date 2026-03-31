export default function Input({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-muted">{label}</label>
      )}
      <input
        className={`rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary ${className}`}
        {...props}
      />
    </div>
  );
}
