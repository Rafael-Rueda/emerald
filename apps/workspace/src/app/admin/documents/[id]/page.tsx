import { DocumentEditor } from "../../../../modules/documents/presentation/document-editor";

interface AdminEditDocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEditDocumentPage({
  params,
}: AdminEditDocumentPageProps) {
  const { id } = await params;

  return <DocumentEditor mode="edit" documentId={id} />;
}
