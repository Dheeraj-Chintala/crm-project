import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  MapPin,
  User,
  Edit,
  Briefcase,
  ExternalLink,
  MessageSquare,
  StickyNote,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import { useContact, useContactActivities } from "@/hooks/useContacts";
import { useCommunications } from "@/hooks/useCommunications";
import { useNotes } from "@/hooks/useNotes";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ContactActivityTimeline } from "@/components/contacts/ContactActivityTimeline";
import { AddContactActivityDialog } from "@/components/contacts/AddContactActivityDialog";
import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { CommunicationTimeline } from "@/components/communications/CommunicationTimeline";
import { AddCommunicationDialog } from "@/components/communications/AddCommunicationDialog";
import { NotesList } from "@/components/notes/NotesList";
import { AddNoteDialog } from "@/components/notes/AddNoteDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { PHONE_TYPES, EMAIL_TYPES } from "@/types/contacts";

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const { data: contact, isLoading } = useContact(contactId!);
  const { activities, isLoading: activitiesLoading, addActivity } = useContactActivities(contactId!);
  const { communications, loading: commsLoading, addCommunication } = useCommunications({ contactId: contactId! });
  const { notes, loading: notesLoading, addNote } = useNotes({ contactId: contactId! });
  const { tasks, loading: tasksLoading, createTask, updateTaskStatus } = useTasks({ contactId: contactId! });

  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [addCommOpen, setAddCommOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const isOwner = contact?.owner_id === user?.id;
  const canEdit = isAdmin || isManager || isOwner;

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

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => navigate("/contacts")}>
          Back to Contacts
        </Button>
      </div>
    );
  }

  const getPhoneTypeLabel = (type: string) => {
    return PHONE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getEmailTypeLabel = (type: string) => {
    return EMAIL_TYPES.find(t => t.value === type)?.label || type;
  };

  const fullAddress = [
    contact.address_line1,
    contact.address_line2,
    contact.city,
    contact.state,
    contact.postal_code,
    contact.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {contact.first_name} {contact.last_name}
              </h1>
              {contact.lead_id && (
                <Badge variant="secondary">Converted from Lead</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              {contact.job_title && <span>{contact.job_title}</span>}
              {contact.job_title && contact.company && <span>•</span>}
              {contact.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {contact.company}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditContactOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Contact Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Emails */}
              {contact.emails && contact.emails.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Email Addresses</h4>
                  <div className="space-y-2">
                    {contact.emails.map((email) => (
                      <div key={email.id} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <a
                            href={`mailto:${email.email}`}
                            className="font-medium hover:underline"
                          >
                            {email.email}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {getEmailTypeLabel(email.email_type)}
                            </span>
                            {email.is_primary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phones */}
              {contact.phones && contact.phones.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Phone Numbers</h4>
                  <div className="space-y-2">
                    {contact.phones.map((phone) => (
                      <div key={phone.id} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <a
                            href={`tel:${phone.phone_number}`}
                            className="font-medium hover:underline"
                          >
                            {phone.phone_number}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {getPhoneTypeLabel(phone.phone_type)}
                            </span>
                            {phone.is_primary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              {fullAddress && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Location</h4>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{fullAddress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                  <p className="whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Tabs */}
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>
                      Track all interactions with this contact
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button size="sm" onClick={() => setAddActivityOpen(true)}>
                      Add Activity
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <ContactActivityTimeline
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
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Owner & Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium">
                  {contact.owner?.full_name || contact.owner?.email || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(contact.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(contact.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {contact.lead_id && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Converted From</p>
                  <Link
                    to={`/leads/${contact.lead_id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View Original Lead
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AddContactActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
        onSubmit={(activity) => {
          addActivity.mutate(activity);
          setAddActivityOpen(false);
        }}
        isSubmitting={addActivity.isPending}
      />

      {editContactOpen && (
        <EditContactDialog
          open={editContactOpen}
          onOpenChange={setEditContactOpen}
          contact={contact}
        />
      )}

      <AddCommunicationDialog
        open={addCommOpen}
        onOpenChange={setAddCommOpen}
        onSubmit={addCommunication}
        defaultLinkType="contact"
        defaultLinkId={contactId}
      />

      <AddNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        onSubmit={addNote}
        defaultLinkType="contact"
        defaultLinkId={contactId}
      />

      <CreateTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        onSubmit={createTask}
        defaultLinkType="contact"
        defaultLinkId={contactId}
      />
    </div>
  );
}
