"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  MousePointer,
  Layers,
  Copy,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const FIELD_TYPES = [
  { type: "signature", label: "Signature",  icon: PenTool,     color: "border-blue-500 bg-blue-50" },
  { type: "initials",  label: "Initials",   icon: PenTool,     color: "border-purple-500 bg-purple-50" },
  { type: "date",      label: "Date",       icon: Calendar,    color: "border-green-500 bg-green-50" },
  { type: "text",      label: "Text",       icon: Type,        color: "border-yellow-500 bg-yellow-50" },
  { type: "checkbox",  label: "Checkbox",   icon: CheckSquare, color: "border-red-500 bg-red-50" },
];

export const SIGNER_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
];

export interface Field {
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

export interface Signer {
  id: string;
  name: string;
  email: string;
  contactId?: string | null;
}

interface Props {
  pdfPages: HTMLCanvasElement[];
  fields: Field[];
  signers: Signer[];
  selectedTool: string | null;
  selectedSignerId: string;
  loadingPdf: boolean;
  onFieldsChange: (fields: Field[]) => void;
  onToolChange: (tool: string | null) => void;
  onSignerChange: (signerId: string) => void;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
  onSaveTemplate?: (name: string) => Promise<void>;
}

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  signature: { w: 0.25, h: 0.07 },
  initials:  { w: 0.12, h: 0.06 },
  date:      { w: 0.18, h: 0.05 },
  text:      { w: 0.20, h: 0.05 },
  checkbox:  { w: 0.04, h: 0.04 },
};

// 8-directional resize handles — corners + edge midpoints
const RESIZE_HANDLES: Array<{
  id: string;
  edges: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  cursor: string;
  style: React.CSSProperties;
}> = [
  { id: "tl", edges: { top: true,  right: false, bottom: false, left: true  }, cursor: "nw-resize", style: { top: -4,  left: -4 } },
  { id: "tc", edges: { top: true,  right: false, bottom: false, left: false }, cursor: "n-resize",  style: { top: -4,  left: "calc(50% - 3px)" } },
  { id: "tr", edges: { top: true,  right: true,  bottom: false, left: false }, cursor: "ne-resize", style: { top: -4,  right: -4 } },
  { id: "mr", edges: { top: false, right: true,  bottom: false, left: false }, cursor: "e-resize",  style: { top: "calc(50% - 3px)", right: -4 } },
  { id: "br", edges: { top: false, right: true,  bottom: true,  left: false }, cursor: "se-resize", style: { bottom: -4, right: -4 } },
  { id: "bc", edges: { top: false, right: false, bottom: true,  left: false }, cursor: "s-resize",  style: { bottom: -4, left: "calc(50% - 3px)" } },
  { id: "bl", edges: { top: false, right: false, bottom: true,  left: true  }, cursor: "sw-resize", style: { bottom: -4, left: -4 } },
  { id: "ml", edges: { top: false, right: false, bottom: false, left: true  }, cursor: "w-resize",  style: { top: "calc(50% - 3px)", left: -4 } },
];

type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

export default function FieldPlacer({
  pdfPages,
  fields,
  signers,
  selectedTool,
  selectedSignerId,
  loadingPdf,
  onFieldsChange,
  onToolChange,
  onSignerChange,
  onNext,
  onBack,
  nextLabel = "Next Step",
  onSaveTemplate,
}: Props) {
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);

  // ── Resize drag state ────────────────────────────────────────────────
  const resizingRef = useRef<{
    fieldId: string;
    startMouseX: number;
    startMouseY: number;
    startFieldX: number;
    startFieldY: number;
    startFieldW: number;
    startFieldH: number;
    containerRect: DOMRect;
    edges: Edges;
  } | null>(null);

  // ── Move drag state ──────────────────────────────────────────────────
  const movingRef = useRef<{
    fieldId: string;
    startMouseX: number;
    startMouseY: number;
    startFieldX: number;
    startFieldY: number;
    fieldWidth: number;
    fieldHeight: number;
    containerRect: DOMRect;
  } | null>(null);

  // Tracks whether a drag moved (suppresses phantom click-to-place after drag)
  const dragHappenedRef = useRef(false);

  const fieldsRef = useRef(fields);
  const onFieldsChangeRef = useRef(onFieldsChange);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { onFieldsChangeRef.current = onFieldsChange; }, [onFieldsChange]);

  // ── Template-save UI state ───────────────────────────────────────────
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [tmplName,         setTmplName]         = useState("");
  const [savingTmpl,       setSavingTmpl]       = useState(false);

  // ── PDF zoom (affects only the PDF column, not the sidebar) ──────────
  const [zoom, setZoom] = useState(1.0);
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN  = 0.5;
  const ZOOM_MAX  = 2.5;
  const zoomIn    = () => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut   = () => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2))));
  const zoomReset = () => setZoom(1.0);

  // ── Global mouse handlers ────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Resize takes priority over move
      const r = resizingRef.current;
      if (r) {
        const { fieldId, startMouseX, startMouseY, startFieldX, startFieldY, startFieldW, startFieldH, containerRect, edges } = r;
        const dx = (e.clientX - startMouseX) / containerRect.width;
        const dy = (e.clientY - startMouseY) / containerRect.height;

        let x = startFieldX, y = startFieldY, w = startFieldW, h = startFieldH;

        if (edges.right) {
          w = Math.max(0.04, Math.min(startFieldW + dx, 1 - startFieldX));
        }
        if (edges.bottom) {
          h = Math.max(0.03, Math.min(startFieldH + dy, 1 - startFieldY));
        }
        if (edges.left) {
          const cDx = Math.max(-startFieldX, Math.min(dx, startFieldW - 0.04));
          x = startFieldX + cDx;
          w = startFieldW - cDx;
        }
        if (edges.top) {
          const cDy = Math.max(-startFieldY, Math.min(dy, startFieldH - 0.03));
          y = startFieldY + cDy;
          h = startFieldH - cDy;
        }

        onFieldsChangeRef.current(
          fieldsRef.current.map(f => f.id === fieldId ? { ...f, x, y, width: w, height: h } : f)
        );
        return;
      }

      // Move
      const m = movingRef.current;
      if (!m) return;
      dragHappenedRef.current = true;
      const { fieldId, startMouseX, startMouseY, startFieldX, startFieldY, fieldWidth, fieldHeight, containerRect } = m;
      const dx = (e.clientX - startMouseX) / containerRect.width;
      const dy = (e.clientY - startMouseY) / containerRect.height;
      const newX = Math.max(0, Math.min(startFieldX + dx, 1 - fieldWidth));
      const newY = Math.max(0, Math.min(startFieldY + dy, 1 - fieldHeight));
      onFieldsChangeRef.current(
        fieldsRef.current.map(f => f.id === fieldId ? { ...f, x: newX, y: newY } : f)
      );
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      movingRef.current = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",  onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",  onMouseUp);
    };
  }, []);

  // ── Callbacks ────────────────────────────────────────────────────────
  const startResize = useCallback((
    e: React.MouseEvent,
    field: Field,
    containerEl: HTMLDivElement,
    edges: Edges,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = {
      fieldId:     field.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startFieldX: field.x,
      startFieldY: field.y,
      startFieldW: field.width,
      startFieldH: field.height,
      containerRect: containerEl.getBoundingClientRect(),
      edges,
    };
  }, []);

  const startMove = useCallback((e: React.MouseEvent, field: Field, containerEl: HTMLDivElement) => {
    e.stopPropagation();
    e.preventDefault();
    dragHappenedRef.current = false;
    movingRef.current = {
      fieldId:     field.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startFieldX: field.x,
      startFieldY: field.y,
      fieldWidth:  field.width,
      fieldHeight: field.height,
      containerRect: containerEl.getBoundingClientRect(),
    };
  }, []);

  const handlePdfClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (dragHappenedRef.current) { dragHappenedRef.current = false; return; }
      if (!selectedTool) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x    = (e.clientX - rect.left)  / rect.width;
      const y    = (e.clientY - rect.top)   / rect.height;
      const size = DEFAULT_SIZES[selectedTool] || { w: 0.2, h: 0.06 };
      const newField: Field = {
        id:       Date.now().toString(),
        signerId: selectedSignerId,
        type:     selectedTool,
        page:     pageIndex,
        x:        Math.max(0, Math.min(x - size.w / 2, 1 - size.w)),
        y:        Math.max(0, Math.min(y - size.h / 2, 1 - size.h)),
        width:    size.w,
        height:   size.h,
        required: true,
      };
      onFieldsChange([...fields, newField]);
    },
    [selectedTool, selectedSignerId, fields, onFieldsChange]
  );

  const removeField = (id: string) =>
    onFieldsChange(fields.filter((f) => f.id !== id));

  const duplicateField = (field: Field) => {
    const newField: Field = {
      ...field,
      id: Date.now().toString(),
      x:  Math.min(field.x + 0.02, 1 - field.width),
      y:  Math.min(field.y + field.height + 0.01, 1 - field.height),
    };
    onFieldsChange([...fields, newField]);
  };

  const toggleRequired = (id: string) =>
    onFieldsChange(fields.map((f) => f.id === id ? { ...f, required: !f.required } : f));

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 h-full">
      {/* ── Sidebar ── */}
      <div className="w-60 flex-shrink-0 h-full bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
        {/* Inner scroll wrapper — styled scrollbar */}
        <div className="flex flex-col flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_theme(colors.gray.100)]">

          {/* ── Save as Template — top of panel, most visible ── */}
          {onSaveTemplate && (
            <div className="p-4 border-b border-gray-100">
              {!showSaveTemplate ? (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 hover:border-indigo-400 hover:from-indigo-100 hover:to-purple-100 transition-all cursor-pointer group"
                >
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Layers className="h-4 w-4 text-white" />
                  </span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-indigo-800">Save as Template</p>
                    <p className="text-[10px] text-indigo-500 mt-0.5">Reuse this layout later</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Layers className="h-3.5 w-3.5 text-white" />
                    </span>
                    <p className="text-sm font-semibold text-gray-800">Save as Template</p>
                  </div>
                  <Input
                    className="w-full text-sm"
                    placeholder="Template name *"
                    value={tmplName}
                    onChange={(e) => setTmplName(e.target.value)}
                  />
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm cursor-pointer"
                    disabled={savingTmpl || !tmplName.trim()}
                    onClick={async () => {
                      setSavingTmpl(true);
                      try {
                        await onSaveTemplate(tmplName.trim());
                        setShowSaveTemplate(false);
                        setTmplName("");
                      } finally { setSavingTmpl(false); }
                    }}
                  >
                    {savingTmpl ? "Saving..." : "Save Template"}
                  </Button>
                  <button
                    className="w-full text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={() => { setShowSaveTemplate(false); setTmplName(""); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Signer selector — only shown for multi-signer requests ── */}
          {signers.length > 1 && <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Assign To</p>
            <div className="space-y-1">
              {signers.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => onSignerChange(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedSignerId === s.id ? "shadow-sm" : "hover:bg-gray-50"
                  }`}
                  style={
                    selectedSignerId === s.id
                      ? { backgroundColor: SIGNER_COLORS[i] + "18", borderLeft: `3px solid ${SIGNER_COLORS[i]}`, paddingLeft: "9px" }
                      : { borderLeft: "3px solid transparent", paddingLeft: "9px" }
                  }
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SIGNER_COLORS[i] }} />
                  <span className="flex-1 truncate text-gray-800">
                    Signer {i + 1}
                    {s.name && <span className="text-gray-400 font-normal ml-1">· {s.name}</span>}
                  </span>
                  {selectedSignerId === s.id && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: SIGNER_COLORS[i] }} />
                  )}
                </button>
              ))}
            </div>
          </div>}

          {/* ── Field type tools ── */}
          <div className="p-4 border-b border-gray-100">
            {/* Always-visible instruction — adapts when a tool is active */}
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4 border transition-colors duration-200 ${
              selectedTool
                ? "bg-indigo-600 border-indigo-700"
                : "bg-gray-50 border-gray-200"
            }`}>
              <MousePointer className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${selectedTool ? "text-white/80" : "text-gray-400"}`} />
              <p className={`text-xs leading-relaxed ${selectedTool ? "text-white" : "text-gray-500"}`}>
                {selectedTool
                  ? <><span className="font-semibold">Click the PDF</span> to place a <span className="font-bold underline underline-offset-2">{selectedTool}</span> field</>
                  : <>Select a field type below, then <span className="font-medium text-gray-700">click the PDF</span> to place it</>
                }
              </p>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Field Type</p>
            <div className="space-y-1">
              {FIELD_TYPES.map((ft) => {
                const Icon = ft.icon;
                const active = selectedTool === ft.type;
                return (
                  <button
                    key={ft.type}
                    onClick={() => onToolChange(selectedTool === ft.type ? null : ft.type)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? "bg-white/20" : "bg-gray-100"
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : "text-gray-500"}`} />
                    </span>
                    {ft.label}
                    {active && <span className="ml-auto text-white/70 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-4" />

        </div>

        {/* Bottom fade — tells the user there is more content to scroll */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-1.5 h-10 bg-gradient-to-t from-white via-white/80 to-transparent z-10 rounded-b-xl" />
      </div>

      {/* ── PDF Viewer ── */}
      <div className="flex-1 overflow-auto h-full relative">
        {loadingPdf ? (
          <div className="text-center py-16 text-gray-400">Rendering PDF…</div>
        ) : (
          <>
          <div
            ref={pdfContainerRef}
            className="space-y-4 mx-auto"
            style={{ width: `${zoom * 100}%` }}
          >
            {pdfPages.map((canvas, pageIndex) => (
              <div
                key={pageIndex}
                ref={(el) => { pageEls.current[pageIndex] = el; }}
                className="relative bg-white shadow-sm inline-block w-full"
                style={{ cursor: selectedTool ? "crosshair" : "default" }}
                onClick={(e) => handlePdfClick(e, pageIndex)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={canvas.toDataURL()}
                  alt={`Page ${pageIndex + 1}`}
                  className="block w-full"
                  draggable={false}
                />

                {/* ── Placed fields ── */}
                {fields
                  .filter((f) => f.page === pageIndex)
                  .map((field) => {
                    const signerIndex = signers.findIndex((s) => s.id === field.signerId);
                    const color = SIGNER_COLORS[signerIndex] || "#3B82F6";
                    const ft    = FIELD_TYPES.find((t) => t.type === field.type);
                    const Icon  = ft?.icon || PenTool;

                    return (
                      <div
                        key={field.id}
                        className="absolute border-2 flex items-center justify-center text-xs font-medium select-none"
                        style={{
                          left:            `${field.x * 100}%`,
                          top:             `${field.y * 100}%`,
                          width:           `${field.width * 100}%`,
                          height:          `${field.height * 100}%`,
                          borderColor:     color,
                          backgroundColor: color + "20",
                          color,
                          cursor: "grab",
                        }}
                        onMouseDown={(e) => {
                          const el = pageEls.current[pageIndex];
                          if (el) startMove(e, field, el);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Field label */}
                        <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{field.type}</span>

                        {/* ── Floating action toolbar ─────────────────────────
                            Positioned ABOVE the field (top: -24px) so it never
                            overlaps with any of the 8 resize handles (at ±4px).
                        ── */}
                        <div
                          className="absolute flex items-center gap-0.5"
                          style={{ top: -24, right: 0 }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => duplicateField(field)}
                            className="w-5 h-5 rounded flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: color }}
                            title="Duplicate field (same size)"
                            aria-label="Duplicate field"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => removeField(field.id)}
                            className="w-5 h-5 rounded flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity font-bold text-sm leading-none"
                            style={{ backgroundColor: color }}
                            title="Remove field"
                            aria-label="Remove field"
                          >
                            ×
                          </button>
                        </div>

                        {/* ── Required / Optional badge — bottom-left, inside field ── */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); toggleRequired(field.id); }}
                          className="absolute bottom-0.5 left-1 flex items-center gap-0.5 rounded px-1 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: field.required ? "#FEE2E2" : "#D1FAE5",
                          }}
                          title={
                            field.required
                              ? "Required — click to make Optional"
                              : "Optional — click to make Required"
                          }
                        >
                          <span
                            className="text-[8px] font-extrabold leading-none"
                            style={{ color: field.required ? "#DC2626" : "#059669" }}
                          >
                            {field.required ? "✱ REQ" : "✓ OPT"}
                          </span>
                        </button>

                        {/* ── 8-direction resize handles ── */}
                        {RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            className="absolute w-2 h-2 rounded-sm border border-gray-400 bg-white z-10"
                            style={{ ...h.style, cursor: h.cursor }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const el = pageEls.current[pageIndex];
                              if (el) startResize(e, field, el, h.edges);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>

          {/* ── Zoom controls — sticky floating pill at bottom of PDF column ── */}
          <div className="sticky bottom-4 z-20 flex justify-center mt-4 pointer-events-none">
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg px-2 py-1.5 pointer-events-auto select-none"
                 style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              <button
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="h-[15px] w-[15px]" />
              </button>

              <span className="min-w-[46px] text-center text-[12px] font-semibold text-gray-700 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="h-[15px] w-[15px]" />
              </button>

              {zoom !== 1.0 && (
                <>
                  <div className="w-px h-4 bg-gray-200 mx-0.5" />
                  <button
                    onClick={zoomReset}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Reset zoom"
                  >
                    <Maximize2 className="h-[13px] w-[13px]" />
                  </button>
                </>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
