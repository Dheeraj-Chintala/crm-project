import { useState } from "react";
import { useDeals } from "@/hooks/useDeals";
import { DealKanbanBoard } from "@/components/deals/DealKanbanBoard";
import { CreateDealDialog } from "@/components/deals/CreateDealDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DealStageBadge } from "@/components/deals/DealStageBadge";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function Deals() {
  const { deals, loading, updateDealStage } = useDeals();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const navigate = useNavigate();

  const filteredDeals = deals.filter(
    (deal) =>
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.contact?.first_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      deal.contact?.last_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      deal.contact?.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Manage your deals and track progress
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Kanban
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <DealKanbanBoard
          deals={filteredDeals}
          onDealStageChange={updateDealStage}
          loading={loading}
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Est. Value</TableHead>
                <TableHead>Confirmed Value</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDeals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No deals found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                  >
                    <TableCell className="font-medium">{deal.name}</TableCell>
                    <TableCell>
                      <DealStageBadge stage={deal.stage} />
                    </TableCell>
                    <TableCell>
                      {deal.contact
                        ? `${deal.contact.first_name} ${deal.contact.last_name || ""}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(deal.estimated_value)}</TableCell>
                    <TableCell>{formatCurrency(deal.confirmed_value)}</TableCell>
                    <TableCell>
                      {deal.expected_close_date
                        ? format(new Date(deal.expected_close_date), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {deal.owner?.full_name || deal.owner?.email || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateDealDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
