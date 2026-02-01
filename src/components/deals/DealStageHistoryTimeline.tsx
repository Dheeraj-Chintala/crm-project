import { format } from "date-fns";
import { DealStageHistory, getDealStageLabel } from "@/types/deals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { DealStageBadge } from "./DealStageBadge";

interface DealStageHistoryTimelineProps {
  history: DealStageHistory[];
  loading: boolean;
}

export function DealStageHistoryTimeline({
  history,
  loading,
}: DealStageHistoryTimelineProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No stage changes recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stage History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 pb-4 border-b last:border-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.old_stage ? (
                    <>
                      <DealStageBadge stage={item.old_stage} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Created as</span>
                  )}
                  <DealStageBadge stage={item.new_stage} />
                </div>
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {item.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  by{" "}
                  {item.changed_by_user?.full_name ||
                    item.changed_by_user?.email ||
                    "Unknown"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
