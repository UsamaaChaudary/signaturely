"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, X, ExternalLink, ZoomIn, ZoomOut, Edit2 } from "lucide-react";

// NOTE: Download button is temporarily disabled.
// See CLAUDE.md (frontend) > Known Issues for the fix plan.
// import { Download } from "lucide-react";

const SIGNER_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
];

/**
 * A field as stored in a saved template (from the backend).
 * Coordinates are normalised 0–1 relative to page width/height.
 */
export interface PreviewField {
  type: string;
  page: number;      // 0-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  signerSlot?: string; // "1", "2", … maps to signer color index
}

export interface PreviewAnnotation {
  id?: string;
  type: "text";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontSizeRatio?: number;
  bold: boolean;
  color: string;
}

interface Props {
  fileName: string;
  filePath: string;
  pageCount: number;
  onClose: () => void;
  /** When provided, shows an "Edit Fields" button (used in the Templates tab). */
  editHref?: string;
  /**
   * When provided, field overlays are rendered on top of each page so users
   * can see the placed fields without entering the editor.
   */
  previewFields?: PreviewField[];
  /** When provided, owner text annotations are rendered as read-only overlays. */
  previewAnnotations?: PreviewAnnotation[];
}

/**
 * Converts a Cloudinary URL to use fl_inline so the browser renders it
 * instead of triggering a forced download (Content-Disposition: attachment).
 * NOTE: fl_inline is a transformation flag unsupported on resource_type:raw —
 * applying it returns HTTP 400. Raw PDFs are returned as-is.
 */
function toInlineUrl(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  if (url.includes("/raw/upload/")) return url;
  return url.replace(/\/upload\/(?!fl_inline)/, "/upload/fl_inline/");
}

export default function PdfPreviewModal({
  fileName,
  filePath,
  pageCount,
  onClose,
  editHref,
  previewFields,
  previewAnnotations,
}: Props) {
  const [pages,   setPages]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [zoom,    setZoom]    = useState(100);

  // Measure the rendered page width so annotation fontSizeRatio can be
  // converted back to px proportionally, matching the sign-page rendering.
  const firstPageRef   = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = firstPageRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, [pages]);

  // Render PDF pages via pdfjs-dist (avoids iframe/download issues)
  useEffect(() => {
    let cancelled = false;
    async function render() {
      setLoading(true);
      setError(false);
      setPages([]);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument(filePath).promise;
        const dataUrls: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page     = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas   = document.createElement("canvas");
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
          dataUrls.push(canvas.toDataURL());
        }
        if (!cancelled) setPages(dataUrls);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [filePath]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const zoomIn  = () => setZoom((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const reset   = () => setZoom(100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-2 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-4xl flex flex-col overflow-hidden h-[85vh] sm:h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-xs sm:text-sm">{fileName}</p>
              <p className="text-[10px] sm:text-xs text-gray-400">
                {pageCount} page{pageCount !== 1 ? "s" : ""}
                {previewFields && previewFields.length > 0 && (
                  <span className="ml-1 sm:ml-2 text-indigo-500">· {previewFields.length} field{previewFields.length !== 1 ? "s" : ""}</span>
                )}
                {previewAnnotations && previewAnnotations.length > 0 && (
                  <span className="ml-1 sm:ml-2 text-amber-500">· {previewAnnotations.length} text box{previewAnnotations.length !== 1 ? "es" : ""}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5">
              <button onClick={zoomOut} disabled={zoom <= 25} title="Zoom out"
                className="p-1 rounded sm:rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40 cursor-pointer transition-colors">
                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button onClick={reset} title="Reset zoom"
                className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono font-semibold rounded-lg hover:bg-gray-100 text-gray-700 min-w-[36px] sm:min-w-[52px] text-center cursor-pointer transition-colors">
                {zoom}%
              </button>
              <button onClick={zoomIn} disabled={zoom >= 300} title="Zoom in"
                className="p-1 rounded sm:rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40 cursor-pointer transition-colors">
                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>

            <div className="w-px h-4 sm:h-5 bg-gray-200 mx-1 sm:mx-2" />

            {/* Open in new tab — fl_inline overrides Content-Disposition: attachment */}
            <a href={toInlineUrl(filePath)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium px-1.5 sm:px-3 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Open</span>
            </a>

            <button onClick={onClose} aria-label="Close preview"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer ml-1 transition-colors">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/*
          DOWNLOAD BUTTON — temporarily disabled.
          See CLAUDE.md (frontend) > Known Issues for fix options.
        */}

        {/* ── PDF pages + field overlays ─────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 sm:gap-3 text-gray-400">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm">Rendering PDF…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 sm:gap-4 text-gray-500">
              <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
              <p className="text-xs sm:text-sm">Could not render this PDF.</p>
              <a href={toInlineUrl(filePath)} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline text-xs sm:text-sm font-medium cursor-pointer">
                Open directly →
              </a>
            </div>
          ) : (
            <div className="py-3 sm:py-6 flex flex-col items-center gap-3 sm:gap-4" style={{ zoom: zoom / 100 }}>
              {pages.map((src, pageIndex) => {
                const pageFields       = previewFields?.filter((f) => f.page === pageIndex) ?? [];
                const pageAnnotations  = previewAnnotations?.filter((a) => a.page === pageIndex) ?? [];
                return (
                  <div
                    key={pageIndex}
                    ref={pageIndex === 0 ? firstPageRef : null}
                    className="relative shadow-lg rounded overflow-hidden bg-white"
                    style={{ width: "95vw", maxWidth: 864 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Page ${pageIndex + 1}`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                      draggable={false}
                    />

                    {/* Annotation overlays — read-only owner text */}
                    {pageAnnotations.map((annotation, ai) => (
                      <div
                        key={ai}
                        className="absolute pointer-events-none overflow-hidden"
                        style={{
                          left:   `${annotation.x * 100}%`,
                          top:    `${annotation.y * 100}%`,
                          width:  `${annotation.width * 100}%`,
                          height: `${annotation.height * 100}%`,
                        }}
                      >
                        <span
                          className="block w-full h-full p-0.5 leading-tight overflow-hidden"
                          style={{
                            fontSize:   `${annotation.fontSizeRatio && containerWidth ? annotation.fontSizeRatio * containerWidth : annotation.fontSize}px`,
                            fontWeight: annotation.bold ? "bold" : "normal",
                            color:      annotation.color || "#000000",
                          }}
                        >
                          {annotation.content}
                        </span>
                      </div>
                    ))}

                    {/* Field overlays — read-only, non-interactive */}
                    {pageFields.map((field, fi) => {
                      const slotIdx  = Math.max(0, parseInt(field.signerSlot || "1") - 1);
                      const color    = SIGNER_COLORS[slotIdx % SIGNER_COLORS.length];
                      return (
                        <div
                          key={fi}
                          className="absolute border-2 flex items-center justify-center text-xs font-medium select-none pointer-events-none"
                          style={{
                            left:            `${field.x * 100}%`,
                            top:             `${field.y * 100}%`,
                            width:           `${field.width * 100}%`,
                            height:          `${field.height * 100}%`,
                            borderColor:     color,
                            backgroundColor: color + "25",
                            color,
                          }}
                        >
                          <span className="truncate px-1">{field.type}</span>
                          {/* Required indicator */}
                          {field.required && (
                            <span
                              className="absolute bottom-0.5 left-0.5 text-[7px] font-extrabold leading-none"
                              style={{ color: "#DC2626" }}
                            >
                              ✱
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
