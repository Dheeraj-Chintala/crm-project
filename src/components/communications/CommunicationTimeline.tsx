import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Communication, COMMUNICATION_TYPES } from "@/types/communications";
import { format } from "date-fns";
import {
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
};

interface CommunicationTimelineProps {
  communications: Communication[];
  loading?: boolean;
}

export function CommunicationTimeline({ communications, loading }: CommunicationTimelineProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (communications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No communication records yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          
          {communications.map((comm) => {
            const typeConfig = COMMUNICATION_TYPES.find(t => t.value === comm.type);
            const Icon = iconMap[typeConfig?.icon || "MoreHorizontal"];

            return (
              <div key={comm.id} className="relative flex gap-4 pl-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted z-10">
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 space-y-1 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{typeConfig?.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {comm.direction === "inbound" ? (
                        <><ArrowDownLeft className="h-3 w-3 mr-1" />Inbound</>
                      ) : (
                        <><ArrowUpRight className="h-3 w-3 mr-1" />Outbound</>
                      )}
                    </Badge>
                    {comm.duration_minutes && (
                      <span className="text-xs text-muted-foreground">
                        {comm.duration_minutes} min
                      </span>
                    )}
                  </div>
                  
                  {comm.subject && (
                    <p className="text-sm font-medium">{comm.subject}</p>
                  )}
                  
                  {comm.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {comm.content}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comm.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
