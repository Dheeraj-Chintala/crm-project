import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentList } from "./DocumentList";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import type { DocumentLinkType } from "@/types/documents";

interface DocumentsTabProps {
  linkType: DocumentLinkType;
  linkId: string;
}

export function DocumentsTab({ linkType, linkId }: DocumentsTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const params =
    linkType === "lead"
      ? { leadId: linkId }
      : linkType === "contact"
      ? { contactId: linkId }
      : { dealId: linkId };

  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentUrl,
  } = useDocuments(params);

  const handleUpload = async (file: File) => {
    await uploadDocument(file, linkType, linkId);
  };

  const handlePreview = async (filePath: string) => {
    const url = await getDocumentUrl(filePath);
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <DocumentList
        documents={documents}
        loading={loading}
        onDownload={downloadDocument}
        onDelete={deleteDocument}
        onPreview={handlePreview}
      />

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </div>
  );
}
