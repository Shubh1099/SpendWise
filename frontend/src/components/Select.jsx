export default function Select({
  label,
  options = [],
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-muted">{label}</label>
      )}
      <select
        className={`rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
