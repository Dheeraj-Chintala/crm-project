import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Document, DocumentLinkType } from "@/types/documents";

interface UseDocumentsParams {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}

export function useDocuments(params: UseDocumentsParams = {}) {
  const { leadId, contactId, dealId } = params;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, [leadId, contactId, dealId]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      let query = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadId) {
        query = query.eq("lead_id", leadId);
      } else if (contactId) {
        query = query.eq("contact_id", contactId);
      } else if (dealId) {
        query = query.eq("deal_id", dealId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch uploader profiles separately
      const uploaderIds = [...new Set(data?.map((d) => d.uploaded_by) || [])];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};

      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", uploaderIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string }>);
        }
      }

      const documentsWithUploaders: Document[] = (data || []).map((doc) => ({
        ...doc,
        uploader: profilesMap[doc.uploaded_by],
      }));

      setDocuments(documentsWithUploaders);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocument(
    file: File,
    linkType: DocumentLinkType,
    linkId: string
  ) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload documents",
        variant: "destructive",
      });
      return null;
    }

    try {
      setUploading(true);

      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${linkType}/${linkId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const documentData = {
        name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        ...(linkType === "lead" ? { lead_id: linkId } : {}),
        ...(linkType === "contact" ? { contact_id: linkId } : {}),
        ...(linkType === "deal" ? { deal_id: linkId } : {}),
      };

      const { data, error } = await supabase
        .from("documents")
        .insert([documentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully`,
      });

      fetchDocuments();
      return data;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId: string, filePath: string) {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage deletion failed:", storageError);
      }

      // Delete record
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "Document has been removed successfully",
      });

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  }

  async function downloadDocument(filePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  }

  async function getDocumentUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting document URL:", error);
      return null;
    }
  }

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentUrl,
    refetch: fetchDocuments,
  };
}
