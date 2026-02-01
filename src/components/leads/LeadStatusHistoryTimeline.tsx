import { format } from "date-fns";
import { ArrowRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "./LeadStatusBadge";
import type { LeadStatusHistory } from "@/types/leads";

interface LeadStatusHistoryTimelineProps {
  history: LeadStatusHistory[];
  isLoading: boolean;
}

export function LeadStatusHistoryTimeline({
  history,
  isLoading,
}: LeadStatusHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No status changes yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 h-full w-px bg-border" />

      {history.map((item) => (
        <div key={item.id} className="relative flex gap-4 pl-2">
          {/* Icon */}
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              {item.old_status && (
                <>
                  <LeadStatusBadge status={item.old_status} />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </>
              )}
              <LeadStatusBadge status={item.new_status} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                by {item.changer?.full_name || item.changer?.email || "Unknown"}
              </p>
              <time className="text-xs text-muted-foreground">
                {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
