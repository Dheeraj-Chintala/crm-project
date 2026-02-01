import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDeal, useDealActivities, useDealStageHistory, useDeals } from "@/hooks/useDeals";
import { useCommunications } from "@/hooks/useCommunications";
import { useNotes } from "@/hooks/useNotes";
import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealStageBadge } from "@/components/deals/DealStageBadge";
import { DealActivityTimeline } from "@/components/deals/DealActivityTimeline";
import { DealStageHistoryTimeline } from "@/components/deals/DealStageHistoryTimeline";
import { AddDealActivityDialog } from "@/components/deals/AddDealActivityDialog";
import { EditDealDialog } from "@/components/deals/EditDealDialog";
import { CommunicationTimeline } from "@/components/communications/CommunicationTimeline";
import { AddCommunicationDialog } from "@/components/communications/AddCommunicationDialog";
import { NotesList } from "@/components/notes/NotesList";
import { AddNoteDialog } from "@/components/notes/AddNoteDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { DEAL_STAGES, DealStage } from "@/types/deals";
import {
  ArrowLeft,
  Edit,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  StickyNote,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { deal, loading, error } = useDeal(dealId!);
  const { updateDealStage } = useDeals();
  const { activities, loading: activitiesLoading, addActivity } = useDealActivities(dealId!);
  const { history, loading: historyLoading } = useDealStageHistory(dealId!);
  const { communications, loading: commsLoading, addCommunication } = useCommunications({ dealId: dealId! });
  const { notes, loading: notesLoading, addNote } = useNotes({ dealId: dealId! });
  const { tasks, loading: tasksLoading, createTask, updateTaskStatus } = useTasks({ dealId: dealId! });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [addCommOpen, setAddCommOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const handleStageChange = async (newStage: DealStage) => {
    if (deal) {
      await updateDealStage(deal.id, newStage);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Deal not found</h2>
        <Button onClick={() => navigate("/deals")}>Back to Deals</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/deals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{deal.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <DealStageBadge stage={deal.stage} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => setActivityDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                    <p className="font-medium">{formatCurrency(deal.estimated_value)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed Value</p>
                    <p className="font-medium">{formatCurrency(deal.confirmed_value)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Close</p>
                    <p className="font-medium">
                      {deal.expected_close_date
                        ? format(new Date(deal.expected_close_date), "MMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </div>

                {deal.actual_close_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Actual Close</p>
                      <p className="font-medium">
                        {format(new Date(deal.actual_close_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">
                      {deal.owner?.full_name || deal.owner?.email || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {deal.notes && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap">{deal.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Tabs */}
          <Tabs defaultValue="activity">
            <TabsList className="flex-wrap">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="communications">Comms</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4">
              <DealActivityTimeline activities={activities} loading={activitiesLoading} />
            </TabsContent>
            <TabsContent value="communications" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setAddCommOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>
                <CommunicationTimeline communications={communications} loading={commsLoading} />
              </div>
            </TabsContent>
            <TabsContent value="notes" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setAddNoteOpen(true)}>
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
                <NotesList notes={notes} loading={notesLoading} />
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </div>
                <TaskList
                  tasks={tasks}
                  loading={tasksLoading}
                  onStatusChange={updateTaskStatus}
                  showLinks={false}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Linked Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linked Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.contact && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <Link
                      to={`/contacts/${deal.contact.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {deal.contact.first_name} {deal.contact.last_name}
                      {deal.contact.company && ` (${deal.contact.company})`}
                    </Link>
                  </div>
                </div>
              )}

              {deal.lead && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lead</p>
                    <Link
                      to={`/leads/${deal.lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {deal.lead.name}
                    </Link>
                  </div>
                </div>
              )}

              {!deal.contact && !deal.lead && (
                <p className="text-muted-foreground">No linked records</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={deal.stage} onValueChange={handleStageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Stage History */}
          <DealStageHistoryTimeline history={history} loading={historyLoading} />
        </div>
      </div>

      {/* Dialogs */}
      <EditDealDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        deal={deal}
      />
      <AddDealActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        onSubmit={addActivity}
      />
      <AddCommunicationDialog
        open={addCommOpen}
        onOpenChange={setAddCommOpen}
        onSubmit={addCommunication}
        defaultLinkType="deal"
        defaultLinkId={dealId}
      />
      <AddNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        onSubmit={addNote}
        defaultLinkType="deal"
        defaultLinkId={dealId}
      />
      <CreateTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        onSubmit={createTask}
        defaultLinkType="deal"
        defaultLinkId={dealId}
      />
    </div>
  );
}
