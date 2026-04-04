"use client";
import { use, useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  AlertCircle,
  PenTool,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SIGNATURE_FONTS = [
  {
    name: "Dancing Script",
    family: "'Dancing Script', cursive",
    url: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap",
  },
  {
    name: "Great Vibes",
    family: "'Great Vibes', cursive",
    url: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
  },
  {
    name: "Pacifico",
    family: "'Pacifico', cursive",
    url: "https://fonts.googleapis.com/css2?family=Pacifico&display=swap",
  },
];

interface SigningField {
  _id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface SigningSession {
  title: string;
  message?: string;
  signer: { name: string; email: string };
  document: { fileUrl: string };
  fields: SigningField[];
}

// ---- Signature canvas component ----
interface CanvasHandle {
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
  clear: () => void;
}

function SignatureCanvas({
  canvasRef,
}: {
  canvasRef: React.MutableRefObject<CanvasHandle | null>;
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const isEmpty = () => {
    const canvas = canvasElRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((v) => v !== 0);
  };

  const toDataURL = (type = "image/png") =>
    canvasElRef.current?.toDataURL(type) || "";

  const clear = () => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    canvasRef.current = { isEmpty, toDataURL, clear };
  });

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasElRef.current!;
    const pos = getPos(e, canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasElRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  return (
    <div>
      <canvas
        ref={canvasElRef}
        width={500}
        height={200}
        className="w-full h-40 touch-none"
        style={{ cursor: "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex justify-end p-2 border-t border-gray-100">
        <button
          onClick={clear}
          className="cursor-pointer text-xs text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ---- Main signing page ----
export default function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [session, setSession] = useState<SigningSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const canvasRef = useRef<CanvasHandle | null>(null);
  const [selectedFont, setSelectedFont] = useState(0);
  const [typedSig, setTypedSig] = useState("");
  const [sigTab, setSigTab] = useState("draw");
  const [textInputOpen, setTextInputOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    try {
      const data = await api.getSigningSession(token);
      setSession(data);
      await renderPdf(data.document.fileUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid link";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderPdf = async (fileUrl: string) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const url = fileUrl.startsWith("http")
        ? fileUrl
        : `${API_URL}${fileUrl}`;
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
    } catch (err) {
      console.error("PDF render error:", err);
    }
  };

  const openSignatureModal = (fieldId: string) => {
    setActiveFieldId(fieldId);
    setSigModalOpen(true);
    setTypedSig(session?.signer?.name || "");
  };

  const captureSignature = () => {
    if (sigTab === "draw") {
      if (!canvasRef.current || canvasRef.current.isEmpty()) {
        toast.error("Please draw your signature");
        return;
      }
      const dataUrl = canvasRef.current.toDataURL("image/png");
      if (activeFieldId) {
        setFieldValues((prev) => ({ ...prev, [activeFieldId]: dataUrl }));
      }
    } else {
      // Type tab - render typed text to canvas
      const canvas = window.document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 80);
      ctx.fillStyle = "#1a1a2e";
      ctx.font = `48px ${SIGNATURE_FONTS[selectedFont].family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedSig || session?.signer?.name || "", 200, 40);
      const dataUrl = canvas.toDataURL("image/png");
      if (activeFieldId) {
        setFieldValues((prev) => ({ ...prev, [activeFieldId]: dataUrl }));
      }
    }
    setSigModalOpen(false);
  };

  const handleFieldClick = (field: SigningField) => {
    if (field.type === "signature" || field.type === "initials") {
      openSignatureModal(field._id);
    } else if (field.type === "date") {
      const today = new Date().toLocaleDateString();
      setFieldValues((prev) => ({ ...prev, [field._id]: today }));
    } else if (field.type === "checkbox") {
      setFieldValues((prev) => ({
        ...prev,
        [field._id]: prev[field._id] === "true" ? "false" : "true",
      }));
    } else if (field.type === "text") {
      setActiveFieldId(field._id);
      setTextInputValue(fieldValues[field._id] || "");
      setTextInputOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    const required = session.fields.filter((f) => f.required);
    const missing = required.filter((f) => !fieldValues[f._id]);
    if (missing.length > 0) {
      toast.error("Please fill all required fields", {
        description: `${missing.length} field(s) remaining`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const fields = session.fields.map((f) => ({
        fieldId: f._id,
        value: fieldValues[f._id] || "",
      }));
      await api.submitSigning(token, fields);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed";
      toast.error("Error", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (
      !confirm(
        "Are you sure you want to decline to sign this document?"
      )
    )
      return;
    try {
      await api.declineSigning(token);
      setDeclined(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to decline";
      toast.error("Error", { description: message });
    }
  };

  // ---- Render states ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-gray-400 text-sm sm:text-base">Loading document...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="text-center p-6 sm:p-8 max-w-md">
          <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Document Signed!
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            You have successfully signed the document. You&apos;ll receive a
            copy by email once all parties have signed.
          </p>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-6 sm:p-8 max-w-md">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Signing Declined
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            You have declined to sign this document.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-6 sm:p-8 max-w-md">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {error === "already_signed"
              ? "Already Signed"
              : error === "already_declined"
              ? "Already Declined"
              : "Invalid Link"}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {error === "already_signed"
              ? "You have already signed this document."
              : error === "already_declined"
              ? "You have already declined this document."
              : error}
          </p>
        </div>
      </div>
    );
  }

  const completedCount = Object.keys(fieldValues).length;
  const totalCount = session?.fields?.length || 0;
  const allFilled =
    totalCount > 0 &&
    session!.fields.filter((f) => f.required).every((f) => fieldValues[f._id]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileSignature className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <span className="font-semibold text-gray-900 truncate">{session?.title}</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-sm text-gray-500">
            <span className="font-medium text-indigo-600">{completedCount}</span>
            <span className="hidden sm:inline">/{totalCount} fields</span>
            <span className="sm:hidden">/{totalCount}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600"
            onClick={handleDecline}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={submitting || !allFilled}
          >
            {submitting ? "Submitting..." : (
              <>
                <span className="hidden sm:inline">Submit Signature</span>
                <span className="sm:hidden">Sign</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200">
        <div
          className="h-1 bg-indigo-600 transition-all duration-300"
          style={{
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Message banner */}
      {session?.message && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-3 sm:px-6 py-2 sm:py-3 text-sm text-indigo-700">
          <strong className="hidden sm:inline">Message:</strong>
          <span className="sm:hidden font-medium">Msg:</span> {session.message}
        </div>
      )}

      {/* Signer info */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-2 text-xs sm:text-sm text-gray-500">
        Signing as{" "}
        <span className="font-medium text-gray-700">
          {session?.signer?.name}
        </span>{" "}
        &lt;{session?.signer?.email}&gt;
      </div>

      {/* PDF with fields */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
        <div className="space-y-4">
          {pdfPages.map((canvas, pageIndex) => (
            <div
              key={pageIndex}
              className="relative bg-white shadow-md inline-block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={canvas.toDataURL()}
                alt={`Page ${pageIndex + 1}`}
                className="block w-full"
                draggable={false}
              />

              {session?.fields
                ?.filter((f) => f.page === pageIndex)
                .map((field) => {
                  const value = fieldValues[field._id];
                  const isEmpty = !value || value === "false";

                  return (
                    <div
                      key={field._id}
                      className={`absolute border-2 flex items-center justify-center cursor-pointer transition-all ${
                        isEmpty
                          ? "border-indigo-400 bg-indigo-50 hover:bg-indigo-100 animate-pulse"
                          : "border-green-400 bg-green-50"
                      }`}
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                      }}
                      onClick={() => handleFieldClick(field)}
                    >
                      {field.type === "signature" ||
                      field.type === "initials" ? (
                        value ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={value}
                            alt="signature"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="flex items-center gap-1 text-indigo-500 text-xs">
                            <PenTool className="h-3 w-3" />
                            {field.type}
                          </div>
                        )
                      ) : field.type === "checkbox" ? (
                        <div
                          className={`text-lg ${
                            value === "true"
                              ? "text-green-600"
                              : "text-gray-300"
                          }`}
                        >
                          {value === "true" ? "☑" : "☐"}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-700 px-1 text-center truncate w-full">
                          {value || (
                            <span className="text-indigo-400">
                              {field.type}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

        {pdfPages.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            Loading PDF pages...
          </div>
        )}
      </div>

      {/* Text Field Input Dialog */}
      <Dialog open={textInputOpen} onOpenChange={setTextInputOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Text</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type here..."
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (activeFieldId) setFieldValues((prev) => ({ ...prev, [activeFieldId]: textInputValue }));
                setTextInputOpen(false);
              }
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setTextInputOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                if (activeFieldId) setFieldValues((prev) => ({ ...prev, [activeFieldId]: textInputValue }));
                setTextInputOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Modal */}
      <Dialog open={sigModalOpen} onOpenChange={setSigModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Your Signature</DialogTitle>
          </DialogHeader>

          <Tabs value={sigTab} onValueChange={setSigTab}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
            </TabsList>

            <TabsContent value="draw">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mt-2">
                <SignatureCanvas canvasRef={canvasRef} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Draw your signature above using your mouse or finger
              </p>
            </TabsContent>

            <TabsContent value="type">
              <div className="mt-2">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your full name"
                  value={typedSig}
                  onChange={(e) => setTypedSig(e.target.value)}
                />
                <div className="space-y-2">
                  {SIGNATURE_FONTS.map((font, i) => (
                    <div
                      key={font.name}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedFont === i
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedFont(i)}
                    >
                      {/* Load font via style tag */}
                      <style>{`@import url('${font.url}')`}</style>
                      <span
                        style={{
                          fontFamily: font.family,
                          fontSize: "28px",
                          lineHeight: 1.2,
                        }}
                      >
                        {typedSig || session?.signer?.name || "Your Name"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={captureSignature}
            >
              Apply Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
