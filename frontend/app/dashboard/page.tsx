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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/send"
            className={buttonVariants({ className: "bg-indigo-600 hover:bg-indigo-700" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Send Document
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500 mt-1">Total Recipients</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500 mt-1">Awaiting Signature</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500 mt-1">Signed</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signing Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No signing requests yet.</p>
                <Link
                  href="/send"
                  className={buttonVariants({ className: "mt-4 bg-indigo-600 hover:bg-indigo-700" })}
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
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/requests/${req._id}`)}
                    >
                      {/* Left: avatar + info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor}`}>
                          {(signer.name || signer.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{signer.name}</div>
                          <div className="text-xs text-gray-400 truncate">{signer.email}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {req.title} &bull; {req.documentId?.originalName} &bull;{" "}
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Right: status + actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Preview document"
                          onClick={() => setPreviewReq(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Copy link */}
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copySignerLink(req, signer)}
                            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-md z-50">
                            {req.status === "completed" ? "Copy document link" : "Copy signing link"}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>

                        {req.status === "completed" && req.completedFilePath && (
                          <a
                            href={getCompletedFileUrl(req.completedFilePath)}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            title="Download signed PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}

                        {isPending && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Send reminder"
                              onClick={() => handleRemind(req._id)}
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cancel request"
                              onClick={() => handleCancel(req._id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
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

        const previewFields = (previewReq.fields ?? []).map((f) => {
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
