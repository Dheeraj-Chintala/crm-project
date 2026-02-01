import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NoteFormData } from "@/types/notes";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NoteFormData) => Promise<void>;
  defaultLinkType?: "lead" | "contact" | "deal";
  defaultLinkId?: string;
}

export function AddNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultLinkType,
  defaultLinkId,
}: AddNoteDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        content: content.trim(),
        lead_id: defaultLinkType === "lead" ? defaultLinkId : undefined,
        contact_id: defaultLinkType === "contact" ? defaultLinkId : undefined,
        deal_id: defaultLinkType === "deal" ? defaultLinkId : undefined,
      });

      setContent("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Note Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Notes are immutable and cannot be edited or deleted for audit purposes.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !content.trim()}>
              {loading ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
