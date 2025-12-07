import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "destructive" | "primary";
  delay?: number;
}

export const StatCard = ({ title, value, icon: Icon, variant = "default", delay = 0 }: StatCardProps) => {
  const variants = {
    default: "border-border bg-card",
    success: "border-success/30 bg-success/5",
    destructive: "border-destructive/30 bg-destructive/5",
    primary: "border-primary/30 bg-primary/5",
  };

  const iconVariants = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    primary: "text-primary",
  };

  const valueVariants = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    primary: "text-primary",
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 animate-fade-in touch-feedback card-interactive",
        variants[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("p-1.5 md:p-2 rounded-lg bg-background/50", iconVariants[variant])}>
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
          </div>
        </div>
        <div className={cn("text-xl md:text-3xl font-bold tracking-tight", valueVariants[variant])}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
};
