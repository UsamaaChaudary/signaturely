"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  Trash2,
  Plus,
  Send,
  ArrowLeft,
  MousePointer,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const FIELD_TYPES = [
  {
    type: "signature",
    label: "Signature",
    icon: PenTool,
    color: "border-blue-500 bg-blue-50",
  },
  {
    type: "initials",
    label: "Initials",
    icon: PenTool,
    color: "border-purple-500 bg-purple-50",
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    color: "border-green-500 bg-green-50",
  },
  {
    type: "text",
    label: "Text",
    icon: Type,
    color: "border-yellow-500 bg-yellow-50",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    color: "border-red-500 bg-red-50",
  },
];

const SIGNER_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

interface Field {
  id: string;
  signerId: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface Signer {
  id: string;
  name: string;
  email: string;
}

interface UploadedDocument {
  _id: string;
  filePath: string;
  originalName: string;
}

type Step = "upload" | "place" | "signers";

export default function NewDocumentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [signers, setSigners] = useState<Signer[]>([
    { id: "1", name: "", email: "" },
  ]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedSignerId, setSelectedSignerId] = useState<string>("1");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) router.push("/login");
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      setDocument(doc);
      setTitle(file.name.replace(".pdf", ""));
      await renderPdf(doc);
      setStep("place");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error("Upload failed", { description: message });
    } finally {
      setUploading(false);
    }
  };

  const renderPdf = async (doc: UploadedDocument) => {
    setLoadingPdf(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      // PDF.js 5.x worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const url = doc.filePath; // Cloudinary HTTPS URL stored in DB
      const pdf = await pdfjsLib.getDocument(url).promise;

      const canvases: HTMLCanvasElement[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = window.document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        canvases.push(canvas);
      }
      setPdfPages(canvases);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Render error";
      toast.error("PDF render error", { description: message });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePdfClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (!selectedTool) return;

      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const defaultSizes: Record<string, { w: number; h: number }> = {
        signature: { w: 0.25, h: 0.07 },
        initials: { w: 0.12, h: 0.06 },
        date: { w: 0.18, h: 0.05 },
        text: { w: 0.2, h: 0.05 },
        checkbox: { w: 0.04, h: 0.04 },
      };

      const size = defaultSizes[selectedTool] || { w: 0.2, h: 0.06 };

      const newField: Field = {
        id: Date.now().toString(),
        signerId: selectedSignerId,
        type: selectedTool,
        page: pageIndex,
        x: Math.max(0, Math.min(x - size.w / 2, 1 - size.w)),
        y: Math.max(0, Math.min(y - size.h / 2, 1 - size.h)),
        width: size.w,
        height: size.h,
        required: true,
      };

      setFields((prev) => [...prev, newField]);
    },
    [selectedTool, selectedSignerId]
  );

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addSigner = () => {
    const newId = (signers.length + 1).toString();
    setSigners((prev) => [...prev, { id: newId, name: "", email: "" }]);
  };

  const updateSigner = (id: string, field: "name" | "email", value: string) => {
    setSigners((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSigner = (id: string) => {
    if (signers.length === 1) return;
    setSigners((prev) => prev.filter((s) => s.id !== id));
    setFields((prev) => prev.filter((f) => f.signerId !== id));
  };

  const handleSend = async () => {
    for (const signer of signers) {
      if (!signer.name || !signer.email) {
        toast.error("Missing info", {
          description: "Fill in all signer names and emails",
        });
        return;
      }
    }
    if (!title) {
      toast.error("Missing title", {
        description: "Enter a document title",
      });
      return;
    }

    setSending(true);
    try {
      const requestData = {
        documentId: document!._id,
        title,
        message,
        signers: signers.map((s) => ({ name: s.name, email: s.email })),
        fields: fields.map((f) => ({
          signerId: f.signerId,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required,
        })),
        // Index-based mapping: tempId is 1-indexed string, index is 0-indexed
        signerMapping: signers.map((s, i) => ({ tempId: s.id, index: i })),
      };

      await api.createRequest(requestData);
      toast.success("Sent!", {
        description: "Signing request sent successfully",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send failed";
      toast.error("Error", { description: message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold text-gray-900">
            New Signing Request
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          {(["upload", "place", "signers"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-indigo-600 text-white"
                    : ["upload", "place", "signers"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={
                  step === s ? "text-indigo-600 font-medium" : "text-gray-400"
                }
              >
                {s === "upload"
                  ? "Upload PDF"
                  : s === "place"
                  ? "Place Fields"
                  : "Signers & Send"}
              </span>
              {i < 2 && <span className="text-gray-300 mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="max-w-lg mx-auto">
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="text-gray-500">Uploading PDF...</div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700">
                    Drop your PDF here
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Max 20MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Step: Place Fields */}
        {step === "place" && (
          <div className="flex gap-4">
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 space-y-4">
              {/* Signer selector */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Assign To
                </p>
                {signers.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSignerId(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-medium border-2 transition-all ${
                      selectedSignerId === s.id
                        ? "border-opacity-100"
                        : "border-transparent bg-gray-100"
                    }`}
                    style={
                      selectedSignerId === s.id
                        ? {
                            borderColor: SIGNER_COLORS[i],
                            backgroundColor: SIGNER_COLORS[i] + "20",
                          }
                        : {}
                    }
                  >
                    <span style={{ color: SIGNER_COLORS[i] }}>&#9679;</span>{" "}
                    Signer {i + 1}
                    {s.name && (
                      <span className="text-gray-500 font-normal">
                        {" "}
                        ({s.name})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Field tools */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Field Type
                </p>
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <button
                      key={ft.type}
                      onClick={() =>
                        setSelectedTool(
                          selectedTool === ft.type ? null : ft.type
                        )
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-all border ${
                        selectedTool === ft.type
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {ft.label}
                    </button>
                  );
                })}
              </div>

              {selectedTool && (
                <div className="text-xs text-indigo-600 bg-indigo-50 rounded-lg p-3">
                  <MousePointer className="h-3 w-3 inline mr-1" />
                  Click on the PDF to place a {selectedTool} field
                </div>
              )}

              <div className="pt-2 space-y-2">
                <p className="text-xs text-gray-500">
                  {fields.length} field(s) placed
                </p>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setStep("signers")}
                >
                  Next: Add Signers
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("upload")}
                >
                  Change PDF
                </Button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto">
              {loadingPdf ? (
                <div className="text-center py-16 text-gray-400">
                  Rendering PDF...
                </div>
              ) : (
                <div ref={pdfContainerRef} className="space-y-4">
                  {pdfPages.map((canvas, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="relative bg-white shadow-sm inline-block w-full"
                      style={{
                        cursor: selectedTool ? "crosshair" : "default",
                      }}
                      onClick={(e) => handlePdfClick(e, pageIndex)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={canvas.toDataURL()}
                        alt={`Page ${pageIndex + 1}`}
                        className="block w-full"
                        draggable={false}
                      />
                      {/* Render fields for this page */}
                      {fields
                        .filter((f) => f.page === pageIndex)
                        .map((field) => {
                          const signerIndex = signers.findIndex(
                            (s) => s.id === field.signerId
                          );
                          const color =
                            SIGNER_COLORS[signerIndex] || "#3B82F6";
                          const ft = FIELD_TYPES.find(
                            (t) => t.type === field.type
                          );
                          const Icon = ft?.icon || PenTool;

                          return (
                            <div
                              key={field.id}
                              className="absolute border-2 flex items-center justify-center text-xs font-medium select-none"
                              style={{
                                left: `${field.x * 100}%`,
                                top: `${field.y * 100}%`,
                                width: `${field.width * 100}%`,
                                height: `${field.height * 100}%`,
                                borderColor: color,
                                backgroundColor: color + "20",
                                color: color,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{field.type}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                                className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs leading-none"
                                style={{ backgroundColor: color }}
                                aria-label="Remove field"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Signers & Send */}
        {step === "signers" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. NDA Agreement"
              />
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please review and sign this document..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Signers</Label>
                <Button variant="outline" size="sm" onClick={addSigner}>
                  <Plus className="h-4 w-4 mr-1" /> Add Signer
                </Button>
              </div>
              <div className="space-y-3">
                {signers.map((signer, i) => (
                  <div
                    key={signer.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: SIGNER_COLORS[i] }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Full name"
                        value={signer.name}
                        onChange={(e) =>
                          updateSigner(signer.id, "name", e.target.value)
                        }
                      />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={signer.email}
                        onChange={(e) =>
                          updateSigner(signer.id, "email", e.target.value)
                        }
                      />
                    </div>
                    {signers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSigner(signer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("place")}
              >
                Back to Editor
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send for Signature
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
