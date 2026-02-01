import { Badge } from "@/components/ui/badge";
import { LEAD_STATUSES, type LeadStatus } from "@/types/leads";
import { cn } from "@/lib/utils";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const statusConfig = LEAD_STATUSES.find((s) => s.value === status);

  const getVariant = () => {
    switch (status) {
      case "new":
        return "default";
      case "contacted":
        return "secondary";
      case "interested":
        return "outline";
      case "converted":
        return "default";
      case "lost":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        status === "converted" && "bg-primary hover:bg-primary/90",
        status === "interested" && "border-accent text-accent-foreground",
        className
      )}
    >
      {statusConfig?.label || status}
    </Badge>
  );
}
