import { format } from "date-fns";
import { DealActivity } from "@/types/deals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, Calendar, FileText, MessageSquare, Users } from "lucide-react";

interface DealActivityTimelineProps {
  activities: DealActivity[];
  loading: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  other: <Users className="h-4 w-4" />,
};

export function DealActivityTimeline({
  activities,
  loading,
}: DealActivityTimelineProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No activities recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {activityIcons[activity.activity_type] || activityIcons.other}
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium capitalize">
                    {activity.activity_type}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  by {activity.user?.full_name || activity.user?.email || "Unknown"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
