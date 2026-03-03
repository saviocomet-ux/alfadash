import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "border-border/50",
  primary: "border-primary/30 glow-primary",
  success: "border-success/30 glow-success",
  warning: "border-warning/30",
};

const iconBgStyles = {
  default: "bg-secondary",
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
};

export function KpiCard({ title, value, subtitle, icon, variant = "default" }: KpiCardProps) {
  return (
    <div className={`glass-card p-5 ${variantStyles[variant]} transition-all hover:scale-[1.02] duration-300`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground animate-count-up">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconBgStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
