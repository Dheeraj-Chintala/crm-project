import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Pencil, Trash2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { logAudit } = useAuditLog();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (teamsData) {
        // Get member counts
        const teamsWithCounts = await Promise.all(
          teamsData.map(async (team) => {
            const { count } = await supabase
              .from("team_members")
              .select("*", { count: "exact", head: true })
              .eq("team_id", team.id);

            return { ...team, member_count: count || 0 };
          })
        );
        setTeams(teamsWithCounts);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!formData.name.trim() || !user) return;

    setSaving(true);
    try {
      const { data: newTeam, error } = await supabase
        .from("teams")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as team owner
      await supabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: "owner",
      });

      await logAudit({
        action: "team.create",
        entityType: "team",
        entityId: newTeam.id,
        newValues: { name: newTeam.name, description: newTeam.description },
      });

      toast({
        title: "Team created",
        description: `${newTeam.name} has been created successfully.`,
      });

      setFormData({ name: "", description: "" });
      setCreateDialogOpen(false);
      fetchTeams();
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTeam() {
    if (!editingTeam || !formData.name.trim()) return;

    setSaving(true);
    try {
      const oldValues = { name: editingTeam.name, description: editingTeam.description };
      
      const { error } = await supabase
        .from("teams")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        })
        .eq("id", editingTeam.id);

      if (error) throw error;

      await logAudit({
        action: "team.update",
        entityType: "team",
        entityId: editingTeam.id,
        oldValues,
        newValues: { name: formData.name.trim(), description: formData.description.trim() },
      });

      toast({
        title: "Team updated",
        description: "Team has been updated successfully.",
      });

      setFormData({ name: "", description: "" });
      setEditingTeam(null);
      fetchTeams();
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam(team: Team) {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("teams").delete().eq("id", team.id);

      if (error) throw error;

      await logAudit({
        action: "team.delete",
        entityType: "team",
        entityId: team.id,
        oldValues: { name: team.name, description: team.description },
      });

      toast({
        title: "Team deleted",
        description: `${team.name} has been deleted.`,
      });

      fetchTeams();
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
    }
  }

  function openEditDialog(team: Team) {
    setFormData({ name: team.name, description: team.description || "" });
    setEditingTeam(team);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="crm-page-header flex items-center justify-between">
        <div>
          <h1>Teams</h1>
          <p className="mt-1 text-muted-foreground">
            Manage teams and team memberships
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team to organize users and manage permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter team name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter team description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={saving || !formData.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update the team information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter team description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTeam(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>
            {teams.length} team{teams.length !== 1 ? "s" : ""} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-8 w-8" />
              <p>No teams created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {team.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {team.member_count} member{team.member_count !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(team.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/teams/${team.id}`)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(team)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTeam(team)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
