import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Image,
  File,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Document } from "@/types/documents";
import { formatFileSize } from "@/types/documents";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDownload: (filePath: string, fileName: string) => void;
  onDelete: (documentId: string, filePath: string) => void;
  onPreview: (filePath: string) => void;
}

export function DocumentList({
  documents,
  loading,
  onDownload,
  onDelete,
  onPreview,
}: DocumentListProps) {
  const { user, isAdmin } = useAuth();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    document: Document | null;
  }>({ open: false, document: null });

  const getIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
    if (mimeType.startsWith("image/"))
      return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType === "application/pdf")
      return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const canDelete = (doc: Document) => {
    return isAdmin || doc.uploaded_by === user?.id;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6 text-muted-foreground" />}
        title="No documents"
        description="Upload documents to attach them to this record."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {getIcon(doc.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>
                      {doc.uploader?.full_name || doc.uploader?.email || "Unknown"}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {doc.mime_type?.startsWith("image/") ||
                  doc.mime_type === "application/pdf" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPreview(doc.file_path)}
                      title="Preview"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(doc.file_path, doc.name)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete(doc) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ open: true, document: doc })}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, document: open ? deleteDialog.document : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.document?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.document) {
                  onDelete(
                    deleteDialog.document.id,
                    deleteDialog.document.file_path
                  );
                }
                setDeleteDialog({ open: false, document: null });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
