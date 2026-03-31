const variants = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  danger: "bg-danger/15 text-danger",
  muted: "bg-text-muted/15 text-text-muted",
};

export default function Badge({
  children,
  variant = "primary",
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
