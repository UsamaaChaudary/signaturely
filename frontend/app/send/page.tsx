"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import PageLayout from "@/components/PageLayout";
import DocumentPicker from "@/components/DocumentPicker";
import FieldPlacer, { Field, Signer, SIGNER_COLORS } from "@/components/FieldPlacer";
import ContactSearchInput from "@/components/ContactSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Send, Layers, Check } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Step = "document" | "fields" | "signers";

interface Doc { _id: string; originalName: string; filePath?: string; pageCount: number; }
interface Template { _id: string; name: string; documentId: { _id: string; filePath: string; originalName: string; pageCount: number }; fields: Field[]; signerCount: number; }

function SendPageInner() {
  useRequireAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const templateId  = searchParams.get("templateId");
  const documentId  = searchParams.get("documentId");
  const contactId   = searchParams.get("contactId");
  const contactIds  = searchParams.get("contactIds");
  const mode        = searchParams.get("mode");         // "template" | "edit"
  const saveAsTemplate = searchParams.get("saveAsTemplate") === "1";
  const templateNameParam = searchParams.get("templateName") || "";

  const [step,           setStep]           = useState<Step>("document");
  const [document,       setDocument]       = useState<Doc | null>(null);
  const [template,       setTemplate]       = useState<Template | null>(null);
  const [pdfPages,       setPdfPages]       = useState<HTMLCanvasElement[]>([]);
  const [loadingPdf,     setLoadingPdf]     = useState(false);
  const [fields,         setFields]         = useState<Field[]>([]);
  const [signers,        setSigners]        = useState<Signer[]>([{ id: "1", name: "", email: "", contactId: null }]);
  const [selectedTool,   setSelectedTool]   = useState<string | null>(null);
  const [selectedSigner, setSelectedSigner] = useState("1");
  const [title,          setTitle]          = useState("");
  const [message,        setMessage]        = useState("");
  const [sending,        setSending]        = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [tmplName,       setTmplName]       = useState(templateNameParam);

  // Determine if we're in template-save mode
  const isTemplateMode = saveAsTemplate || mode === "template";

  // Render PDF from a document
  const renderPdf = useCallback(async (doc: Doc) => {
    setLoadingPdf(true);
    try {
      if (!doc.filePath) { toast.error("PDF render failed"); return; }
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const url = doc.filePath; // Cloudinary HTTPS URL stored in DB
      const pdf = await pdfjsLib.getDocument(url).promise;
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page     = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas   = window.document.createElement("canvas");
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        canvases.push(canvas);
      }
      setPdfPages(canvases);
    } catch { toast.error("PDF render failed"); } finally { setLoadingPdf(false); }
  }, []);

  // On mount: resolve templateId / documentId / contactId from URL
  useEffect(() => {
    if (templateId) {
      api.getTemplate(templateId).then((t: Template) => {
        setTemplate(t);
        const doc = { _id: t.documentId._id, originalName: t.documentId.originalName, filePath: t.documentId.filePath, pageCount: t.documentId.pageCount };
        setDocument(doc);
        // Pre-load template fields (use signerSlot as signerId)
        const preFields: Field[] = t.fields.map((f: Field & { signerSlot?: string }) => ({
          ...f,
          id:       Math.random().toString(36).slice(2),
          signerId: f.signerSlot || f.signerId || "1",
        }));
        setFields(preFields);
        // Pre-build signer slots
        const slots: Signer[] = Array.from({ length: t.signerCount }, (_, i) => ({
          id: (i + 1).toString(), name: "", email: "", contactId: null,
        }));
        setSigners(slots);
        renderPdf(doc);
        setStep(mode === "edit" ? "fields" : "signers");
      }).catch(() => toast.error("Template not found"));
    } else if (documentId) {
      api.getDocument(documentId).then((d: Doc) => {
        setDocument(d);
        setTitle(d.originalName.replace(".pdf", ""));
        renderPdf(d);
        setStep("fields");
      }).catch(() => toast.error("Document not found"));
    }
  }, [templateId, documentId, renderPdf, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill contact(s)
  useEffect(() => {
    const ids = contactIds ? contactIds.split(",").filter(Boolean) : contactId ? [contactId] : [];
    if (!ids.length) return;
    Promise.all(ids.map((cid) => api.getContact(cid).then((d: { contact: { _id: string; name: string; email: string } }) => d.contact)))
      .then((contacts) => {
        setSigners(contacts.map((c, i) => ({ id: (i + 1).toString(), name: c.name, email: c.email, contactId: c._id })));
      })
      .catch(() => {});
  }, [contactId, contactIds]);

  const handleDocumentSelect = async (doc: Doc) => {
    setDocument(doc);
    setTitle(doc.originalName.replace(".pdf", ""));
    await renderPdf(doc);
    setStep("fields");
  };

  // Save as template flow
  const handleSaveTemplate = async () => {
    if (!document || !tmplName.trim()) { toast.error("Template name is required"); return; }
    setSavingTemplate(true);
    try {
      await api.createTemplate({
        documentId:  document._id,
        name:        tmplName.trim(),
        signerCount: signers.length,
        fields:      fields.map((f) => ({ signerSlot: f.signerId, type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, required: f.required })),
      });
      toast.success("Template saved", { description: tmplName });
      router.push("/templates");
    } catch (err: unknown) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : "Error" });
    } finally { setSavingTemplate(false); }
  };

  // Send for signature
  const handleSend = async () => {
    for (const s of signers) {
      if (!s.name || !s.email) { toast.error("Fill in all signer names and emails"); return; }
    }
    if (!title) { toast.error("Document title is required"); return; }
    if (!document) { toast.error("Select a document first"); return; }

    setSending(true);
    try {
      // Each signer gets their own request
      for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        const signerFields = fields.filter((f) => f.signerId === signer.id);
        await api.createRequest({
          documentId:   document._id,
          title,
          message,
          signers:      [{ name: signer.name, email: signer.email }],
          fields:       signerFields.map((f) => ({ signerId: "1", type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, required: f.required })),
          signerMapping: [{ tempId: "1", index: 0 }],
          contactIds:   [signer.contactId || null],
          templateId:   template?._id || null,
        });
      }
      toast.success(`${signers.length} request${signers.length > 1 ? "s" : ""} sent`);
      router.push("/");
    } catch (err: unknown) {
      toast.error("Send failed", { description: err instanceof Error ? err.message : "Error" });
    } finally { setSending(false); }
  };

  const steps: Step[]  = isTemplateMode ? ["document", "fields"] : ["document", "fields", "signers"];
  const stepLabels     = isTemplateMode
    ? ["Select Document", "Place Fields"]
    : ["Select Document", "Place Fields", "Signers & Send"];

  const currentIdx     = steps.indexOf(step);

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isTemplateMode ? (
              <><Layers className="h-5 w-5 inline mr-2 text-indigo-600" />Create Template</>
            ) : "Send Document for Signature"}
          </h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentIdx > i ? "bg-green-500 text-white" : step === s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {currentIdx > i ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={step === s ? "text-indigo-600 font-medium" : currentIdx > i ? "text-green-600" : "text-gray-400"}>
              {stepLabels[i]}
            </span>
            {i < steps.length - 1 && <span className="text-gray-300 mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Document */}
      {step === "document" && (
        <DocumentPicker selectedId={document?._id} onSelect={handleDocumentSelect} />
      )}

      {/* Step 2: Fields */}
      {step === "fields" && document && (
        <>
          {isTemplateMode && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
              <Layers className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-900">Template Mode</p>
                <p className="text-xs text-indigo-700 mt-0.5">Place fields, then save as a reusable template.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-48 text-sm"
                  placeholder="Template name *"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                />
              </div>
            </div>
          )}
          <FieldPlacer
            pdfPages={pdfPages}
            fields={fields}
            signers={signers}
            selectedTool={selectedTool}
            selectedSignerId={selectedSigner}
            loadingPdf={loadingPdf}
            onFieldsChange={setFields}
            onToolChange={setSelectedTool}
            onSignerChange={setSelectedSigner}
            onNext={isTemplateMode ? handleSaveTemplate : () => setStep("signers")}
            onBack={() => setStep("document")}
            nextLabel={isTemplateMode ? (savingTemplate ? "Saving..." : "Save Template") : "Next: Add Signers"}
          />
        </>
      )}

      {/* Step 3: Signers & Send */}
      {step === "signers" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="space-y-2">
            <Label>Document Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Consent Form" />
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

          {/* Signer assignment summary */}
          {fields.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              {signers.map((s, i) => {
                const count = fields.filter((f) => f.signerId === s.id).length;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SIGNER_COLORS[i] }} />
                    Signer {i + 1}: {count} field{count !== 1 ? "s" : ""}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Label className="mb-2 block">Signers</Label>
            <ContactSearchInput signers={signers} onChange={setSigners} allowManual />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("fields")}>
              Back to Fields
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending..." : (
                <><Send className="h-4 w-4 mr-2" />Send for Signature</>
              )}
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function SendPage() {
  return (
    <Suspense>
      <SendPageInner />
    </Suspense>
  );
}
