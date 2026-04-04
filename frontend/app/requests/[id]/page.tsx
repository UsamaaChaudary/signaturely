"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { api, getCompletedFileUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Bell,
  X,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
  Link2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const signerStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  viewed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const requestStatusColors: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed:   "bg-green-100 text-green-800",
  cancelled:   "bg-gray-100 text-gray-800",
  declined:    "bg-red-100 text-red-800",
};

interface SignerRecord {
  _id: string;
  name: string;
  email: string;
  status: string;
  signingToken?: string;
  signedAt?: string;
  viewedAt?: string;
  ipAddress?: string;
}

interface FieldRecord {
  _id: string;
  type: string;
  page: number;
  signerId: string;
  value?: string;
  required: boolean;
}

interface RequestDetail {
  _id: string;
  title: string;
  status: string;
  message?: string;
  createdAt: string;
  completedFilePath?: string;
  documentId?: { originalName: string };
  signers: SignerRecord[];
  fields: FieldRecord[];
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequest = async () => {
    try {
      const data = await api.getRequest(id);
      setRequest(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async () => {
    try {
      const res = await api.remindRequest(id);
      toast.success("Reminders sent", { description: res.message });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reminder";
      toast.error("Error", { description: message });
    }
  };

  const copySigningLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Signing link copied", { description: "Share this link with the signer" });
    });
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this signing request?")) return;
    try {
      await api.cancelRequest(id);
      toast.success("Request cancelled");
      loadRequest();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error("Error", { description: message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="text-center py-16 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="text-center py-16 text-gray-500">Request not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-3 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-1 order-first sm:order-none">
            {request.title}
          </h1>
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium capitalize self-start sm:self-center ${
              requestStatusColors[request.status] ||
              "bg-gray-100 text-gray-800"
            }`}
          >
            {request.status.replace("_", " ")}
          </span>
        </div>

        {/* Declined alert banner */}
        {request.status === "declined" && (() => {
          const declinedSigners = request.signers.filter((s) => s.status === "declined");
          return (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">
                  Document declined — this request can no longer be completed
                </p>
                {declinedSigners.length > 0 && (
                  <p className="text-sm text-red-600 mt-0.5">
                    Declined by: {declinedSigners.map((s) => s.name || s.email).join(", ")}
                  </p>
                )}
                <p className="text-xs text-red-500 mt-1">
                  To proceed, create a new signing request with the same document.
                </p>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Signers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Signers ({request.signers.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.signers.map((signer) => {
                  const statusConfig = {
                    completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700" },
                    declined:  { icon: XCircle,     color: "text-red-500",   bg: "bg-red-50 border-red-200",     badge: "bg-red-100 text-red-700" },
                    viewed:    { icon: Eye,          color: "text-blue-500",  bg: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-700" },
                    pending:   { icon: Clock,        color: "text-gray-400",  bg: "bg-white border-gray-200",     badge: "bg-gray-100 text-gray-600" },
                  };
                  const cfg = statusConfig[signer.status as keyof typeof statusConfig] ?? statusConfig.pending;
                  const Icon = cfg.icon;

                  const initials = signer.name
                    ? signer.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                    : signer.email[0].toUpperCase();

                  const timestamp = signer.signedAt
                    ? `Signed ${new Date(signer.signedAt).toLocaleDateString()} at ${new Date(signer.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : signer.viewedAt
                    ? `Viewed ${new Date(signer.viewedAt).toLocaleDateString()} at ${new Date(signer.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : null;

                  return (
                    <div
                      key={signer._id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${cfg.bg}`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        signer.status === "completed" ? "bg-green-100 text-green-700"
                        : signer.status === "declined" ? "bg-red-100 text-red-700"
                        : signer.status === "viewed"   ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                      }`}>
                        {initials}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{signer.name}</p>
                        <p className="text-sm text-gray-500 truncate">{signer.email}</p>
                        {timestamp && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                            {timestamp}
                          </p>
                        )}
                      </div>

                      {/* Status badge + copy link */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${cfg.badge}`}>
                          {signer.status}
                        </span>
                        {signer.signingToken && signer.status !== "completed" && signer.status !== "declined" && (
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copySigningLink(signer.signingToken!)}
                              className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-md z-50">
                              Copy signing link
                              <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Fields summary */}
            <Card>
              <CardHeader>
                <CardTitle>Fields ({request.fields.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.fields.map((field) => {
                    const signer = request.signers.find(
                      (s) => s._id === field.signerId
                    );
                    return (
                      <div
                        key={field._id}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100"
                      >
                        <span className="text-gray-600 capitalize">
                          {field.type} field (page {field.page + 1})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">
                            {signer?.name || "Unknown"}
                          </span>
                          {field.value ? (
                            <span className="text-green-500 text-xs">
                              Filled
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.status === "completed" &&
                  request.completedFilePath && (
                    <>
                      <a
                        href={getCompletedFileUrl(request.completedFilePath)}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({
                          variant: "outline",
                          className: "w-full",
                        })}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Signed PDF
                      </a>
                      <a
                        href={getCompletedFileUrl(request.completedFilePath)}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({
                          className: "w-full bg-green-600 hover:bg-green-700",
                        })}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Signed PDF
                      </a>
                    </>
                  )}
                {(request.status === "pending" ||
                  request.status === "in_progress") && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleRemind}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:text-red-600"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Request
                    </Button>
                  </>
                )}
                {request.status === "cancelled" && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    This request has been cancelled.
                  </p>
                )}
                {request.status === "declined" && (
                  <p className="text-sm text-red-500 text-center py-2">
                    This request was declined by a signer.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-600">
                <div className="truncate">
                  <span className="font-medium">Document:</span>{" "}
                  {request.documentId?.originalName}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
                {request.message && (
                  <div className="hidden sm:block">
                    <span className="font-medium">Message:</span>{" "}
                    {request.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
