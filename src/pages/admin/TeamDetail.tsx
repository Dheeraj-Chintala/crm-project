import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, UserMinus, Shield } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
}

interface AvailableUser {
  id: string;
  email: string;
  full_name: string | null;
}

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { logAudit } = useAuditLog();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  async function fetchTeamData() {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);

      if (membersError) throw membersError;

      // Fetch profiles for members
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", member.user_id)
            .maybeSingle();

          return { ...member, profile: profileData };
        })
      );

      setMembers(membersWithProfiles);

      // Fetch available users (not in team)
      const memberUserIds = (membersData || []).map((m) => m.user_id);
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      const available = (allProfiles || []).filter(
        (p) => !memberUserIds.includes(p.id)
      );
      setAvailableUsers(available);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember() {
    if (!selectedUserId || !teamId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: selectedUserId,
        role: selectedRole,
      });

      if (error) throw error;

      const addedUser = availableUsers.find((u) => u.id === selectedUserId);
      await logAudit({
        action: "team.add_member",
        entityType: "team_member",
        entityId: teamId,
        newValues: {
          user_id: selectedUserId,
          user_email: addedUser?.email,
          role: selectedRole,
        },
      });

      toast({
        title: "Member added",
        description: `${addedUser?.full_name || addedUser?.email} has been added to the team.`,
      });

      setAddDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
      fetchTeamData();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!confirm(`Remove ${member.profile?.full_name || member.profile?.email} from the team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      await logAudit({
        action: "team.remove_member",
        entityType: "team_member",
        entityId: teamId,
        oldValues: {
          user_id: member.user_id,
          user_email: member.profile?.email,
          role: member.role,
        },
      });

      toast({
        title: "Member removed",
        description: `${member.profile?.full_name || member.profile?.email} has been removed from the team.`,
      });

      fetchTeamData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateMemberRole(member: TeamMember, newRole: string) {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", member.id);

      if (error) throw error;

      await logAudit({
        action: "team.update_member_role",
        entityType: "team_member",
        entityId: teamId,
        oldValues: { user_id: member.user_id, role: member.role },
        newValues: { user_id: member.user_id, role: newRole },
      });

      toast({
        title: "Role updated",
        description: `${member.profile?.full_name || member.profile?.email}'s role has been updated.`,
      });

      fetchTeamData();
    } catch (error: any) {
      console.error("Error updating member role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  }

  function getInitials(name: string | null | undefined) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="outline" onClick={() => navigate("/admin/teams")}>
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="crm-page-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/teams")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1>{team.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {team.description || "No description"}
            </p>
          </div>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableUsers.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Select a user to add to this team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={saving || !selectedUserId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-8 w-8" />
              <p>No members in this team</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {member.profile?.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.profile?.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateMemberRole(member, value)}
                      >
                        <SelectTrigger className="w-28">
                          <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                            {member.role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
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
