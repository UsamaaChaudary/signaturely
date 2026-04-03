"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Doc {
  _id: string;
  originalName: string;
  filePath?: string;
  fileSize: number;
  pageCount: number;
  isTemplate: boolean;
  createdAt: string;
}

interface Props {
  selectedId?: string | null;
  onSelect: (doc: Doc) => void;
  onUpload?: (doc: Doc) => void;
}

export default function DocumentPicker({ selectedId, onSelect, onUpload }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getDocuments().then((d: Doc[]) => { setDocs(d); setLoading(false); });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      setDocs((prev) => [doc, ...prev]);
      onSelect(doc);
      onUpload?.(doc);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading documents...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Select an existing document or upload a new PDF</p>
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No documents yet. Upload a PDF to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {docs.map((doc) => (
            <button
              key={doc._id}
              onClick={() => onSelect(doc)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedId === doc._id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
              }`}
            >
              <FileText className={`h-8 w-8 mb-2 ${selectedId === doc._id ? "text-indigo-500" : "text-gray-400"}`} />
              <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
              <p className="text-xs text-gray-400 mt-1">{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</p>
              {doc.isTemplate && (
                <span className="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                  Template
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
