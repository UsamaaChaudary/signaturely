"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PdfPreviewModal, { PreviewField } from "@/components/PdfPreviewModal";
import { FileText, Send, Trash2, Plus, FileStack, Edit2 } from "lucide-react";

interface Template {
  _id: string;
  name: string;
  description: string;
  signerCount: number;
  usageCount: number;
  fields: PreviewField[];
  documentId?: { _id: string; originalName: string; pageCount: number; filePath?: string };
  createdAt: string;
}

export default function TemplatesPage() {
  useRequireAuth();
  const router = useRouter();
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [previewTmpl,  setPreviewTmpl]  = useState<Template | null>(null);

  useEffect(() => {
    api.getTemplates()
      .then((t: Template[]) => { setTemplates(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this template?")) return;
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast.success("Template archived");
    } catch { toast.error("Failed to archive"); }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Templates</h1>
          <Button className="bg-[var(--primary)] hover:opacity-90 w-full sm:w-auto text-sm py-1.5" onClick={() => router.push("/documents")}>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create Template</span>
          </Button>
        </div>

        {/* Templates Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Saved Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileStack className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--muted)" }} />
                <p style={{ color: "var(--muted-foreground)" }}>No templates yet</p>
                <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                  Go to Documents, click ••• on any PDF and choose "Save as Template"
                </p>
                <Button className="mt-4 bg-[var(--primary)] hover:opacity-90" onClick={() => router.push("/documents")}>
                  Go to Documents
                </Button>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {templates.map((t) => (
                  <div
                    key={t._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setPreviewTmpl(t)}
                  >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t.documentId?.originalName && (
                            <span className="truncate block sm:inline">{t.documentId.originalName} · </span>
                          )}
                          {t.fields.length} field{t.fields.length !== 1 ? "s" : ""} · {t.signerCount} signer{t.signerCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Right: stats + actions */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto sm:ml-0">
                      <div className="text-right hidden md:block">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{t.usageCount}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">times used</div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="bg-[var(--primary)] hover:opacity-90 text-xs py-1 h-7 sm:h-8"
                          onClick={() => router.push(`/send?templateId=${t._id}`)}
                        >
                          <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> <span className="hidden sm:inline">Send</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => router.push(`/send?templateId=${t._id}&mode=edit`)}
                          title="Edit fields"
                        >
                          <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t._id)}
                          title="Archive"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      {/* Template document preview */}
      {previewTmpl && previewTmpl.documentId?.filePath && (
        <PdfPreviewModal
          fileName={previewTmpl.name}
          filePath={previewTmpl.documentId.filePath}
          pageCount={previewTmpl.documentId.pageCount}
          editHref={`/send?templateId=${previewTmpl._id}&mode=edit`}
          previewFields={previewTmpl.fields}
          onClose={() => setPreviewTmpl(null)}
        />
      )}
    </div>
  );
}
