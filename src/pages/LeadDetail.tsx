import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Calendar, User, Edit, UserCog, UserCheck, ExternalLink, Plus, MessageSquare, StickyNote, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { useLead, useLeads, useLeadActivities, useLeadStatusHistory } from "@/hooks/useLeads";
import { useCommunications } from "@/hooks/useCommunications";
import { useNotes } from "@/hooks/useNotes";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusSelect } from "@/components/leads/LeadStatusSelect";
import { LeadActivityTimeline } from "@/components/leads/LeadActivityTimeline";
import { LeadStatusHistoryTimeline } from "@/components/leads/LeadStatusHistoryTimeline";
import { AddActivityDialog } from "@/components/leads/AddActivityDialog";
import { EditLeadDialog } from "@/components/leads/EditLeadDialog";
import { ReassignLeadDialog } from "@/components/leads/ReassignLeadDialog";
import { ConvertLeadDialog } from "@/components/leads/ConvertLeadDialog";
import { CommunicationTimeline } from "@/components/communications/CommunicationTimeline";
import { AddCommunicationDialog } from "@/components/communications/AddCommunicationDialog";
import { NotesList } from "@/components/notes/NotesList";
import { AddNoteDialog } from "@/components/notes/AddNoteDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { LEAD_SOURCES } from "@/types/leads";

export default function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const { data: lead, isLoading } = useLead(leadId!);
  const { updateLeadStatus } = useLeads();
  const { activities, isLoading: activitiesLoading, addActivity } = useLeadActivities(leadId!);
  const { data: statusHistory, isLoading: historyLoading } = useLeadStatusHistory(leadId!);
  const { communications, loading: commsLoading, addCommunication } = useCommunications({ leadId: leadId! });
  const { notes, loading: notesLoading, addNote } = useNotes({ leadId: leadId! });
  const { tasks, loading: tasksLoading, createTask, updateTaskStatus } = useTasks({ leadId: leadId! });

  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [addCommOpen, setAddCommOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const isOwner = lead?.owner_id === user?.id;
  const canEdit = isAdmin || isManager || isOwner;
  const canReassign = isAdmin || isManager;
  const canConvert = canEdit && lead?.status !== "converted" && !lead?.converted_to_contact_id;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={() => navigate("/leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const sourceLabel = LEAD_SOURCES.find((s) => s.value === lead.source)?.label || lead.source;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              <span className="text-sm text-muted-foreground">
                via {sourceLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canConvert && (
            <Button onClick={() => setConvertOpen(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Convert to Contact
            </Button>
          )}
          {lead.converted_to_contact_id && (
            <Link to={`/contacts/${lead.converted_to_contact_id}`}>
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Contact
              </Button>
            </Link>
          )}
          {canReassign && (
            <Button variant="outline" onClick={() => setReassignOpen(true)}>
              <UserCog className="mr-2 h-4 w-4" />
              Reassign
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditLeadOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${lead.email}`}
                        className="font-medium hover:underline"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-medium hover:underline"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inquiry Date</p>
                    <p className="font-medium">
                      {format(new Date(lead.inquiry_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">
                      {lead.owner?.full_name || lead.owner?.email || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              {lead.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & History Tabs */}
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="history">Status History</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>
                      Track all interactions with this lead
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button size="sm" onClick={() => setAddActivityOpen(true)}>
                      Add Activity
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <LeadActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                  />
                </CardContent>
              </Card>
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
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status History</CardTitle>
                  <CardDescription>
                    Track status changes over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeadStatusHistoryTimeline
                    history={statusHistory || []}
                    isLoading={historyLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status</CardTitle>
              <CardDescription>Update the lead's current status</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadStatusSelect
                value={lead.status}
                onValueChange={(status) => {
                  updateLeadStatus.mutate({ id: lead.id, status });
                }}
                disabled={!canEdit || updateLeadStatus.isPending}
              />
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(lead.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="font-medium">{activities.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AddActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
        onSubmit={(activity) => {
          addActivity.mutate(activity);
          setAddActivityOpen(false);
        }}
        isSubmitting={addActivity.isPending}
      />

      <EditLeadDialog
        open={editLeadOpen}
        onOpenChange={setEditLeadOpen}
        lead={lead}
      />

      <ReassignLeadDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        lead={lead}
      />

      <ConvertLeadDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        lead={lead}
      />

      <AddCommunicationDialog
        open={addCommOpen}
        onOpenChange={setAddCommOpen}
        onSubmit={addCommunication}
        defaultLinkType="lead"
        defaultLinkId={leadId}
      />

      <AddNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        onSubmit={addNote}
        defaultLinkType="lead"
        defaultLinkId={leadId}
      />

      <CreateTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        onSubmit={createTask}
        defaultLinkType="lead"
        defaultLinkId={leadId}
      />
    </div>
  );
}
