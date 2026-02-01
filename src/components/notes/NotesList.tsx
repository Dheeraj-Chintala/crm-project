import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Note } from "@/types/notes";
import { format } from "date-fns";
import { StickyNote } from "lucide-react";

interface NotesListProps {
  notes: Note[];
  loading?: boolean;
}

export function NotesList({ notes, loading }: NotesListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 p-3 border rounded-lg">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No notes yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-3 border rounded-lg bg-muted/30 space-y-2"
          >
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
