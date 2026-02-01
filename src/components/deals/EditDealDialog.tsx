import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Deal, DEAL_STAGES } from "@/types/deals";
import { useDeals } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";

interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

interface Lead {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
}

export function EditDealDialog({
  open,
  onOpenChange,
  deal,
}: EditDealDialogProps) {
  const { updateDeal } = useDeals();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [formData, setFormData] = useState({
    name: deal.name,
    lead_id: deal.lead_id || "",
    contact_id: deal.contact_id || "",
    stage: deal.stage,
    estimated_value: deal.estimated_value?.toString() || "",
    confirmed_value: deal.confirmed_value?.toString() || "",
    expected_close_date: deal.expected_close_date || "",
    notes: deal.notes || "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [leadsRes, contactsRes] = await Promise.all([
        supabase.from("leads").select("id, name").order("name"),
        supabase
          .from("contacts")
          .select("id, first_name, last_name, company")
          .order("first_name"),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    setFormData({
      name: deal.name,
      lead_id: deal.lead_id || "",
      contact_id: deal.contact_id || "",
      stage: deal.stage,
      estimated_value: deal.estimated_value?.toString() || "",
      confirmed_value: deal.confirmed_value?.toString() || "",
      expected_close_date: deal.expected_close_date || "",
      notes: deal.notes || "",
    });
  }, [deal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateDeal(deal.id, {
      name: formData.name,
      lead_id: formData.lead_id || null,
      contact_id: formData.contact_id || null,
      stage: formData.stage,
      estimated_value: formData.estimated_value
        ? parseFloat(formData.estimated_value)
        : null,
      confirmed_value: formData.confirmed_value
        ? parseFloat(formData.confirmed_value)
        : null,
      expected_close_date: formData.expected_close_date || null,
      notes: formData.notes || null,
    });

    setLoading(false);
    if (result) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>
            Update the deal details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Deal Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={formData.stage}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, stage: value }))
              }
            >
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead">Linked Lead</Label>
              <Select
                value={formData.lead_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, lead_id: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Linked Contact</Label>
              <Select
                value={formData.contact_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, contact_id: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.company && ` (${contact.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                type="number"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimated_value: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmed_value">Confirmed Value</Label>
              <Input
                id="confirmed_value"
                type="number"
                step="0.01"
                value={formData.confirmed_value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmed_value: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input
              id="expected_close_date"
              type="date"
              value={formData.expected_close_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expected_close_date: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
