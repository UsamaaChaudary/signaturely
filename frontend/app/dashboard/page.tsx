"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { api, getCompletedFileUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Bell,
  Link2,
} from "lucide-react";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
};

interface Signer {
  _id: string;
  name: string;
  email: string;
  status: string;
  signingToken?: string;
}

interface RequestField {
  signerId: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface Request {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  completedFilePath?: string;
  documentId?: { originalName: string; filePath?: string; pageCount?: number };
  signers?: Signer[];
  fields?: RequestField[];
}

// One display row = one signer within a request
interface SignerRow {
  req: Request;
  signer: Signer;
}

const signerStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Signed",   color: "bg-green-100 text-green-700",  icon: CheckCircle },
  declined:  { label: "Declined", color: "bg-red-100 text-red-600",      icon: XCircle },
  viewed:    { label: "Viewed",   color: "bg-blue-100 text-blue-700",    icon: Eye },
  pending:   { label: "Pending",  color: "bg-amber-100 text-amber-700",  icon: Clock },
};

export default function Dashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReq, setPreviewReq] = useState<Request | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRequests();
  }, [router]);

  const loadRequests = async () => {
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      if (message === "Invalid token") {
        router.push("/login");
      } else {
        toast.error("Failed to load requests", { description: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async (reqId: string) => {
    try {
      const res = await api.remindRequest(reqId);
      toast.success("Reminder sent", { description: res.message });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reminder";
      toast.error("Error", { description: message });
    }
  };

  const copySignerLink = (req: Request, signer: Signer) => {
    if (req.status === "completed" && req.completedFilePath) {
      navigator.clipboard.writeText(getCompletedFileUrl(req.completedFilePath)).then(() => {
        toast.success("Document link copied");
      });
      return;
    }
    if (signer.signingToken) {
      const url = `${window.location.origin}/sign/${signer.signingToken}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Signing link copied", { description: `Link for ${signer.name}` });
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this signing request?")) return;
    try {
      await api.cancelRequest(id);
      toast.success("Request cancelled");
      loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error("Error", { description: message });
    }
  };

  // Flatten requests → one row per signer
  const rows: SignerRow[] = requests.flatMap((req) =>
    (req.signers ?? []).map((signer) => ({ req, signer }))
  );

  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.signer.status === "pending" || r.signer.status === "viewed").length,
    completed: rows.filter((r) => r.signer.status === "completed").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Dashboard</h1>
          <Link
            href="/send"
            className={buttonVariants({ className: "bg-[var(--primary)] hover:opacity-90 w-full sm:w-auto text-sm py-1.5 sm:py-2" })}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="sm:hidden">Send</span>
            <span className="hidden sm:inline">Send Document</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <Card>
            <CardContent className="pt-3 sm:pt-4 md:pt-6">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Total Recipients</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 md:pt-6">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Awaiting Signature</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 md:pt-6">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Signed</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Signing Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--muted)" }} />
                <p style={{ color: "var(--muted-foreground)" }}>No signing requests yet.</p>
                <Link
                  href="/send"
                  className={buttonVariants({ className: "mt-4 bg-[var(--primary)] hover:opacity-90" })}
                >
                  Send your first document
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(({ req, signer }) => {
                  const cfg = signerStatusConfig[signer.status] ?? signerStatusConfig.pending;
                  const Icon = cfg.icon;
                  const isPending = signer.status === "pending" || signer.status === "viewed";
                  const avatarColor =
                    signer.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : signer.status === "declined"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-700";

                  return (
                    <div
                      key={`${req._id}-${signer._id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/requests/${req._id}`)}
                    >
                      {/* Left: avatar + info */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:w-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${avatarColor}`}>
                          {(signer.name || signer.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">{signer.name}</div>
                          <div className="text-xs text-gray-400 truncate">{signer.email}</div>
                          <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                            {req.title} &bull; {req.documentId?.originalName} &bull;{" "}
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Right: status + actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-4" onClick={(e) => e.stopPropagation()}>
                        <span className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium ${cfg.color}`}>
                          <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="hidden sm:inline">{cfg.label}</span>
                        </span>

                        {/* Preview */}
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer"
                            onClick={() => setPreviewReq(req)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-md z-50">
                            Preview document
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>

                        {/* Copy link */}
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer"
                            onClick={() => copySignerLink(req, signer)}
                          >
                            <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-md z-50">
                            {req.status === "completed" ? "Copy document link" : "Copy signing link"}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>

                        {req.status === "completed" && (
                          req.completedFilePath ? (
                            <a
                              href={getCompletedFileUrl(req.completedFilePath)}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                              title="Download signed PDF"
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </a>
                          ) : req.documentId?.filePath ? (
                            <a
                              href={req.documentId.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                              title="View original document"
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            </a>
                          ) : null
                        )}

                        {isPending && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              title="Send reminder"
                              onClick={() => handleRemind(req._id)}
                            >
                              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-red-400 hover:text-red-600"
                              title="Cancel request"
                              onClick={() => handleCancel(req._id)}
                            >
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* PDF Preview Modal */}
      {previewReq && (() => {
        const filePath = previewReq.status === "completed" && previewReq.completedFilePath
          ? previewReq.completedFilePath
          : previewReq.documentId?.filePath;
        if (!filePath) return null;

        // Don't show placeholder field overlays when the document is completed —
        // the signed PDF already has signatures baked in.
        const previewFields = previewReq.status === "completed"
          ? []
          : (previewReq.fields ?? []).map((f) => {
              const signerIdx = previewReq.signers?.findIndex((s) => s._id === f.signerId) ?? 0;
              return {
                type: f.type,
                page: f.page,
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
                required: f.required,
                signerSlot: String(signerIdx + 1),
              };
            });

        return (
          <PdfPreviewModal
            fileName={previewReq.title}
            filePath={filePath}
            pageCount={previewReq.documentId?.pageCount ?? 1}
            onClose={() => setPreviewReq(null)}
            previewFields={previewFields}
          />
        );
      })()}
    </div>
  );
}
