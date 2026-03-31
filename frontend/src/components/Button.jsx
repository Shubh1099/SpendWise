const variants = {
  primary:
    "bg-primary text-background hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400",
  secondary:
    "bg-secondary text-background hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400",
  danger:
    "bg-danger text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-400",
  ghost:
    "bg-transparent text-text-muted border border-border hover:text-text-primary hover:border-text-muted",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
