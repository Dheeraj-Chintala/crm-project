import { Badge } from "@/components/ui/badge";
import { TaskStatus, TASK_STATUSES } from "@/types/tasks";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = TASK_STATUSES.find((s) => s.value === status) || TASK_STATUSES[0];

  const variantMap: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    in_progress: "secondary",
    completed: "default",
    cancelled: "destructive",
  };

  return (
    <Badge variant={variantMap[status]} className="text-xs">
      {config.label}
    </Badge>
  );
}
