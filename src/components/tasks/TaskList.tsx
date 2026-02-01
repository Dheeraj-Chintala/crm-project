import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Task, TASK_PRIORITIES, TaskStatus } from "@/types/tasks";
import { format, isPast, isToday } from "date-fns";
import { Link } from "react-router-dom";
import { Clock, AlertTriangle, User, Building2, Briefcase } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  showLinks?: boolean;
  compact?: boolean;
}

export function TaskList({
  tasks,
  loading,
  onStatusChange,
  showLinks = true,
  compact = false,
}: TaskListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No tasks yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPriorityConfig = (priority: string) => {
    return TASK_PRIORITIES.find((p) => p.value === priority) || TASK_PRIORITIES[1];
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date) return false;
    return isPast(new Date(task.due_date)) && task.status !== "completed" && task.status !== "cancelled";
  };

  const isDueToday = (task: Task) => {
    if (!task.due_date) return false;
    return isToday(new Date(task.due_date));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const priorityConfig = getPriorityConfig(task.priority);
          const overdue = isOverdue(task);
          const dueToday = isDueToday(task);

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                task.status === "completed" ? "bg-muted/30 opacity-60" : ""
              } ${overdue ? "border-destructive/50 bg-destructive/5" : ""}`}
            >
              {onStatusChange && (
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={(checked) => {
                    onStatusChange(task.id, checked ? "completed" : "pending");
                  }}
                  className="mt-0.5"
                />
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-medium ${
                      task.status === "completed" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${priorityConfig.color}`} />
                  {overdue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                  {dueToday && !overdue && (
                    <Badge variant="secondary" className="text-xs">
                      Due Today
                    </Badge>
                  )}
                </div>

                {!compact && task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(task.due_date), "MMM d, yyyy")}
                    </span>
                  )}

                  {showLinks && (
                    <>
                      {task.lead && (
                        <Link
                          to={`/leads/${task.lead.id}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <User className="h-3 w-3" />
                          {task.lead.name}
                        </Link>
                      )}
                      {task.contact && (
                        <Link
                          to={`/contacts/${task.contact.id}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Building2 className="h-3 w-3" />
                          {task.contact.first_name} {task.contact.last_name}
                        </Link>
                      )}
                      {task.deal && (
                        <Link
                          to={`/deals/${task.deal.id}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Briefcase className="h-3 w-3" />
                          {task.deal.name}
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
