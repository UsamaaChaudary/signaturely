"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { FileText, Upload, CloudUpload } from "lucide-react";
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
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getDocuments().then((d: Doc[]) => { setDocs(d); setLoading(false); });
  }, []);

  const handleFile = async (file: File) => {
    if (!file || !file.name.endsWith(".pdf")) return;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading documents...</div>;

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />

      {docs.length === 0 ? (
        /* ── Empty state: prominent upload zone ── */
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer flex flex-col items-center justify-center gap-5 py-20 px-8 rounded-2xl border-2 border-dashed transition-all ${
            dragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
              : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
          }`}
        >
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-md transition-all ${dragging ? "bg-indigo-600" : "bg-indigo-600"}`}>
            <CloudUpload className="h-10 w-10 text-white" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-gray-900">
              {uploading ? "Uploading…" : "Upload your PDF"}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop a file here, or click to browse
            </p>
            <p className="text-xs text-gray-400">PDF files only · Max 20 MB</p>
          </div>
          <Button
            className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-sm font-medium"
            disabled={uploading}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading…" : "Choose PDF"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Select an existing document or upload a new PDF</p>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload PDF"}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {docs.map((doc) => (
              <button
                key={doc._id}
                onClick={() => onSelect(doc)}
                className={`cursor-pointer text-left p-4 rounded-xl border-2 transition-all ${
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
        </>
      )}
    </div>
  );
}
