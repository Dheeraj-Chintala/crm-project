import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Deal, DealStage, DEAL_STAGES, getDealStageLabel } from "@/types/deals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DollarSign, Calendar, User, Building } from "lucide-react";
import { format } from "date-fns";

interface DealKanbanBoardProps {
  deals: Deal[];
  onDealStageChange: (dealId: string, newStage: DealStage) => Promise<boolean>;
  loading: boolean;
}

interface DealCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
}

function DealCard({ deal, onDragStart }: DealCardProps) {
  const navigate = useNavigate();
  const displayValue = deal.confirmed_value || deal.estimated_value;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <h4 className="font-medium text-sm line-clamp-1">{deal.name}</h4>

        {displayValue && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(displayValue)}
              {deal.confirmed_value ? "" : " (est.)"}
            </span>
          </div>
        )}

        {deal.contact && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {deal.contact.first_name} {deal.contact.last_name}
            </span>
          </div>
        )}

        {deal.contact?.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building className="h-3 w-3" />
            <span className="truncate">{deal.contact.company}</span>
          </div>
        )}

        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  stage: (typeof DEAL_STAGES)[0];
  deals: Deal[];
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: DealStage) => void;
}

function KanbanColumn({
  stage,
  deals,
  onDragStart,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, deal) => {
    return sum + (deal.confirmed_value || deal.estimated_value || 0);
  }, 0);

  return (
    <div
      className="flex-1 min-w-[250px] max-w-[320px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.value)}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", stage.color)} />
              {stage.label}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {deals.length}
            </Badge>
          </div>
          {totalValue > 0 && (
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
              }).format(totalValue)}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onDragStart={onDragStart} />
          ))}
          {deals.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No deals
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DealKanbanBoard({
  deals,
  onDealStageChange,
  loading,
}: DealKanbanBoardProps) {
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      inquiry: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };

    deals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [deals]);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (dealId) {
      await onDealStageChange(dealId, newStage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage) => (
        <KanbanColumn
          key={stage.value}
          stage={stage}
          deals={dealsByStage[stage.value]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
