import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { COMMUNICATION_TYPES, COMMUNICATION_DIRECTIONS, CommunicationFormData, CommunicationType, CommunicationDirection } from "@/types/communications";

interface AddCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CommunicationFormData) => Promise<void>;
  defaultLinkType?: "lead" | "contact" | "deal";
  defaultLinkId?: string;
}

export function AddCommunicationDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultLinkType,
  defaultLinkId,
}: AddCommunicationDialogProps) {
  const [type, setType] = useState<CommunicationType>("call");
  const [direction, setDirection] = useState<CommunicationDirection>("outbound");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        type,
        direction,
        subject: subject || undefined,
        content: content || undefined,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        scheduled_at: scheduledAt || undefined,
        lead_id: defaultLinkType === "lead" ? defaultLinkId : undefined,
        contact_id: defaultLinkType === "contact" ? defaultLinkId : undefined,
        deal_id: defaultLinkType === "deal" ? defaultLinkId : undefined,
      });

      // Reset form
      setType("call");
      setDirection("outbound");
      setSubject("");
      setContent("");
      setDurationMinutes("");
      setScheduledAt("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CommunicationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as CommunicationDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject line"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes / Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Communication details, notes, or transcript"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(type === "call" || type === "meeting") && (
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Duration in minutes"
                />
              </div>
            )}

            {type === "meeting" && (
              <div className="space-y-2">
                <Label>Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Communication"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
