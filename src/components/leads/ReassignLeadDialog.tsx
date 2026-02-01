import { useState, useEffect } from "react";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Lead } from "@/types/leads";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface ReassignLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function ReassignLeadDialog({
  open,
  onOpenChange,
  lead,
}: ReassignLeadDialogProps) {
  const { reassignLead } = useLeads();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(lead.owner_id);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedUserId(lead.owner_id);
      fetchUsers();
    }
  }, [open, lead.owner_id]);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("status", "active")
      .order("full_name");

    if (!error && data) {
      setUsers(data);
    }
  }

  async function handleReassign() {
    if (selectedUserId === lead.owner_id) {
      toast.info("No changes made");
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      await reassignLead.mutateAsync({
        id: lead.id,
        newOwnerId: selectedUserId,
      });
      toast.success("Lead reassigned successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to reassign lead");
    } finally {
      setIsLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
          <DialogDescription>
            Transfer ownership of this lead to another team member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Owner</Label>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(lead.owner?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {lead.owner?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lead.owner?.email}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New Owner</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.full_name || user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={isLoading}>
            {isLoading ? "Reassigning..." : "Reassign Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
