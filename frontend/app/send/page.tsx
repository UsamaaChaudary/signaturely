"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import PageLayout from "@/components/PageLayout";
import NavBar from "@/components/NavBar";
import DocumentPicker from "@/components/DocumentPicker";
import FieldPlacer, { Field, Signer, Annotation, SIGNER_COLORS } from "@/components/FieldPlacer";
import ContactSearchInput from "@/components/ContactSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Send, Layers, Check, FileText, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Step = "document" | "fields" | "signers";

interface Doc { _id: string; originalName: string; filePath?: string; pageCount: number; }
interface Template { _id: string; name: string; documentId: { _id: string; filePath: string; originalName: string; pageCount: number }; fields: Field[]; signerCount: number; annotations: Annotation[]; }

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
  const [annotations,    setAnnotations]    = useState<Annotation[]>([]);
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
        // Pre-load template annotations
        const preAnnotations: Annotation[] = (t.annotations || []).map((a: Annotation) => ({
          ...a,
          id: Math.random().toString(36).slice(2),
        }));
        setAnnotations(preAnnotations);
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
  const handleSaveTemplate = async (name: string) => {
    if (!document) { toast.error("No document selected"); return; }
    setSavingTemplate(true);
    const fieldPayload = fields.map((f) => ({ signerSlot: f.signerId, type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, required: f.required }));
    const annotationPayload = annotations.map((a) => ({ ...a }));
    try {
      if (mode === "edit" && template?._id) {
        await api.updateTemplate(template._id, {
          name:        name.trim(),
          signerCount: signers.length,
          fields:      fieldPayload,
          annotations: annotationPayload,
        });
        toast.success("Template updated!", { description: name });
      } else {
        await api.createTemplate({
          documentId:  document._id,
          name:        name.trim(),
          signerCount: signers.length,
          fields:      fieldPayload,
          annotations: annotationPayload,
        });
        toast.success("Template saved!", { description: name });
      }
      if (isTemplateMode) router.push("/templates");
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
      // Step 1: For manually-entered signers (no contactId), upsert the contact FIRST
      // so we can pass the real contactId into createRequest → updateContactStats fires correctly.
      const resolvedSigners = await Promise.all(
        signers.map(async (signer) => {
          if (signer.contactId || !signer.email.includes("@")) return signer;
          try {
            const data = await api.getContacts({ search: signer.email, limit: "5" });
            const existing = (data.contacts || []).find(
              (c: { _id: string; name: string; email: string }) =>
                c.email.toLowerCase() === signer.email.toLowerCase()
            );
            if (existing) {
              // Update name if it changed
              if (signer.name && signer.name !== signer.email && existing.name !== signer.name) {
                await api.updateContact(existing._id, { name: signer.name });
              }
              return { ...signer, contactId: existing._id };
            } else {
              const created = await api.createContact({
                name:  signer.name || signer.email,
                email: signer.email,
              });
              return { ...signer, contactId: created._id };
            }
          } catch {
            return signer; // non-critical — proceed without contactId
          }
        })
      );

      // Step 2: Create each signing request with the resolved contactId
      for (const signer of resolvedSigners) {
        const signerFields = fields.filter((f) => f.signerId === signer.id);
        await api.createRequest({
          documentId:    document._id,
          title,
          message,
          signers:       [{ name: signer.name, email: signer.email }],
          fields:        signerFields.map((f) => ({ signerId: "1", type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, required: f.required })),
          signerMapping: [{ tempId: "1", index: 0 }],
          contactIds:    [signer.contactId || null],
          templateId:    template?._id || null,
          annotations:   annotations,
        });
      }

      toast.success(`${signers.length} request${signers.length > 1 ? "s" : ""} sent`);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error("Send failed", { description: err instanceof Error ? err.message : "Error" });
    } finally { setSending(false); }
  };

  const steps: Step[]  = isTemplateMode ? ["document", "fields"] : ["document", "fields", "signers"];
  const stepLabels     = isTemplateMode
    ? ["Select Document", "Place Fields"]
    : ["Select Document", "Place Fields", "Signers & Send"];

  const currentIdx     = steps.indexOf(step);

  // Step indicator (shared between layouts)
  const stepIndicator = (
    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 sm:gap-2">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
              currentIdx > i ? "bg-green-500 text-white" : step === s ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
            }`}
            style={step === s ? { color: "var(--primary-foreground)" } : {}}
          >
            {currentIdx > i ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          <span className={`hidden sm:inline ${step === s ? "font-medium" : currentIdx > i ? "text-green-600" : ""}`} style={step === s ? { color: "var(--primary)" } : currentIdx > i ? { color: "#22c55e" } : { color: "var(--muted-foreground)" }}>
            {stepLabels[i]}
          </span>
          <span className={`sm:hidden ${step === s ? "font-medium" : currentIdx > i ? "text-green-600" : ""}`} style={step === s ? { color: "var(--primary)" } : currentIdx > i ? { color: "#22c55e" } : { color: "var(--muted-foreground)" }}>
            {stepLabels[i].slice(0, 3)}
          </span>
          {i < steps.length - 1 && <span className="mx-0.5 sm:mx-1" style={{ color: "var(--border)" }}>›</span>}
        </div>
      ))}
    </div>
  );

  // Full-screen layout for field placement (nothing scrolls except the PDF)
  if (step === "fields" && document) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--background)" }}>
        <NavBar />

        {/* Pinned header bar */}
        <div className="flex-shrink-0 bg-[var(--card)] border-b border-[var(--border)] shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">

            {/* Left: back + divider + icon + title */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("document")}
              className="flex-shrink-0"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="h-5 w-px bg-[var(--border)] flex-shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
                {isTemplateMode
                  ? <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  : <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                }
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                  {isTemplateMode ? "Create Template" : "Place Signature Fields"}
                </h1>
                <p className="text-xs text-gray-400 truncate hidden sm:block">{document.originalName}</p>
              </div>
            </div>

            {/* Center: step indicator */}
            <div className="flex-shrink-0 hidden sm:block">{stepIndicator}</div>

            <div className="h-5 w-px bg-gray-200 flex-shrink-0 hidden sm:block" />

            {/* Right: fields count + primary CTA */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {(fields.length > 0 || annotations.length > 0) && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                  <FileText className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {fields.length > 0 && `${fields.length} field${fields.length !== 1 ? "s" : ""}`}
                    {fields.length > 0 && annotations.length > 0 && " · "}
                    {annotations.length > 0 && `${annotations.length} text box${annotations.length !== 1 ? "es" : ""}`}
                  </span>
                  <span className="sm:hidden">{fields.length + annotations.length}</span>
                </span>
              )}
              <Button
                className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg px-3 sm:px-6 gap-1 sm:gap-2 cursor-pointer transition-all duration-200 text-xs sm:text-sm"
                onClick={isTemplateMode
                  ? () => { if (!tmplName.trim()) { toast.error("Template name is required"); return; } handleSaveTemplate(tmplName); }
                  : () => setStep("signers")
                }
                disabled={isTemplateMode && savingTemplate}
              >
                {isTemplateMode ? (savingTemplate ? "Saving..." : "Save") : "Next"}
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </div>

          </div>
        </div>

        {/* Template name banner */}
        {isTemplateMode && (
          <div className="flex-shrink-0 px-6 pt-3 max-w-7xl mx-auto w-full">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
              <Layers className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-900">Template Mode — place fields then save.</p>
              </div>
              <Input
                className="w-48 text-sm"
                placeholder="Template name *"
                value={tmplName}
                onChange={(e) => setTmplName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* FieldPlacer — fills all remaining height; only the PDF inside scrolls */}
        <div className="flex-1 min-h-0 px-6 py-4 max-w-7xl mx-auto w-full">
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
            onNext={isTemplateMode ? () => {
                if (!tmplName.trim()) { toast.error("Template name is required"); return; }
                handleSaveTemplate(tmplName);
              } : () => setStep("signers")}
            onBack={() => setStep("document")}
            nextLabel={isTemplateMode ? (savingTemplate ? "Saving..." : "Save Template") : "Next Step"}
            onSaveTemplate={!isTemplateMode ? handleSaveTemplate : undefined}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
          />
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            {isTemplateMode ? (
              <><Layers className="h-5 w-5 inline mr-2 text-indigo-600" /><span className="hidden sm:inline">Create Template</span><span className="sm:hidden">Template</span></>
            ) : <span className="hidden sm:inline">Send Document for Signature</span>}
          </h1>
          {!isTemplateMode && (
            <p className="text-sm sm:hidden text-gray-500">Send Document</p>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-4 sm:mb-6 overflow-x-auto">{stepIndicator}</div>

      {/* Step 1: Document */}
      {step === "document" && (
        <DocumentPicker selectedId={document?._id} onSelect={handleDocumentSelect} />
      )}

      {/* Step 3: Signers & Send */}
      {step === "signers" && (
        <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
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


          <div>
            <Label className="mb-2 block">Signers</Label>
            <ContactSearchInput signers={signers} onChange={setSigners} allowManual />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("fields")}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-2" /> <span className="sm:hidden">Fields</span><span className="hidden sm:inline">Back to Fields</span>
            </Button>
            <Button
              className="flex-1 bg-[var(--primary)] hover:opacity-90"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending..." : (
                <><Send className="h-4 w-4 mr-2" /><span className="sm:hidden">Send</span><span className="hidden sm:inline">Send for Signature</span></>
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
