import { Badge } from "@/components/ui/badge";
import { TaskPriority, TASK_PRIORITIES } from "@/types/tasks";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = TASK_PRIORITIES.find((p) => p.value === priority) || TASK_PRIORITIES[1];

  const variantMap: Record<TaskPriority, "default" | "secondary" | "destructive" | "outline"> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    urgent: "destructive",
  };

  return (
    <Badge variant={variantMap[priority]} className="text-xs">
      <div className={`h-2 w-2 rounded-full ${config.color} mr-1`} />
      {config.label}
    </Badge>
  );
}
