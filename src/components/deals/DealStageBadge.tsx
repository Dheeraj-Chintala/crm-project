import { Badge } from "@/components/ui/badge";
import { DealStage, getDealStageLabel, getDealStageColor } from "@/types/deals";
import { cn } from "@/lib/utils";

interface DealStageBadgeProps {
  stage: DealStage;
  className?: string;
}

export function DealStageBadge({ stage, className }: DealStageBadgeProps) {
  return (
    <Badge 
      className={cn(
        "text-white font-medium",
        getDealStageColor(stage),
        className
      )}
    >
      {getDealStageLabel(stage)}
    </Badge>
  );
}
