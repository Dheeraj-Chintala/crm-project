import { format } from "date-fns";
import { Phone, Mail, Calendar, MessageSquare, Clock, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactActivity } from "@/types/contacts";

interface ContactActivityTimelineProps {
  activities: ContactActivity[];
  isLoading: boolean;
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  follow_up: Clock,
  other: MoreHorizontal,
};

const activityLabels: Record<string, string> = {
  call: "Phone Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  follow_up: "Follow Up",
  other: "Activity",
};

export function ContactActivityTimeline({
  activities,
  isLoading,
}: ContactActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No activities yet. Add one to track interactions.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-5 top-0 h-full w-px bg-border" />

      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type] || MoreHorizontal;
        const label = activityLabels[activity.activity_type] || activity.activity_type;

        return (
          <div key={activity.id} className="relative flex gap-4 pl-2">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{label}</p>
                <time className="text-xs text-muted-foreground">
                  {format(new Date(activity.created_at), "MMM d, h:mm a")}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {activity.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                by {activity.user?.full_name || activity.user?.email || "Unknown"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
