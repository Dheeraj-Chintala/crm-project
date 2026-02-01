export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: {
    full_name: string | null;
    email: string;
  };
}

export type DocumentLinkType = "lead" | "contact" | "deal";

export const DOCUMENT_CATEGORIES = [
  { value: "proposal", label: "Proposal" },
  { value: "quotation", label: "Quotation" },
  { value: "invoice", label: "Invoice" },
  { value: "contract", label: "Contract" },
  { value: "other", label: "Other" },
] as const;

export const getMimeTypeIcon = (mimeType: string | null): string => {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "file-text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "file-spreadsheet";
  if (mimeType.includes("word") || mimeType.includes("document")) return "file-text";
  return "file";
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
