"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Send, Trash2, Plus, FileStack, Edit2 } from "lucide-react";

interface Template {
  _id: string;
  name: string;
  description: string;
  signerCount: number;
  usageCount: number;
  fields: unknown[];
  documentId?: { originalName: string; pageCount: number };
  createdAt: string;
}

export default function TemplatesPage() {
  useRequireAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);

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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push("/documents")}>
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>

        {/* Templates Card */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileStack className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No templates yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Go to Documents, click ••• on any PDF and choose &quot;Save as Template&quot;
                </p>
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push("/documents")}>
                  Go to Documents
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {t.documentId?.originalName && (
                            <span className="truncate">{t.documentId.originalName} · </span>
                          )}
                          {t.fields.length} field{t.fields.length !== 1 ? "s" : ""} · {t.signerCount} signer{t.signerCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Right: stats + actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden md:block">
                        <div className="text-sm font-medium text-gray-900">{t.usageCount}</div>
                        <div className="text-xs text-gray-400">times used</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => router.push(`/send?templateId=${t._id}`)}
                        >
                          <Send className="h-4 w-4 mr-1.5" /> Send
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/send?templateId=${t._id}&mode=edit`)}
                          title="Edit fields"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t._id)}
                          title="Archive"
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
