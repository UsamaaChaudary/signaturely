"use client";
import { useCallback, useEffect, useRef } from "react";
import {
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  MousePointer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  signature: { w: 0.25, h: 0.07 },
  initials:  { w: 0.12, h: 0.06 },
  date:      { w: 0.18, h: 0.05 },
  text:      { w: 0.20, h: 0.05 },
  checkbox:  { w: 0.04, h: 0.04 },
};

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
  nextLabel = "Next: Add Signers",
}: Props) {
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);

  // Resize drag state — kept in a ref so event listeners don't stale-close over state
  const resizingRef = useRef<{
    fieldId: string;
    fieldX: number;
    fieldY: number;
    containerRect: DOMRect;
  } | null>(null);
  const fieldsRef = useRef(fields);
  const onFieldsChangeRef = useRef(onFieldsChange);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { onFieldsChangeRef.current = onFieldsChange; }, [onFieldsChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const { fieldId, fieldX, fieldY, containerRect } = r;
      const newW = Math.max(0.04, Math.min(
        (e.clientX - containerRect.left) / containerRect.width - fieldX,
        1 - fieldX
      ));
      const newH = Math.max(0.03, Math.min(
        (e.clientY - containerRect.top) / containerRect.height - fieldY,
        1 - fieldY
      ));
      onFieldsChangeRef.current(
        fieldsRef.current.map(f => f.id === fieldId ? { ...f, width: newW, height: newH } : f)
      );
    };
    const onMouseUp = () => { resizingRef.current = null; };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startResize = useCallback((e: React.MouseEvent, field: Field, containerEl: HTMLDivElement) => {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = {
      fieldId: field.id,
      fieldX: field.x,
      fieldY: field.y,
      containerRect: containerEl.getBoundingClientRect(),
    };
  }, []);

  const handlePdfClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (!selectedTool) return;
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const size = DEFAULT_SIZES[selectedTool] || { w: 0.2, h: 0.06 };
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
      onFieldsChange([...fields, newField]);
    },
    [selectedTool, selectedSignerId, fields, onFieldsChange]
  );

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
  };

  return (
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
              onClick={() => onSignerChange(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-medium border-2 transition-all ${
                selectedSignerId === s.id ? "border-opacity-100" : "border-transparent bg-gray-100"
              }`}
              style={
                selectedSignerId === s.id
                  ? { borderColor: SIGNER_COLORS[i], backgroundColor: SIGNER_COLORS[i] + "20" }
                  : {}
              }
            >
              <span style={{ color: SIGNER_COLORS[i] }}>&#9679;</span>{" "}
              Signer {i + 1}
              {s.name && <span className="text-gray-500 font-normal"> ({s.name})</span>}
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
                onClick={() => onToolChange(selectedTool === ft.type ? null : ft.type)}
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
          <p className="text-xs text-gray-500">{fields.length} field(s) placed</p>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={onNext}>
            {nextLabel}
          </Button>
          <Button variant="outline" className="w-full" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto">
        {loadingPdf ? (
          <div className="text-center py-16 text-gray-400">Rendering PDF...</div>
        ) : (
          <div ref={pdfContainerRef} className="space-y-4">
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
                {fields
                  .filter((f) => f.page === pageIndex)
                  .map((field) => {
                    const signerIndex = signers.findIndex((s) => s.id === field.signerId);
                    const color = SIGNER_COLORS[signerIndex] || "#3B82F6";
                    const ft = FIELD_TYPES.find((t) => t.type === field.type);
                    const Icon = ft?.icon || PenTool;
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
                          color:           color,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{field.type}</span>
                        {/* Remove button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs leading-none"
                          style={{ backgroundColor: color }}
                          aria-label="Remove field"
                        >
                          &times;
                        </button>
                        {/* Resize handle — bottom-right corner */}
                        <div
                          onMouseDown={(e) => {
                            const el = pageEls.current[pageIndex];
                            if (el) startResize(e, field, el);
                          }}
                          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
                          style={{ backgroundColor: color }}
                          title="Drag to resize"
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
