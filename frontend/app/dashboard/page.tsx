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
  cancelled: "bg-gray-100 text-gray-800",
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

export default function Dashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReq, setPreviewReq] = useState<Request | null>(null);
  const [signersModal, setSignersModal] = useState<Request | null>(null);

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

  const handleRemind = async (id: string) => {
    try {
      const res = await api.remindRequest(id);
      toast.success("Reminders sent", { description: res.message });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reminder";
      toast.error("Error", { description: message });
    }
  };

  const copyLink = (req: Request) => {
    // For pending/in_progress: copy the first pending signer's signing URL
    // For completed: copy the completed file URL
    if (req.status === "completed" && req.completedFilePath) {
      navigator.clipboard.writeText(getCompletedFileUrl(req.completedFilePath)).then(() => {
        toast.success("Document link copied");
      });
      return;
    }
    const pendingSigner = req.signers?.find(
      (s) => s.status !== "completed" && s.status !== "declined" && s.signingToken
    );
    if (pendingSigner?.signingToken) {
      const url = `${window.location.origin}/sign/${pendingSigner.signingToken}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Signing link copied", { description: "Share this link with the signer" });
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

  const stats = {
    total: requests.length,
    pending: requests.filter(
      (r) => r.status === "pending" || r.status === "in_progress"
    ).length,
    completed: requests.filter((r) => r.status === "completed").length,
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
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-500 mt-1">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Awaiting Signatures
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
              <div className="text-sm text-gray-500 mt-1">Completed</div>
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
            ) : requests.length === 0 ? (
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
              <div className="space-y-3">
                {requests.map((req) => {
                  const Icon = statusIcons[req.status] || Clock;
                  const completedSigners =
                    req.signers?.filter((s) => s.status === "completed")
                      .length || 0;
                  const totalSigners = req.signers?.length || 0;

                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/requests/${req._id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <Icon
                          className={`h-5 w-5 ${
                            req.status === "completed"
                              ? "text-green-600"
                              : "text-yellow-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {req.title}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{req.documentId?.originalName} &bull; {completedSigners}/{totalSigners} signed</span>
                            {req.signers && req.signers.length > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSignersModal(req); }}
                                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center -space-x-1.5">
                                  {req.signers.slice(0, 4).map((signer) => {
                                    const ringColor =
                                      signer.status === "completed"
                                        ? "ring-green-400 bg-green-50 text-green-700"
                                        : signer.status === "declined"
                                        ? "ring-red-400 bg-red-50 text-red-600"
                                        : "ring-amber-400 bg-amber-50 text-amber-700";
                                    const initial = (signer.name || signer.email)
                                      .charAt(0)
                                      .toUpperCase();
                                    return (
                                      <div
                                        key={signer._id}
                                        className={`w-[22px] h-[22px] rounded-full ring-2 ring-white outline outline-2 text-[10px] font-bold flex items-center justify-center ${ringColor}`}
                                      >
                                        {initial}
                                      </div>
                                    );
                                  })}
                                  {req.signers.length > 4 && (
                                    <div className="w-[22px] h-[22px] rounded-full ring-2 ring-white bg-gray-100 text-[9px] font-bold text-gray-500 flex items-center justify-center">
                                      +{req.signers.length - 4}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-indigo-500 font-medium hover:underline">
                                  View all
                                </span>
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            statusColors[req.status]
                          }`}
                        >
                          {req.status.replace("_", " ")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Preview document"
                          onClick={() => setPreviewReq(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Copy link — tooltip via title + group hover label */}
                        <div className="relative group">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(req)}
                            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-md z-50">
                            {req.status === "completed" ? "Copy document link" : "Copy signing link"}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                        {req.status === "completed" &&
                          req.completedFilePath && (
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
                        {(req.status === "pending" ||
                          req.status === "in_progress") && (
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

        // Map request fields → PreviewField format (signerSlot = 1-based index in signers array)
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

      {/* Signers Modal */}
      {signersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSignersModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{signersModal.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {signersModal.signers?.filter((s) => s.status === "completed").length ?? 0} of{" "}
                  {signersModal.signers?.length ?? 0} signed
                </p>
              </div>
              <button
                onClick={() => setSignersModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Signer list */}
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {signersModal.signers?.map((signer) => {
                const statusConfig = {
                  completed: { label: "Signed", cls: "bg-green-100 text-green-700" },
                  declined:  { label: "Declined", cls: "bg-red-100 text-red-600" },
                  viewed:    { label: "Viewed", cls: "bg-blue-100 text-blue-700" },
                  pending:   { label: "Pending", cls: "bg-amber-100 text-amber-700" },
                }[signer.status] ?? { label: signer.status, cls: "bg-gray-100 text-gray-600" };

                const avatarColor =
                  signer.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : signer.status === "declined"
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-700";

                return (
                  <li key={signer._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor}`}>
                      {(signer.name || signer.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{signer.name}</div>
                      <div className="text-xs text-gray-400 truncate">{signer.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusConfig.cls}`}>
                      {statusConfig.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                Click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
