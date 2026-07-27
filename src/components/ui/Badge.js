"use client";

export default function Badge({ children, variant = "primary", size = "md", className = "", dot }) {
  var variantClass = {
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    secondary: "badge-secondary",
  }[variant] || "badge-primary";

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
