"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { FileText, Upload, Send, BookMarked, Trash2, Search, MoreVertical, Pencil, Check, X } from "lucide-react";

interface Doc {
  _id: string;
  originalName: string;
  filePath?: string;
  fileSize: number;
  pageCount: number;
  isTemplate: boolean;
  createdAt: string;
}

function ActionMenu({ onRename, onSend, onTemplate, onDelete }: {
  onRename: () => void;
  onSend: () => void;
  onTemplate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
          <button onClick={() => { setOpen(false); onRename(); }}
            className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
            <Pencil className="h-4 w-4 text-gray-400" /> Rename
          </button>
          <button onClick={() => { setOpen(false); onSend(); }}
            className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
            <Send className="h-4 w-4 text-indigo-500" /> Send for Signature
          </button>
          <button onClick={() => { setOpen(false); onTemplate(); }}
            className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-gray-700">
            <BookMarked className="h-4 w-4 text-purple-500" /> Save as Template
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-2.5 text-red-600">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  useRequireAuth();
  const router = useRouter();
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Template modal state
  const [templateDoc,      setTemplateDoc]      = useState<Doc | null>(null);
  const [templateName,     setTemplateName]     = useState("");
  const [savingTemplate,   setSavingTemplate]   = useState(false);

  // Preview modal state
  const [previewDoc,       setPreviewDoc]       = useState<Doc | null>(null);

  useEffect(() => {
    api.getDocuments()
      .then((d: Doc[]) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file"); return; }
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      setDocs((prev) => [doc, ...prev]);
      toast.success("Uploaded", { description: doc.originalName });
    } catch (err: unknown) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRename = (doc: Doc) => {
    setRenamingId(doc._id);
    setRenameValue(doc.originalName);
  };

  const commitRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    setRenameSaving(true);
    try {
      const updated = await api.renameDocument(id, renameValue.trim());
      setDocs((prev) => prev.map((d) => d._id === id ? { ...d, originalName: updated.originalName } : d));
      toast.success("Renamed");
    } catch { toast.error("Rename failed"); }
    finally { setRenameSaving(false); setRenamingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d._id !== id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleSaveTemplate = async () => {
    if (!templateDoc || !templateName.trim()) return;
    setSavingTemplate(true);
    router.push(`/send?documentId=${templateDoc._id}&saveAsTemplate=1&templateName=${encodeURIComponent(templateName)}`);
  };

  const filtered = docs.filter((d) =>
    d.originalName.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (bytes: number) =>
    bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Documents</h1>
          <div className="flex gap-3">
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
            <Button className="bg-[var(--primary)] hover:opacity-90" onClick={() => router.push("/send")}>
              <Send className="h-4 w-4 mr-2" /> Send Document
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
          <Input className="pl-9" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Documents Card */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>All Documents ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{search ? "No matching documents" : "No documents yet"}</p>
                {!search && (
                  <Button
                    className="mt-4 bg-[var(--primary)] hover:opacity-90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload your first PDF
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => renamingId !== doc._id && setPreviewDoc(doc)}
                  >
                    {/* Icon + name/meta */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {renamingId === doc._id ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <Input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(doc._id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              className="h-7 text-sm py-0"
                            />
                            <button
                              onClick={() => commitRename(doc._id)}
                              disabled={renameSaving}
                              className="cursor-pointer text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRenamingId(null)}
                              className="cursor-pointer text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                            onDoubleClick={() => startRename(doc)}
                            title="Double-click to rename"
                          >
                            {doc.originalName}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""} · {fmt(doc.fileSize || 0)} · {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Right side: badge + menu */}
                    <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {doc.isTemplate && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Template
                        </span>
                      )}
                      <ActionMenu
                        onRename={() => startRename(doc)}
                        onSend={() => router.push(`/send?documentId=${doc._id}`)}
                        onTemplate={() => { setTemplateDoc(doc); setTemplateName(doc.originalName.replace(".pdf", "")); }}
                        onDelete={() => handleDelete(doc._id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Document Preview modal */}
      {previewDoc && previewDoc.filePath && (
        <PdfPreviewModal
          fileName={previewDoc.originalName}
          filePath={previewDoc.filePath}
          pageCount={previewDoc.pageCount}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Save as Template modal */}
      {templateDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Save as Template</h2>
            <p className="text-sm text-gray-500 mb-4">
              You&apos;ll be taken to the field editor to place fields, then save as a reusable template.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template name</label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Consent Form" />
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setTemplateDoc(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={!templateName.trim() || savingTemplate}
                onClick={handleSaveTemplate}
              >
                Continue to Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
